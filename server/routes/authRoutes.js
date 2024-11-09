const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, dietPreferences } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      dietPreferences
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        dietPreferences: user.dietPreferences
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('Login attempt failed: User not found -', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Login attempt failed: Invalid password -', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('User logged in successfully:', {
      id: user._id,
      email: user.email,
      name: user.name
    });

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        dietPreferences: user.dietPreferences
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user preferences
router.put('/preferences', async (req, res) => {
  try {
    const { dietPreferences } = req.body;
    const userId = req.user.id; // Will be set by auth middleware

    const user = await User.findByIdAndUpdate(
      userId,
      { dietPreferences },
      { new: true }
    );

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        dietPreferences: user.dietPreferences
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new route to check current users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'email name createdAt dietPreferences');
    console.log('Current users in database:', users);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 