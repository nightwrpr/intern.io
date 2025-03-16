var express = require('express');
var router = express.Router();
const db = require('../db'); // นำเข้า db.js ซึ่งเชื่อมต่อกับฐานข้อมูล MySQL
var session = require('express-session');

// Middleware ตรวจสอบว่ามีการติดตั้ง session หรือไม่
router.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 1000 * 60 * 60 } // อายุ session 1 ชั่วโมง
}));

/* GET Login Page */
router.get('/login', (req, res) => {
  res.render('login');
});

/* POST Login */
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('กรุณากรอกอีเมลและรหัสผ่าน');
  }

  const sql = 'SELECT * FROM user WHERE email = ? AND password = ?';
  db.query(sql, [email, password], (err, results) => {
    if (err) {
      console.error('Error querying the database:', err);
      return res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    }

    if (results.length === 0) {
      return res.status(401).send('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    const user = results[0];
    // ใช้ bcrypt เปรียบเทียบรหัสผ่านที่แฮชแล้ว
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Error comparing password:', err);
        return res.status(500).send('เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน');
      }

      if (!isMatch) {
        return res.status(401).send('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      switch (user.role.toLowerCase()) {
        case 'student': {
          const sqlStudent = 'SELECT * FROM student WHERE student_id = ?';
          db.query(sqlStudent, [user.student_id], (err, studentResults) => {
            if (err) {
              console.error('Error querying student data:', err);
              return res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูลนักศึกษา');
            }

            if (studentResults.length === 0) {
              return res.status(404).send('ไม่พบข้อมูลนักศึกษา');
            }

            req.session.user = {
              role: 'student',
              id: user.user_id,
              name: user.name,
              email: user.email,
              student_code: studentResults[0].student_code || 'ไม่มีข้อมูล',
              major: studentResults[0].major || 'ไม่มีข้อมูล',
              status: studentResults[0].status || 'ยังไม่มีข้อมูล',
              student: studentResults[0]
            };

            console.log('✅ Session Data:', req.session.user);
            return res.redirect('/');
          });
          break;
        }
        case 'admin': {
          req.session.user = {
            role: 'admin',
            id: user.user_id,
            name: `${user.first_name} ${user.last_name}`
          };

          console.log('✅ Admin Session Data:', req.session.user);
          return res.redirect('/admin/dashboard');
        }
        case 'teacher': {
          req.session.user = {
            role: 'teacher',
            id: user.user_id,
            name: user.name
          };

          console.log('✅ Teacher Session Data:', req.session.user);
          return res.redirect('/teacher/dashboard');
        }
        default: {
          return res.status(403).send('บทบาทของผู้ใช้งานไม่ได้รับอนุญาต');
        }
      }
    });
  });

  // เส้นทางสำหรับการออกจากระบบ
  router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('เกิดข้อผิดพลาดในการออกจากระบบ: ', err);
        return res.status(500).send('เกิดข้อผิดพลาดในการออกจากระบบ');
      }

      res.redirect('/login');
    });
  });

  module.exports = router;
