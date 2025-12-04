const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'healthmonitor_super_secret_jwt_key_2024_change_in_production';
  return jwt.sign({ userId }, secret, { 
    expiresIn: process.env.JWT_EXPIRE || '7d' 
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if MongoDB is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please check MongoDB connection.',
        error: 'MongoDB not connected'
      });
    }

    const { username, email, password, firstName, lastName, role = 'patient', profile } = req.body;

    console.log('Registration attempt:', { username, email, role, hasProfile: !!profile });

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      console.log('Registration failed: User already exists', { email, username });
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create new user with profile data if provided
    const userData = {
      username,
      email,
      password,
      firstName,
      lastName,
      role
    };

    // Add profile data if provided (from step 2 of registration)
    if (profile) {
      userData.profile = {
        age: profile.age,
        gender: profile.gender,
        bloodType: profile.bloodType,
        height: profile.height,
        weight: profile.weight,
        emergencyContact: profile.emergencyContact
      };
    }

    console.log('Creating user with data:', { username, email, role, hasProfile: !!profile });

    const user = new User(userData);

    await user.save();

    console.log('User registered successfully:', { id: user._id, username: user.username, email: user.email, role: user.role });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    // Handle MongoDB-specific errors
    if (error.name === 'MongoServerError' && error.code === 8000) {
      return res.status(503).json({
        success: false,
        message: 'Database authentication failed. Please check MongoDB credentials.',
        error: 'MongoDB authentication error'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('username')
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    // Check if MongoDB is connected and reconnect if needed
    const mongoose = require('mongoose');
    const { ensureDBConnection } = require('../utils/db');
    
    if (mongoose.connection.readyState !== 1) {
      // Try to reconnect
      const connected = await ensureDBConnection();
      if (!connected) {
        return res.status(503).json({
          success: false,
          message: 'Database connection unavailable. Please try again later.',
          error: 'MongoDB not connected'
        });
      }
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, password, role } = req.body;

    // Log login attempt (for debugging)
    console.log('Login attempt:', { username, role: role || 'not specified' });

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user) {
      console.log('Login failed: User not found for username/email:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('Login failed: Account deactivated for user:', user.username);
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('Login failed: Invalid password for user:', user.username);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Optional: Check if user role matches the selected role (for stricter login)
    // Treat 'doctor' and 'provider' as equivalent roles
    if (role) {
      const userRole = user.role;
      const requestedRole = role.toLowerCase();
      
      // Map doctor/provider to be equivalent
      const roleMap = {
        'doctor': ['doctor', 'provider'],
        'provider': ['doctor', 'provider'],
        'patient': ['patient'],
        'admin': ['admin']
      };
      
      const allowedRoles = roleMap[requestedRole] || [requestedRole];
      
      if (!allowedRoles.includes(userRole)) {
        console.log('Login failed: Role mismatch. User role:', userRole, 'Requested role:', requestedRole);
        return res.status(403).json({
          success: false,
          message: `Access denied. This account is registered as ${userRole}, not ${requestedRole}.`
        });
      }
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    console.log('Login successful for user:', user.username, 'Role:', user.role);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          profile: user.profile,
          lastLogin: user.lastLogin
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', auth, async (req, res) => {
  try {
    const token = generateToken(req.user._id);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { token }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    // In a more sophisticated setup, you might want to blacklist the token
    // For now, we'll just return success as token removal is handled client-side
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

module.exports = router;
