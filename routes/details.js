var express = require('express');
var router = express.Router();

// หน้าแอดมิน
router.get('/details', (req, res) => {
  // แค่ render หน้า history โดยไม่ต้องดึงข้อมูลจากฐานข้อมูล
  res.render('details');
});

module.exports = router;