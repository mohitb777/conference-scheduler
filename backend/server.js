const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const apiRoutes = require('./routes/api');
const userRoutes = require('./routes/userRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    'https://conference-scheduler-frontend10-qlza985um.vercel.app',
    'https://conference-scheduler-frontend10.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token'],
  credentials: true
}));

app.use(express.json());

// Connect to MongoDB with error handling
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'conference-db',
  serverSelectionTimeoutMS: 30000,  // Increased from 5000
  socketTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  heartbeatFrequencyMS: 1000,
  retryWrites: true,
  w: 'majority'
})
.then(() => console.log('Connected to MongoDB Atlas - conference-db'))
.catch(err => {
  console.error('MongoDB connection error:', {
    message: err.message,
    code: err.code,
    name: err.name
  });
  process.exit(1);
});

// Add more detailed error handling
mongoose.connection.on('error', err => {
  console.error('MongoDB runtime error:', {
    message: err.message,
    code: err.code,
    name: err.name
  });
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected successfully');
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api', apiRoutes);

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Add 404 handler
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.url);
  res.status(404).json({ message: 'Route not found' });
});

// Add this after your error handlers but before module.exports
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app; 
