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
  origin: '*',  // More permissive for debugging
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

// Add this before the existing error handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Update the existing error handler
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(err.status || 500).json({ 
    message: err.message || 'Something went wrong!',
    path: req.path
  });
});

// Export the Express app for Vercel
module.exports = app; 
