const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ตั้งค่าการเก็บไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // เก็บไฟล์ในโฟลเดอร์ uploads/
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname)); // ตั้งชื่อไฟล์ให้ไม่ซ้ำกัน
  }
});

// ฟังก์ชันตรวจสอบไฟล์ที่อัปโหลด
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('ไฟล์ต้องเป็น PDF หรือรูปภาพเท่านั้น!'), false);
  }
};

// ตั้งค่า multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // จำกัดขนาดไฟล์ 5MB
});

module.exports = upload;
