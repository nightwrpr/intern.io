const express = require('express');
const router = express.Router();
const db = require('../db'); // นำเข้า db.js

// Middleware สำหรับตรวจสอบการเข้าสู่ระบบและสิทธิ์
function checkRole(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/users/login');
    }

    const userRole = req.session.user.role?.toLowerCase();
    if (!['admin'].includes(userRole)) {
        return res.status(403).send('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
    }

    next();
}

// Route สำหรับแสดงหน้าหลัก Admin
router.get('/admin_dashboard', checkRole, (req, res) => {
    const approvedSql = `
        SELECT r.request_id, 
               r.student_code AS student_name, 
               c.company_name, 
               j.job_title, 
               CONCAT(m.first_name, ' ', m.last_name) AS mentor_name, 
               IFNULL(r.approval_date, 'ยังไม่มีการอนุมัติ') AS approval_date  -- ใช้ IFNULL เพื่อแทนที่ค่า NULL
        FROM internship_requests AS r
        LEFT JOIN companies AS c ON r.company_id = c.company_id
        LEFT JOIN job_positions AS j ON r.job_id = j.job_id
        LEFT JOIN mentors AS m ON r.mentor_id = m.user_id
        WHERE r.approval_status = 'อนุมัติ';
    `;

    db.query(approvedSql, (err, approvedRequests) => {
        if (err) {
            console.error('Error fetching approved requests:', err);
            return res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูลคำขอที่อนุมัติ');
        }

        if (approvedRequests.length === 0) {
            console.log('ไม่มีข้อมูลคำขอที่ได้รับการอนุมัติ');
        }

        // สมมุติว่า 'admin' คือข้อมูลที่ต้องการส่งไปยัง sidebar
        const admin = req.session.user; // ตัวอย่างข้อมูลของผู้ใช้ที่เข้าสู่ระบบ

        // ส่งข้อมูล approvedRequests และ admin ไปที่ ejs
        res.render('admin/admin_dashboard', { approvedRequests, admin });
    });
});

// Route สำหรับหน้าเพิ่มพี่เลี้ยง
router.get('/admin/add-mentor', checkRole, (req, res) => {
    res.render('add_mentor');  // หน้าเพิ่มพี่เลี้ยง
});

// Route สำหรับการบันทึกข้อมูลพี่เลี้ยงใหม่
router.post('/admin/add-mentor', (req, res) => {
    const { mentor_name, mentor_email, mentor_phone, company_id, user_id } = req.body;

    // ตรวจสอบข้อมูลที่ส่งมา
    if (!mentor_name || !mentor_email || !mentor_phone || !company_id || !user_id) {
        return res.status(400).send('ข้อมูลไม่ครบถ้วน');
    }

    // ดึงข้อมูล first_name และ last_name จากตาราง users
    const userSql = `SELECT first_name, last_name FROM user WHERE user_id = ?`;

    db.query(userSql, [user_id], (err, user) => {
        if (err || !user || user.length === 0) {
            return res.status(400).send('ไม่พบข้อมูลผู้ใช้');
        }

        // สร้างชื่อ mentor โดยรวม first_name และ last_name
        const mentor_full_name = `${user[0].first_name} ${user[0].last_name}`;

        // คำสั่ง SQL สำหรับการเพิ่มพี่เลี้ยง
        const sql = `INSERT INTO mentors (user_id, company_id, phone_number, first_name, last_name, name, email) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;

        // ใช้ข้อมูลที่ดึงมาจาก users และค่าจากฟอร์ม
        db.query(sql, [user_id, company_id, mentor_phone, user[0].first_name, user[0].last_name, mentor_full_name, mentor_email], (err) => {
            if (err) {
                console.error('Error adding mentor:', err);
                return res.status(500).send('เกิดข้อผิดพลาดในการเพิ่มพี่เลี้ยง');
            }

            // หลังจากเพิ่มพี่เลี้ยงสำเร็จ ให้กลับไปหน้า admin/dashboard
            res.redirect('/addmin/admin_dashboard');
        });
    });
});

module.exports = router;
