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
    "https://conference-scheduler-frontend10-2fnce3876.vercel.app",
    "https://conference-scheduler-frontend10-6yv3eohp8.vercel.app",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
  exposedHeaders: ["Content-Type", "Authorization"],
  credentials: false  // Changed to false since we're using token-based auth
}));

// Add OPTIONS preflight handler
app.options('*', cors());

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

// Add this after your error handlers but before module.exports
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app; 
