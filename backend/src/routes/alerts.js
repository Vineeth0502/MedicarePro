const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Alert = require('../models/Alert');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/alerts
// @desc    Get alerts for user
// @access  Private
router.get('/', auth, [
  query('status')
    .optional()
    .isIn(['active', 'acknowledged', 'resolved', 'dismissed'])
    .withMessage('Invalid status'),
  query('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity'),
  query('alertType')
    .optional()
    .isIn([
      'elevated_heart_rate', 'high_blood_pressure', 'low_blood_pressure',
      'irregular_sleep', 'low_activity', 'high_glucose', 'low_glucose',
      'medication_reminder', 'appointment_reminder', 'checkup_due',
      'emergency', 'device_offline', 'data_sync_issue'
    ])
    .withMessage('Invalid alert type'),
  query('limit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Limit must be a positive integer'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
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

    const {
      status,
      severity,
      alertType,
      limit,
      page = 1
    } = req.query;

    // Build query
    const query = { userId: req.user._id };

    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (alertType) query.alertType = alertType;

    // Calculate pagination only if limit is provided
    const skip = limit ? (page - 1) * parseInt(limit) : 0;

    // Get alerts - no limit if not specified
    let alertsQuery = Alert.find(query)
      .sort({ triggeredAt: -1 })
      .populate('relatedMetricId', 'metricType value unit timestamp')
      .populate('relatedAppointmentId', 'title scheduledDate');
    
    if (limit) {
      alertsQuery = alertsQuery.limit(parseInt(limit)).skip(skip);
    }
    
    const alerts = await alertsQuery.lean();

    // Get total count for pagination
    const total = await Alert.countDocuments(query);

    // Get unread count
    const unreadCount = await Alert.countDocuments({
      userId: req.user._id,
      isRead: false,
      status: 'active'
    });

    res.json({
      success: true,
      data: {
        alerts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        unreadCount
      }
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching alerts'
    });
  }
});

// @route   POST /api/alerts
// @desc    Create new alert
// @access  Private
router.post('/', auth, [
  body('alertType')
    .isIn([
      'elevated_heart_rate', 'high_blood_pressure', 'low_blood_pressure',
      'irregular_sleep', 'low_activity', 'high_glucose', 'low_glucose',
      'medication_reminder', 'appointment_reminder', 'checkup_due',
      'emergency', 'device_offline', 'data_sync_issue'
    ])
    .withMessage('Invalid alert type'),
  body('title')
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('message')
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be between 1 and 500 characters'),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity'),
  body('relatedMetricId')
    .optional()
    .isMongoId()
    .withMessage('Invalid metric ID'),
  body('relatedAppointmentId')
    .optional()
    .isMongoId()
    .withMessage('Invalid appointment ID')
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

    const {
      alertType,
      title,
      message,
      severity = 'medium',
      relatedMetricId,
      relatedAppointmentId,
      metadata
    } = req.body;

    const alert = new Alert({
      userId: req.user._id,
      alertType,
      title,
      message,
      severity,
      relatedMetricId,
      relatedAppointmentId,
      metadata
    });

    await alert.save();

    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      data: { alert }
    });

  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating alert'
    });
  }
});

// @route   PUT /api/alerts/:id/acknowledge
// @desc    Acknowledge an alert
// @access  Private
router.put('/:id/acknowledge', auth, [
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const alert = await Alert.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    alert.status = 'acknowledged';
    alert.isRead = true;
    alert.acknowledgedAt = new Date();
    
    // Add action to history
    alert.actions.push({
      type: 'acknowledge',
      performedBy: req.user._id,
      notes
    });

    await alert.save();

    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      data: { alert }
    });

  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while acknowledging alert'
    });
  }
});

// @route   PUT /api/alerts/:id/resolve
// @desc    Resolve an alert
// @access  Private
router.put('/:id/resolve', auth, [
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const alert = await Alert.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    alert.status = 'resolved';
    alert.isRead = true;
    alert.resolvedAt = new Date();
    
    // Add action to history
    alert.actions.push({
      type: 'resolve',
      performedBy: req.user._id,
      notes
    });

    await alert.save();

    res.json({
      success: true,
      message: 'Alert resolved successfully',
      data: { alert }
    });

  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resolving alert'
    });
  }
});

// @route   PUT /api/alerts/:id/dismiss
// @desc    Dismiss an alert
// @access  Private
router.put('/:id/dismiss', auth, [
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const alert = await Alert.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    alert.status = 'dismissed';
    alert.isRead = true;
    
    // Add action to history
    alert.actions.push({
      type: 'dismiss',
      performedBy: req.user._id,
      notes
    });

    await alert.save();

    res.json({
      success: true,
      message: 'Alert dismissed successfully',
      data: { alert }
    });

  } catch (error) {
    console.error('Dismiss alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while dismissing alert'
    });
  }
});

// @route   PUT /api/alerts/:id/read
// @desc    Mark alert as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    alert.isRead = true;
    await alert.save();

    res.json({
      success: true,
      message: 'Alert marked as read',
      data: { alert }
    });

  } catch (error) {
    console.error('Mark alert as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking alert as read'
    });
  }
});

// @route   GET /api/alerts/summary
// @desc    Get alerts summary
// @access  Private
router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get counts by status
    const statusCounts = await Alert.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get counts by severity
    const severityCounts = await Alert.aggregate([
      { $match: { userId: userId, status: 'active' } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    // Get unread count
    const unreadCount = await Alert.countDocuments({
      userId: userId,
      isRead: false,
      status: 'active'
    });

    // Get recent alerts (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = await Alert.countDocuments({
      userId: userId,
      triggeredAt: { $gte: sevenDaysAgo }
    });

    res.json({
      success: true,
      data: {
        statusCounts: statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        severityCounts: severityCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        unreadCount,
        recentCount
      }
    });

  } catch (error) {
    console.error('Get alerts summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching alerts summary'
    });
  }
});

// @route   GET /api/alerts/patient/:patientId
// @desc    Get alerts for a specific patient (Provider only)
// @access  Private (Provider/Doctor/Admin only)
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    // Check if user is provider/doctor/admin
    if (!['provider', 'doctor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Provider access required.'
      });
    }

    const { patientId } = req.params;
    const { status, limit = 50 } = req.query;

    // Build query
    const query = { userId: patientId };

    if (status) query.status = status;

    // Get alerts
    const alerts = await Alert.find(query)
      .sort({ triggeredAt: -1 })
      .limit(parseInt(limit))
      .populate('relatedMetricId', 'metricType value unit timestamp')
      .lean();

    res.json({
      success: true,
      data: { alerts }
    });

  } catch (error) {
    console.error('Get patient alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching patient alerts'
    });
  }
});

module.exports = router;
