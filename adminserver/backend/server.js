require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const noteRoutes = require('./routes/notes');
const adminBatch = require("./routes/adminBatch");
const reportRoutes = require("./routes/reportRoutes");
const adminEvaluation = require("./routes/adminEvaluation");
const assignmentRoutes = require('./routes/assignmentRoutes');
const uploadRoutes = require('./routes/upload'); // adjust path
const adminDashboard = require('./routes/adminDasboard');
const studentRoutes = require('./routes/studentRoutes.js');
const statisticsRoutes = require("./routes/statisticsRoutes");
const settingsRoutes = require('./routes/settingsRoute.js');

const app = express();
const allowedOrigins = [
  'http://localhost:3002',
  'http://localhost:3003'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Admin DB Connected'))
  .catch(console.error);

// Static route to access uploaded files

app.use(uploadRoutes);
app.use('/notes', noteRoutes);
app.use("/api/admin-batches", adminBatch);
app.use("/api/reports", reportRoutes);
app.use("/api/evaluation", adminEvaluation);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/dashboard',adminDashboard);
app.use("/api/students", studentRoutes);
app.use('/api/settings',settingsRoutes);
app.use("/statistics", statisticsRoutes);

app.listen(5002, () => console.log('Admin server on 5002'));
