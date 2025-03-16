const mysql = require('mysql2');

const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root', // ใส่ user ของคุณ
  password: '1234',  // ใส่ password ของคุณ
  database: 'internship_db'  // ชื่อฐานข้อมูลที่ใช้
});

// เชื่อมต่อฐานข้อมูล
db.connect(function(err) {
  if (err) {
    console.error('ไม่สามารถเชื่อมต่อฐานข้อมูลได้: ' + err.stack);
    return;
  }
  console.log('เชื่อมต่อฐานข้อมูลสำเร็จ');
});

module.exports = db;