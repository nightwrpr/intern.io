const express = require('express');
const router = express.Router();
const db = require('../db'); // เชื่อมต่อกับฐานข้อมูล MySQL
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 📂 กำหนดการจัดเก็บไฟล์อัปโหลด
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads', 'uploads');
    
    // ตรวจสอบว่าโฟลเดอร์มีอยู่หรือไม่ ถ้าไม่มีก็สร้างขึ้นมา
    fs.existsSync(uploadPath) || fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath); // 📂 โฟลเดอร์ที่ใช้เก็บไฟล์
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // ตั้งชื่อไฟล์ใหม่
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // จำกัดขนาดไฟล์ 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('ประเภทไฟล์ไม่รองรับ'), false);
    }
  }
}).fields([
  { name: 'documents[resume]', maxCount: 1 },
  { name: 'documents[transcript]', maxCount: 1 },
  { name: 'documents[id_card]', maxCount: 1 },
  { name: 'documents[consent]', maxCount: 1 },
  { name: 'documents[parent_id]', maxCount: 1 },
  { name: 'documents[student_card]', maxCount: 1 },
  { name: 'documents[bank_book]', maxCount: 1 },
  { name: 'documents[passport]', maxCount: 1 }
]);
// Middleware สำหรับตรวจสอบการเข้าสู่ระบบและสิทธิ์
function checkRole(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/users/login'); // หากไม่ได้เข้าสู่ระบบ ให้กลับไปที่หน้า login
  }

  const userRole = req.session.user.role?.toLowerCase();
  if (!['admin', 'student'].includes(userRole)) {
    return res.status(403).send('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
  }

  next();
}

// Function ดึงข้อมูลนักศึกษา
async function fetchStudentData(studentId) {
  try {
    const [results] = await db.promise().query(
      `SELECT student_code, major, graduation_status, internship_status 
       FROM student WHERE student_id = ? LIMIT 1`,
      [studentId]
    );
    return results.length > 0 ? results[0] : null;
  } catch (err) {
    console.error('❌ Error fetching student data:', err);
    throw err;
  }
}

// 📌 Route: แสดงฟอร์มคำร้องฝึกงาน (admin/student)
router.get('/', checkRole, async (req, res) => {
  const user = req.session.user;
  const userId = user.id;

  if (!userId) {
    return res.status(400).send('ไม่พบข้อมูลผู้ใช้ใน session');
  }

  try {
    const [userResults] = await db.promise().query(
      'SELECT name, email, student_id FROM user WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (userResults.length === 0) {
      return res.status(404).send('ไม่พบข้อมูลผู้ใช้');
    }

    const userData = userResults[0];
    const student = await fetchStudentData(userData.student_id);
    if (!student) {
      return res.status(404).send('ไม่พบข้อมูลนักศึกษา');
    }

    const [company] = await db.promise().query('SELECT company_id, name FROM company');
    const [position_open] = await db.promise().query('SELECT position_name, position_id FROM position_open');

    res.render('reqforintern', {
      user: userData,
      student,
      company,
      position_open,
      errorMessage: req.session.errorMessage || null,
      successMessage: req.session.successMessage || null
    });

    req.session.errorMessage = null;
    req.session.successMessage = null;
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
  }
});

// 📌 Route: บันทึกคำร้องฝึกงาน และอัปโหลดไฟล์เอกสาร
router.post('/submit', checkRole, upload, async (req, res) => {
  console.log('📨 Received data:', req.body);
  console.log('📁 Uploaded files:', req.files);

  const { position_id, company_id, request_start_date, request_end_date, semester, course_opening_id } = req.body;
  const documents = req.files; // get uploaded files from req.files

  // ตรวจสอบว่ามีข้อมูลครบถ้วนหรือไม่
  if (!position_id || !company_id || !request_start_date || !request_end_date || !semester || !course_opening_id) {
    req.session.errorMessage = 'กรุณากรอกข้อมูลให้ครบถ้วน';
    return res.redirect('/reqforintern');
  }

  const user_id = req.session.user.id;

  try {
    const [results] = await db.promise().query('SELECT student_id FROM user WHERE user_id = ?', [user_id]);

    if (results.length === 0) {
      req.session.errorMessage = 'ไม่พบข้อมูลรหัสนักศึกษา';
      return res.redirect('/reqforintern');
    }

    const student_id = results[0].student_id;
    if (!student_id) {
      req.session.errorMessage = 'ไม่พบข้อมูล student_id';
      return res.redirect('/reqforintern');
    }

    const request_id = uuidv4();
    const status = 'P'; // Pending

    const sqlInsertRequest = `
      INSERT INTO internship_request 
      (request_id, company_id, position_id, request_start_date, request_end_date, student_id, semester, status, course_opening_id, create_up)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    await db.promise().query(sqlInsertRequest, [
      request_id, company_id, position_id, request_start_date, request_end_date, user_id, semester, status, course_opening_id
    ]);

    // บันทึกไฟล์เอกสารที่อัปโหลด
    if (documents) {
      for (let [key, files] of Object.entries(documents)) {
        files.forEach(async (file) => {
          const document_id = uuidv4();
          const sqlInsertDocument = `
            INSERT INTO document (document_id, document_type, file_path, request_id, create_up)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          `;
          await db.promise().query(sqlInsertDocument, [document_id, key, file.path, request_id]);  // เชื่อมโยง request_id กับเอกสาร
        });
      }
    }

    console.log('✅ บันทึกข้อมูลเรียบร้อย:', request_id);
    req.session.successMessage = 'บันทึกคำร้องและเอกสารเรียบร้อย';
    return res.redirect('/');
  } catch (err) {
    console.error('❌ Error:', err);
    req.session.errorMessage = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
    return res.redirect('/reqforintern');
  }
});
module.exports = router;
