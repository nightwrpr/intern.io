var express = require('express');
var router = express.Router();
const db = require('../db'); // นำเข้า db.js

// Middleware สำหรับตรวจสอบการเข้าสู่ระบบและสิทธิ์ admin
function isAdmin(req, res, next) {
  console.log('Session user:', req.session.user); // Debug ข้อมูล session

  if (!req.session.user) {
      console.log('User is not logged in.');
      return res.redirect('/users/login');
  }

  // เปรียบเทียบบทบาทโดยไม่สนใจตัวพิมพ์เล็ก-ใหญ่
  if (req.session.user.role.toLowerCase() !== 'admin') {
      console.log(`Access denied: user role is ${req.session.user.role}`);
      return res.status(403).send('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
  }

  next(); // ผ่านถ้า role เป็น admin
}

// Route สำหรับหน้าแสดงฟอร์ม (เฉพาะ admin เท่านั้น)
router.get('/', isAdmin, (req, res) => {
  const admin = req.session.user; // ดึงข้อมูลผู้ดูแลระบบจาก session

  // ส่งข้อมูลไปยัง view
  res.render('add', {
    admin: admin // ส่งข้อมูล admin ไปที่ EJS
  });
});

// ใช้ db แทน connection ในการเชื่อมต่อฐานข้อมูล
router.post('/', (req, res) => {
  const { company_name, company_address, job_title, job_description, job_requirements, open_date, close_date, status } = req.body;  // รับค่าต่างๆ จากฟอร์ม

  // ตรวจสอบว่ามีข้อมูลที่จำเป็นหรือไม่
  if (!company_name || !company_address || !job_title) {
    return res.status(400).send('กรุณากรอกข้อมูลให้ครบถ้วน');
  }

  // สร้างคำสั่ง SQL เพื่อบันทึกข้อมูลในตาราง companies และ job_positions
  const companyQuery = 'INSERT INTO companies (company_name, company_address) VALUES (?, ?)';
  const jobPositionQuery = `
    INSERT INTO job_positions 
    (company_id, job_title, job_description, job_requirements, open_date, close_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  // ใช้ db เชื่อมต่อแทน connection
  db.query(companyQuery, [company_name, company_address], (err, companyResult) => {
    if (err) {
      console.error('Error saving company data:', err);
      return res.status(500).send('เกิดข้อผิดพลาดในการบันทึกข้อมูลบริษัท');
    }

    const companyId = companyResult.insertId; // ดึง company_id ที่เพิ่มใหม่

    // บันทึกตำแหน่งงานพร้อมข้อมูลเพิ่มเติม
    db.query(jobPositionQuery, [companyId, job_title, job_description, job_requirements, open_date, close_date, status], (err, jobResult) => {
      if (err) {
        console.error('Error saving job position:', err);
        return res.status(500).send('เกิดข้อผิดพลาดในการบันทึกตำแหน่งงาน');
      }

      res.redirect('/admin/dashboard'); // เปลี่ยนเส้นทางไปยังหน้าสำเร็จ
    });
  });
});

module.exports = router;
