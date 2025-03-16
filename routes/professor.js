var express = require('express');
var router = express.Router();
const db = require('../db'); // เชื่อมต่อกับฐานข้อมูล
const flash = require('connect-flash');

// ตรวจสอบว่าผู้ใช้เข้าสู่ระบบหรือไม่
function isLoggedIn(req, res, next) {
    if (!req.session.student) {
        return res.redirect('/users/login'); // ถ้ายังไม่ได้เข้าสู่ระบบให้กลับไปหน้า login
    }
    next();
}

// หน้าแสดงข้อมูลนักศึกษา (หน้าเริ่มต้น)
router.get('/', isLoggedIn, (req, res) => {
    const query = `
        SELECT s.student_id, s.student_name, s.program, 
               es.score1, es.score2, es.score3, es.total_score
        FROM student s
        LEFT JOIN evaluation_scores es ON s.student_id = es.student_id
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching student data:", err);
            return res.status(500).send("เกิดข้อผิดพลาดในการดึงข้อมูล");
        }

        res.render('professor', {
            students: results,
            successMessage: req.flash('success')
        });
    });
});

// หน้าบันทึกคะแนนการประเมิน
router.get('/evaluate/:student_id', isLoggedIn, (req, res) => {
    const student_id = req.params.student_id;

    db.query('SELECT * FROM student WHERE student_id = ?', [student_id], (err, results) => {
        if (err) {
            console.error("Error in query:", err);
            return res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
        } else if (results.length === 0) {
            console.log('No student found for ID:', student_id);
            return res.status(404).send('ไม่พบข้อมูลนักศึกษา');
        }

        res.render('evaluate', { student: results[0] });
    });
});

// การบันทึกคะแนน
router.post('/evaluate/:student_id', isLoggedIn, (req, res) => {
    const student_id = req.params.student_id;
    const { score1, score2, score3 } = req.body;

    // ตรวจสอบว่าคะแนนทั้งหมดเป็นตัวเลข
    const scores = [score1, score2, score3].map(score => parseInt(score, 10));
    if (scores.some(isNaN)) {
        return res.status(400).send('กรุณากรอกคะแนนให้ถูกต้อง');
    }

    const totalScore = scores.reduce((a, b) => a + b, 0);

    const query = `
        INSERT INTO evaluation_scores (student_id, score1, score2, score3, total_score)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            score1 = VALUES(score1), 
            score2 = VALUES(score2), 
            score3 = VALUES(score3), 
            total_score = VALUES(total_score)
    `;

    db.query(query, [student_id, ...scores, totalScore], (err, result) => {
        if (err) {
            console.error("Error saving evaluation scores:", err);
            return res.status(500).send('เกิดข้อผิดพลาดในการบันทึกคะแนน');
        }

        req.flash('success', 'บันทึกคะแนนสำเร็จ');
        res.redirect('/professor');
    });
});

module.exports = router;
