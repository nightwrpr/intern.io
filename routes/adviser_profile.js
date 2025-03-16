var express = require('express');
var router = express.Router();
const db = require('../db');

// Route หน้า teacher/dashboard
router.get('/', (req, res) => {
    if (!req.session.user) {
      return res.redirect('/users/login');
    }
  
    const { user } = req.session;
    const teacher = user.teacher; // ดึงข้อมูลนักศึกษาจาก session
  
    console.log(user, teacher); // Debug ข้อมูล session
  
    res.render('adviser_profile', {
      title: 'หน้าแรก',
      user: user,   // ส่งข้อมูล user ไปที่ view
      teacher: teacher // ส่งข้อมูล student ไปที่ view
    });
  });
module.exports = router;
