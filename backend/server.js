const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const apiRoutes = require('./routes/api');
const userRoutes = require('./routes/userRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');

const app = express();

// Use CORS middleware
app.use(cors({
  origin: [
    "https://conference-scheduler-frontend10.vercel.app",
    "https://conference-scheduler-frontend10-6yv3eohp8.vercel.app",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
  exposedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Connect to MongoDB with error handling
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'conference-db'
})
.then(() => console.log('Connected to MongoDB Atlas - conference-db'))
.catch(err => console.error('MongoDB connection error:', err));

// API routes
app.use('/api', apiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schedule', scheduleRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Export the Express app for Vercel
module.exports = app; 
