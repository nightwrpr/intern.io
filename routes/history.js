var express = require('express');
var router = express.Router();

// หน้าแสดงประวัติการฝึกงาน
router.get('/', (req, res) => {
  // แค่ render หน้า history โดยไม่ต้องดึงข้อมูลจากฐานข้อมูล
  res.render('history');
});

router.get('/history', function(req, res, next) {
    db.query('SELECT * FROM internshiphistory', function(err, results) {
      if (err) {
        console.error(err);
        res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
      } else {
        res.render('history', { history: results }); // ส่งข้อมูลไปที่ EJS
      }
    });
  });
module.exports = router;
