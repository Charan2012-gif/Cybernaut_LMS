const express = require('express');
const bcrypt = require('bcrypt');
const User = require("../models/User");
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const { Parser } = require('json2csv');
const nodemailer = require("nodemailer");

const router = express.Router();

function sanitizeCell(value) {
  if (value && typeof value === "object") {
    return value.text || "";
  }
  return value;
}


const transporter = nodemailer.createTransport({
  service: "gmail", // or use "hotmail", or configure custom SMTP
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post("/save-selected", async (req, res) => {
  const selectedStudents = req.body;
  const credentials = [];

  try {
    for (const stu of selectedStudents) {
      const email = sanitizeCell(stu.email);
const name = sanitizeCell(stu.name);
const phone = sanitizeCell(stu.phone);
const address = sanitizeCell(stu.address);
const dob = stu.dob && typeof stu.dob === 'number'
  ? new Date(new Date(Date.UTC(1899, 11, 30)).getTime() + stu.dob * 86400000)
  : new Date(stu.dob);

const existingUser = await User.findOne({ email });
if (existingUser) continue;

      if (existingUser) continue;

      const plainPassword = Math.random().toString(36).slice(-8);
const hashedPassword = await bcrypt.hash(plainPassword, 10);

const newUser = await User.create({
  name,
  email,
  password: hashedPassword,
  role: "student",
});

await Student.create({
  user: newUser._id,
  course: stu.course,
  batch: stu.batch,
  phone,
  address,
  dob,
});

credentials.push({ name, email, password: plainPassword });


      // Send Email
      await transporter.sendMail({
  from: `"Cybernaut Admin" <${process.env.EMAIL_USER}>`,
  to: email,
  subject: "Welcome to Cybernaut LMS - Your Account Credentials",
  html: `
    <h3>Hello ${name},</h3>
    <p>Your account has been created on <strong>Cybernaut LMS</strong>.</p>
    <p><strong>Username:</strong> ${email}</p>
    <p><strong>Password:</strong> ${plainPassword}</p>
    <p>You can log in at <a href="http://your-lms-domain.com/login">Cybernaut LMS</a></p>
    <br/>
    <p>Regards,<br/>Cybernaut Team</p>
  `,
});

    }

    res.json({ credentials });
  } catch (err) {
    console.error("Error saving students:", err);
    res.status(500).json({ error: "Error saving students" });
  }
});

// Generate CSV
router.post('/download-credentials', (req, res) => {
  const credentials = req.body;

  try {
    const parser = new Parser({ fields: ['name', 'email', 'password'] });
    const csv = parser.parse(credentials);
    res.header('Content-Type', 'text/csv');
    res.attachment('credentials.csv');
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Error generating CSV' });
  }
});

// Get all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find()
      .populate({
        path: 'user',
        select: 'name email'
      })
      .populate({
        path: 'batch',
        populate: { path: 'course', select: 'courseName' },
        select: 'batchName course'
      });

    const formattedStudents = students.map(student => ({
      _id: student._id,
      user: student.user,
      phone: student.phone,
      dob: student.dob,
      batch: student.batch.batchName,
      course: student.batch.course.courseName,
    }));

    res.json(formattedStudents);
  } catch (err) {
    console.error('Failed to fetch students:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get students by batch
router.get('/batch/:batch', async (req, res) => {
  try {
    const { batch } = req.params;
    const students = await Student.find({ batch }).populate('user');
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;