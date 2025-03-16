var express = require('express');
var router = express.Router();
const db = require('../db');

// Route หน้า teacher/dashboard
router.get('/', (req, res) => {
    if (!req.session.user) {
      return res.redirect('/users/login');
    }
  
    const { user } = req.session;
    const evaluator = user.evaluator; // ดึงข้อมูลนักศึกษาจาก session
  
    console.log(user, evaluator); // Debug ข้อมูล session
  
    res.render('exter_profile', {
      title: 'หน้าแรก',
      user: user,   // ส่งข้อมูล user ไปที่ view
      teacher: teacher // ส่งข้อมูล student ไปที่ view
    });
  });
module.exports = router;
