var express = require('express');
var router = express.Router();
const db = require('../db'); // เชื่อมต่อกับฐานข้อมูลที่ตั้งค่าไว้

// หน้าแสดงการประเมิน (evaluate)
router.get('/evaluate/:student_id', function (req, res, next) {
    const student_id = req.params.student_id;

    // ตรวจสอบว่า session มีข้อมูลนักศึกษาหรือไม่
    if (!req.session.student) {
        return res.redirect('users/login'); // ถ้าไม่ได้เข้าสู่ระบบ ให้ redirect ไปหน้า login
    }

    const student = req.session.student; // ดึงข้อมูลนักศึกษาจาก session

    // ตรวจสอบว่า session student มีค่า
    console.log(student);  // ตรวจสอบว่าข้อมูลของ student มีค่าอะไร

    // ดึงข้อมูลนักศึกษาจากฐานข้อมูลตาม student_id
    db.query('SELECT student_id, student_name, program FROM student WHERE student_id = ?', [student_id], function (err, results) {
        if (err) {
            console.error("Error in query:", err);
            return res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
        }
    
        if (results.length > 0) {
            // แสดงข้อมูลที่ดึงมาจากฐานข้อมูล
            console.log('Student data from DB:', results[0]);
    
            res.render('evaluate', {
                student: student, // ส่งข้อมูล student ไปที่ EJS
            });
        } else {
            res.status(404).send('ไม่พบข้อมูลนักศึกษา');
        }
    });    
});

// รับ POST คำขอจากหน้า evaluate
router.post('/evaluate/:student_id', function (req, res, next) {
    const student_id = req.params.student_id;
    const { score1, score2, score3 } = req.body;

    const query = `
        INSERT INTO evaluation_scores (student_id, score1, score2, score3)
        VALUES (?, ?, ?, ?)
    `;
    db.query(query, [student_id, score1, score2, score3], function (err, result) {
        if (err) {
            console.error("เกิดข้อผิดพลาดในการบันทึกคะแนน:", err);
            return res.status(500).send('เกิดข้อผิดพลาดในการบันทึกคะแนน');
        }
        req.flash('success', 'บันทึกคะแนนสำเร็จ');
        res.redirect('/professor');
    });
});

module.exports = router;
