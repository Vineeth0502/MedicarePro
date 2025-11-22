const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for profile picture uploads
const profilePictureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/profile-pictures');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${req.user._id}-${uniqueSuffix}${ext}`);
  }
});

const profilePictureFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed for profile pictures'), false);
  }
};

const uploadProfilePicture = multer({
  storage: profilePictureStorage,
  fileFilter: profilePictureFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: { user: req.user }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

// @route   POST /api/users/profile/picture
// @desc    Upload profile picture
// @access  Private
router.post('/profile/picture', auth, uploadProfilePicture.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Delete old profile picture if exists
    const user = await User.findById(req.user._id);
    if (user.profilePicture) {
      const oldPicturePath = path.join(__dirname, '../../uploads', user.profilePicture.replace('/uploads/', ''));
      if (fs.existsSync(oldPicturePath)) {
        fs.unlinkSync(oldPicturePath);
      }
    }

    // Save new profile picture path
    const fileUrl = `/uploads/profile-pictures/${req.file.filename}`;
    user.profilePicture = fileUrl;
    await user.save();

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: { 
        profilePicture: `${req.protocol}://${req.get('host')}${fileUrl}`,
        user 
      }
    });

  } catch (error) {
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path); // Clean up uploaded file on error
    }
    console.error('Profile picture upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading profile picture',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   DELETE /api/users/profile/picture
// @desc    Delete profile picture
// @access  Private
router.delete('/profile/picture', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user.profilePicture) {
      const picturePath = path.join(__dirname, '../../uploads', user.profilePicture.replace('/uploads/', ''));
      if (fs.existsSync(picturePath)) {
        fs.unlinkSync(picturePath);
      }
      user.profilePicture = null;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Profile picture deleted successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Profile picture delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting profile picture',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  body('profile.age')
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage('Age must be between 0 and 150'),
  body('profile.gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Invalid gender'),
  body('profile.bloodType')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood type'),
  body('profile.height')
    .optional()
    .isFloat({ min: 30, max: 300 })
    .withMessage('Height must be between 30 and 300 cm'),
  body('profile.weight')
    .optional()
    .isFloat({ min: 10, max: 500 })
    .withMessage('Weight must be between 10 and 500 kg')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const updateData = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});

// @route   GET /api/users/patients
// @desc    Get patients or doctors (based on user role)
// @access  Private
router.get('/patients', auth, async (req, res) => {
  try {
    const { page = 1, limit, search, role } = req.query; // No default limit - get all patients
    const skip = limit ? (page - 1) * limit : 0;

    // Determine which role to fetch based on current user
    let targetRole = role;
    if (!targetRole) {
      if (req.user.role === 'patient') {
        targetRole = 'provider'; // Patients see providers/doctors
      } else {
        targetRole = 'patient'; // Providers/Doctors see patients
      }
    }

    let query = { role: targetRole, isActive: true };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    let queryBuilder = User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });
    
    if (limit) {
      queryBuilder = queryBuilder.limit(parseInt(limit)).skip(skip);
    }
    
    const patients = await queryBuilder;

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        patients,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching patients'
    });
  }
});

// @route   GET /api/users/doctors
// @desc    Get all doctors/providers
// @access  Private
router.get('/doctors', auth, async (req, res) => {
  try {
    const { page = 1, limit, search } = req.query;
    const skip = limit ? (page - 1) * limit : 0;

    let query = { 
      role: { $in: ['provider', 'doctor', 'admin'] }, 
      isActive: true 
    };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    let queryBuilder = User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });
    
    if (limit) {
      queryBuilder = queryBuilder.limit(parseInt(limit)).skip(skip);
    }
    
    const doctors = await queryBuilder;
    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        doctors,
        patients: doctors, // For backward compatibility
        pagination: limit ? {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        } : undefined
      }
    });

  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching doctors'
    });
  }
});

// @route   GET /api/users/patients/stats
// @desc    Get aggregated stats for all patients (appointments and metrics counts)
// @access  Private (Provider/Doctor/Admin only)
router.get('/patients/stats', auth, async (req, res) => {
  try {
    // Check if user is provider/doctor/admin
    if (!['provider', 'doctor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Provider access required.'
      });
    }

    const Appointment = require('../models/Appointment');
    const HealthMetric = require('../models/HealthMetric');

    // Get all patients
    const patients = await User.find({ role: 'patient', isActive: true })
      .select('_id')
      .lean();
    
    const patientIds = patients.map(p => p._id);

    // Get all appointments in one query
    const allAppointments = await Appointment.find({
      patientId: { $in: patientIds }
    })
      .select('patientId scheduledDate status')
      .lean();

    // Get metrics counts for all patients using aggregation (much faster)
    const metricsCounts = await HealthMetric.aggregate([
      {
        $match: {
          userId: { $in: patientIds },
          isActive: true
        }
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      }
    ]);

    // Create a map for quick lookup
    const metricsCountMap = {};
    metricsCounts.forEach(item => {
      metricsCountMap[item._id.toString()] = item.count;
    });

    // Process appointments by patient
    const appointmentStats = {};
    const now = new Date();
    
    allAppointments.forEach(apt => {
      const patientId = (apt.patientId?._id || apt.patientId)?.toString();
      if (!patientId) return;

      if (!appointmentStats[patientId]) {
        appointmentStats[patientId] = {
          total: 0,
          upcoming: 0
        };
      }

      appointmentStats[patientId].total++;
      
      const aptDate = new Date(apt.scheduledDate);
      if (aptDate >= now && (apt.status === 'scheduled' || apt.status === 'confirmed')) {
        appointmentStats[patientId].upcoming++;
      }
    });

    // Combine stats for all patients
    const stats = {};
    patients.forEach(patient => {
      const patientId = patient._id.toString();
      stats[patientId] = {
        appointmentCount: appointmentStats[patientId]?.total || 0,
        upcomingAppointments: appointmentStats[patientId]?.upcoming || 0,
        recentMetrics: metricsCountMap[patientId] || 0,
        lastMetricDate: null
      };
    });

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Get patients stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching patients stats'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only access their own profile unless they're admin/doctor
    if (req.user.role === 'patient' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

module.exports = router;
