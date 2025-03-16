var createError = require('http-errors');
var express = require('express');
var path = require('path');
const fs = require('fs');
const db = require('./db'); // สำหรับการเชื่อมต่อฐานข้อมูล
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var ejs = require('ejs');
var session = require('express-session');
require('dotenv').config();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var historyRouter = require('./routes/history');
var documentRouter = require('./routes/document');
var addRouter = require('./routes/add');
var addminRouter = require('./routes/addmin');
var detailsRouter = require('./routes/details');
var professorRouter = require('./routes/professor');
var reqforinternRouter = require('./routes/reqforintern');
var listofrequestsRouter = require('./routes/listofrequests');
var addmindashboardRouter = require('./routes/addmindashboard');
var send_reportRouter = require('./routes/send_report');
var status_stdRouter = require('./routes/status_std');
var adviser_nites_evaluationRouter = require('./routes/adviser_nites_evaluation');
var adviser_present_evaluationRouter = require('./routes/adviser_present_evaluation');
var check_reportRouter = require('./routes/check_report');
var adviser_profileRouter = require('./routes/adviser_profile');
var exter_profileRouter = require('./routes/exter_profile');
var externalevaluatorrRouter = require('./routes/externalevaluatorr');
var mentor_evaluationRouter = require('./routes/mentor_evaluation');
var mentor_proflieRouter = require('./routes/mentor_proflie');
var std_profileRouter = require('./routes/std_profile');

var app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);


app.engine('html', ejs.renderFile);

// ตั้งค่า session
app.use(session({
    secret: process.env.SESSION_SECRET || 'V!v6Kq9mVnP5B2j4!7@uHw$Lp6S9g7f7X0',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

const cors = require('cors');
app.use(cors({ origin: 'https://kkbs-internship-github-io.onrender.com', credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// ตั้งค่าเส้นทาง
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/history', historyRouter);
app.use('/document', documentRouter);
app.use('/add', addRouter);
app.use('/addmin', addminRouter);
app.use('/details', detailsRouter);
app.use('/professor', professorRouter);
app.use('/reqforintern', reqforinternRouter);
app.use('/listofrequests', listofrequestsRouter);
app.use('/admin', addmindashboardRouter);
app.use('/update-status', listofrequestsRouter);
app.use('/send_report', send_reportRouter);
app.use('/status_std', status_stdRouter);
app.use('/adviser_nites_evaluation', adviser_nites_evaluationRouter);
app.use('/adviser_present_evaluation', adviser_present_evaluationRouter);
app.use('/check_report', check_reportRouter);
app.use('/report_evaluation', check_reportRouter);
app.use('/adviser_profile', adviser_profileRouter);
app.use('/exter_profile', exter_profileRouter);
app.use('/externalevaluatorr', externalevaluatorrRouter);
app.use('/mentor_evaluation', mentor_evaluationRouter);
app.use('/mentor_proflie', mentor_proflieRouter);
app.use('/std_profile', std_profileRouter);

// 📌 Middleware สำหรับให้ดาวน์โหลดไฟล์จากโฟลเดอร์ `uploads`
// ใช้ express.static ให้บริการไฟล์จากโฟลเดอร์ 'uploads'
app.use('/document', express.static(path.join(__dirname, 'uploads')));

// เส้นทางสำหรับดึงไฟล์จาก `/document/:request_id`
app.get('/document/:request_id', async (req, res) => {
    const requestId = req.params.request_id;

    try {
        // ดึงข้อมูล file_path จากฐานข้อมูล
        const [results] = await db.promise().query(
            `SELECT file_path, document_type FROM document WHERE request_id = ?`, [requestId]
        );

        if (results.length === 0) {
            return res.status(404).json({ error: 'Document not found in the database' });
        }

        const { file_path, document_type } = results[0]; // เช่น 'uploads/1740509539335.pdf'
        if (!file_path) {
            return res.status(404).json({ error: 'No file path found in the database' });
        }

        console.log("🔍 Original file_path:", file_path); // ตรวจสอบค่าของ file_path จากฐานข้อมูล

        // ลบ 'uploads/' หากมีใน file_path
        let cleanFilePath = file_path.replace(/^uploads\//, ''); // ลบ 'uploads/' หากมีในตอนต้น

        console.log("🔍 Cleaned file_path:", cleanFilePath); // ตรวจสอบค่า cleanFilePath

        // ใช้ path.resolve() เพื่อสร้าง fullPath ที่ถูกต้อง
        const fullPath = path.resolve(__dirname, 'uploads', cleanFilePath); // ใช้ path.resolve()

        console.log("🔍 Checking fullPath:", fullPath); // ตรวจสอบว่า fullPath ถูกต้องหรือไม่

        // ตรวจสอบว่าไฟล์มีอยู่จริงหรือไม่
        fs.access(fullPath, fs.constants.F_OK, (err) => {
            if (err) {
                return res.status(404).json({ error: 'File not found on server' });
            }

            // ส่งไฟล์ให้กับผู้ใช้
            res.sendFile(fullPath);
        });

    } catch (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ error: 'Error fetching document data' });
    }
});

// จัดการ favicon.ico
app.get('/favicon.ico', (req, res) => res.status(204).end());

// จัดการข้อผิดพลาด 404
app.use((req, res) => {
    res.status(404).render('error', {
        message: 'ไม่พบหน้าที่ร้องขอ',
        error: {}
    });
});

// Error handler สำหรับข้อผิดพลาดอื่น ๆ
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).render('error', {
        message: 'เกิดข้อผิดพลาด!',
        error: err
    });
});

module.exports = app;
