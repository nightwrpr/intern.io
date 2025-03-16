var express = require('express');
var router = express.Router();
const db = require('../db');

// Route หน้า index
router.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/users/login');
  }

  const { user } = req.session;
  const student = user.student; // ดึงข้อมูลนักศึกษาจาก session

  console.log(user, student); // Debug ข้อมูล session

  res.render('index', {
    title: 'หน้าแรก',
    user: user,   // ส่งข้อมูล user ไปที่ view
    student: student // ส่งข้อมูล student ไปที่ view
  });
});

// Route หน้า company
router.get('/company', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'student') {
    return res.redirect('/users/login');
  }

  const student = req.session.user.student; // ดึงข้อมูลนักศึกษาจาก session

  const sqlQuery = `
    SELECT c.company_id, c.name AS company_name, c.address AS company_address, c.email, c.phone_number, 
           p.position_name, p.number_of_open, p.description
    FROM company AS c
    LEFT JOIN position_open AS p ON c.company_id = p.company_id
    WHERE c.delete_up IS NULL AND p.delete_up IS NULL
  `;

  db.query(sqlQuery, function (err, results) {
    if (err) {
      console.error('Error:', err);
      return res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
    }

    // Organize results into companies with positions
    const companies = [];
    results.forEach(row => {
      let company = companies.find(c => c.company_id === row.company_id);
      if (!company) {
        company = {
          company_id: row.company_id,
          name: row.company_name,
          address: row.company_address,
          email: row.email,
          phone_number: row.phone_number,
          positions: []
        };
        companies.push(company);
      }
      company.positions.push({
        position_name: row.position_name,
        number_of_open: row.number_of_open,
        description: row.description
      });
    });

    res.render('company', {
      companies: companies, // ส่งข้อมูลบริษัทและตำแหน่ง
      student: req.session.user // ข้อมูลนักศึกษาจาก session
    });
  });
});

// Route หน้า admin/dashboard
router.get('/admin/dashboard', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'Admin') {
    return res.redirect('/users/login');
  }

  res.render('admin/dashboard', {
    title: 'แดชบอร์ดผู้ดูแลระบบ',
    admin: req.session.user
  });
});

// Route หน้า teacher/dashboard
router.get('/teacher/dashboard', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'teacher') {
    return res.redirect('/users/login');
  }

  res.render('teacher/dashboard', {
    title: 'แดชบอร์ดอาจารย์',
    teacher: req.session.user
  });
});

module.exports = router;
