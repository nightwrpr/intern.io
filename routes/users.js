const sql = 'SELECT * FROM user WHERE email = ?';
db.query(sql, [email], async (err, results) => {
  if (err) {
    console.error('Error querying database:', err);
    return res.status(500).send('Internal Server Error');
  }

  if (results.length === 0) {
    return res.status(401).send('Incorrect email or password');
  }

  const user = results[0];

  // ตรวจสอบรหัสผ่านด้วย bcrypt
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).send('Incorrect email or password');
  }

  switch (user.role.toLowerCase()) {
    case 'student': {
      const sqlStudent = 'SELECT * FROM student WHERE student_id = ?';
      db.query(sqlStudent, [user.student_id], (err, studentResults) => {
        if (err) {
          console.error('Error querying student data:', err);
          return res.status(500).send('Error fetching student data');
        }

        if (studentResults.length === 0) {
          return res.status(404).send('Student data not found');
        }

        req.session.user = {
          role: 'student',
          id: user.user_id,
          name: user.name,
          email: user.email,
          student_code: studentResults[0].student_code || 'No data',
          major: studentResults[0].major || 'No data',
          status: studentResults[0].status || 'No data',
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
      return res.status(403).send('User role not authorized');
    }
  }
});
