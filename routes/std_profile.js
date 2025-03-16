var express = require('express');
var router = express.Router();
const db = require('../db');

// Route หน้า send_report
router.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/users/login');
  }

  const { user } = req.session;
  const student = user.student; // ดึงข้อมูลนักศึกษาจาก session

  console.log(user, student); // Debug ข้อมูล session

  res.render('std_profile', {
    title: 'ส่งรายงานการฝึกงาน',
    user: user,   // ส่งข้อมูล user ไปที่ view
    student: student // ส่งข้อมูล student ไปที่ view
  });
});

module.exports = router;
