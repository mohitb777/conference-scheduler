const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ 
      $or: [
        { username: username },
        { email: username }
      ]
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({
      token,
      username: user.username,
      _id: user._id
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user data endpoint
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Return only the username to match frontend expectations
    res.json({ username: user.username });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add registration endpoint
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, fullName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username },
        { email }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this username or email' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      username,
      password: hashedPassword,
      email,
      fullName
    });

    await user.save();

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { 
      expiresIn: '1d' 
    });

    res.status(201).json({
      token,
      username: user.username,
      _id: user._id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

module.exports = router; 