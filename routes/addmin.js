var express = require('express');
var router = express.Router();
const db = require('../db'); // เชื่อมต่อกับฐานข้อมูลที่ตั้งค่าไว้

// Route สำหรับหน้าแอดมินที่แสดงข้อมูลผู้ใช้
router.get('/', (req, res) => {
    if (!req.session.student) {
        return res.redirect('/users/login'); // ตรวจสอบว่าเข้าสู่ระบบแล้ว
    }

    const query = 'SELECT User_id, user_name, user_email, role FROM user';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).send('Internal Server Error');
        }

        // ส่งข้อมูล users และ student ไปยัง view
        res.render('addmin', { 
            student: req.session.student, 
            users: results 
        });
    });
});

router.post('/update-user/:id', (req, res) => {
    const userId = req.params.id;
    const { username, role } = req.body;

    const query = 'UPDATE User SET user_name = ?, role = ? WHERE User_id = ?';
    db.query(query, [username, role, userId], (err, result) => {
        if (err) {
            console.error('Error updating user:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, message: 'User updated successfully' });
    });
});



module.exports = router;
