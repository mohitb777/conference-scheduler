const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'conference-db'
    });
    console.log('Connected to MongoDB Atlas - conference-db');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

const testConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connection successful');
    await mongoose.connection.close();
  } catch (err) {
    console.error('MongoDB connection test failed:', err);
    process.exit(1);
  }
};

module.exports = connectDB; 