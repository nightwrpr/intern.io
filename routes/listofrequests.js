var express = require('express');
var router = express.Router();
const db = require('../db');
const path = require('path');

// ฟังก์ชันตรวจสอบสิทธิ์
function checkRole(requiredRole) {
    return (req, res, next) => {
        if (!req.session.user) {
            req.session.user = null;
            return res.redirect('/users/login');
        }

        const userRole = req.session.user.role?.toLowerCase();
        if (!userRole || userRole !== requiredRole.toLowerCase()) {
            return res.status(403).send('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        }

        next();
    };
}

// Route: หน้าแสดงรายการคำขอฝึกงานทั้งหมด
router.get('/', checkRole('teacher'), async (req, res) => {
    try {
        let page = parseInt(req.query.page, 10) || 1;
        if (page <= 0) return res.status(400).send('หมายเลขหน้าต้องเป็นเลขบวก');

        const itemsPerPage = 10;
        const offset = (page - 1) * itemsPerPage;

        const query = `SELECT 
                ir.request_id,
                ir.request_start_date,
                ir.request_end_date,
                ir.status,
                student.name AS student_name,
                student.email AS student_email,
                COALESCE(company.name, 'ไม่ระบุ') AS company_name,
                COALESCE(job.position_name, 'ไม่ระบุ') AS position_name,
                student.user_id AS student_id
            FROM 
                internship_request ir
            JOIN 
                \`user\` student ON ir.student_id = student.user_id
            LEFT JOIN 
                company ON ir.company_id = company.company_id
            LEFT JOIN 
                position_open job ON ir.position_id = job.position_id
            WHERE 
                ir.delete_up IS NULL
            ORDER BY 
                ir.request_start_date DESC  -- แก้ไขตรงนี้เพื่อให้แสดงคำขอใหม่สุดก่อน
            LIMIT ? OFFSET ?`;

        const [requests] = await db.promise().query(query, [itemsPerPage, offset]);

        // ใช้ request_id และ student_id จาก internship_request เพื่อกรองเอกสาร
        const documentQuery = `SELECT 
            doc.request_id, 
            doc.file_path, 
            doc.document_type
        FROM 
            document doc
        JOIN 
            internship_request ir ON ir.request_id = doc.request_id
        WHERE 
            ir.request_id = ?`;

        // ใช้ db.promise().query() เพื่อดึงเอกสารสำหรับแต่ละคำขอ
        const documentPromises = requests.map(request =>
            db.promise().query(documentQuery, [request.request_id])
        );

        const documentsResult = await Promise.all(documentPromises);

        // เพิ่มข้อมูลเอกสารเข้าไปใน requests
        documentsResult.forEach((docs, index) => {
            requests[index].documents = docs[0].map(doc => ({
                ...doc,
                file_name: path.basename(doc.file_path)
            }));
        });

        // คำนวณจำนวนหน้าทั้งหมด
        const countQuery = 'SELECT COUNT(*) AS total FROM internship_request ir WHERE ir.delete_up IS NULL';
        const [[{ total }]] = await db.promise().query(countQuery);
        const totalPages = Math.max(Math.ceil(total / itemsPerPage), 1);

        // ส่งข้อมูลทั้งหมดไปยังหน้า listofrequests
        res.render('listofrequests', {
            title: 'รายการคำขอฝึกงานทั้งหมด',
            requests,
            teacher: req.session.user,
            page,
            totalPages
        });

    } catch (err) {
        console.error('เกิดข้อผิดพลาด:', err.message);
        res.status(500).send('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
});

// 📌 API ดึงข้อมูลเอกสารตาม request_id
router.get('/document/:requestId', async (req, res) => {
    try {
        const requestId = req.params.requestId;
        console.log("🔍 กำลังค้นหาเอกสารสำหรับ request_id:", requestId);

        const documentQuery = `SELECT file_path, document_type FROM document WHERE request_id = ?`;
        const [documents] = await db.promise().query(documentQuery, [requestId]);

        if (!documents || documents.length === 0) {
            console.log("🚫 ไม่พบเอกสารสำหรับ request_id:", requestId);
            return res.status(404).json({ message: 'ไม่พบเอกสาร' });
        }

        console.log("✅ พบเอกสาร:", documents);
        res.status(200).json({ documents });
    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดในการดึงข้อมูลเอกสาร:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
    }
});
// อัปเดตสถานะของคำขอฝึกงาน
router.post('/update-status/:requestId', async (req, res) => {
    const { requestId } = req.params;
    let { status } = req.body;

    console.log('🔍 รับค่า requestId:', requestId);
    console.log('🔍 รับค่า status:', status);

    // เพิ่ม 'R' ใน validStatuses
    const validStatuses = ['P', 'A', 'C', 'R', 'p', 'a', 'c', 'r'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ message: '❌ Status ไม่ถูกต้อง' });
    }

    try {
        // แปลง status ให้เป็นตัวใหญ่เสมอ (ป้องกันปัญหาส่งค่าเป็นตัวเล็ก)
        status = status.toUpperCase();

        // ตรวจสอบว่ามี requestId อยู่จริงไหม
        const [request] = await db.promise().query(
            'SELECT * FROM internship_request WHERE request_id = ?',
            [requestId]
        );

        if (!request.length) {
            return res.status(404).json({ message: '❌ ไม่พบคำขอฝึกงาน' });
        }

        // อัปเดต status
        await db.promise().query(
            'UPDATE internship_request SET status = ? WHERE request_id = ?',
            [status, requestId]
        );

        console.log('✅ อัปเดตสถานะสำเร็จ');

        // รีเฟรชหน้าโดย redirect กลับไปที่หน้าเดิม
        res.redirect('/listofrequests');

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการอัปเดต:', error);
        res.status(500).json({ message: '❌ Internal Server Error', error: error.message });
    }
});
module.exports = router;
