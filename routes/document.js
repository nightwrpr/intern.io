var express = require('express');
var router = express.Router();

// หน้าแสดงประวัติการฝึกงาน
router.get('/', (req, res) => {
  // แค่ render หน้า history โดยไม่ต้องดึงข้อมูลจากฐานข้อมูล
  res.render('document');
});

module.exports = router;