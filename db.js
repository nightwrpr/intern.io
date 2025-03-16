const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'bugpitvpmnkgbgqz45r7-mysql.services.clever-cloud.com',
  user: 'ujkrnnjpf1q9ho3v', // ใส่ user ของคุณ
  password: 'GX5eOIi9IQxzurBlGn70',  // ใส่ password ของคุณ
  database: 'bugpitvpmnkgbgqz45r7',  // ชื่อฐานข้อมูลที่ใช้
  port: 3306,
  ssl: { rejectUnauthorized: false }

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