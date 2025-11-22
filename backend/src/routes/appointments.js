const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const Alert = require('../models/Alert');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/appointments
// @desc    Get appointments for user
// @access  Private
router.get('/', auth, [
  query('status')
    .optional()
    .isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
    .withMessage('Invalid status'),
  query('appointmentType')
    .optional()
    .isIn(['consultation', 'checkup', 'follow_up', 'emergency', 'surgery', 'therapy', 'diagnostic', 'vaccination'])
    .withMessage('Invalid appointment type'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
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
      appointmentType,
      startDate,
      endDate,
      limit,
      page = 1
    } = req.query; // No default limit - get all if not specified

    // Build query based on user role
    let query = {};
    
    if (req.user.role === 'patient') {
      query.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      query.doctorId = req.user._id;
    } else {
      // Admin can see all appointments
      query = {};
    }

    if (status) query.status = status;
    if (appointmentType) query.appointmentType = appointmentType;

    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    // Calculate pagination only if limit is provided
    const skip = limit ? (page - 1) * parseInt(limit) : 0;

    // Get appointments - apply limit only if specified
    let appointmentsQuery = Appointment.find(query)
      .populate('patientId', 'firstName lastName email profile')
      .populate('doctorId', 'firstName lastName email profile')
      .sort({ scheduledDate: 1 });
    
    if (limit) {
      appointmentsQuery = appointmentsQuery.limit(parseInt(limit)).skip(skip);
    }
    
    const appointments = await appointmentsQuery.lean();

    // Get total count for pagination
    const total = await Appointment.countDocuments(query);

    res.json({
      success: true,
      data: {
        appointments,
        pagination: limit ? {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        } : {
          currentPage: 1,
          totalPages: 1,
          totalItems: total,
          itemsPerPage: total
        }
      }
    });

  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching appointments'
    });
  }
});

// @route   POST /api/appointments
// @desc    Create new appointment
// @access  Private (All authenticated users can create appointments)
router.post('/', auth, [
  body('patientId')
    .optional()
    .isMongoId()
    .withMessage('Invalid patient ID'),
  body('doctorId')
    .optional()
    .isMongoId()
    .withMessage('Invalid doctor ID'),
  body('title')
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('appointmentType')
    .isIn(['consultation', 'checkup', 'follow_up', 'emergency', 'surgery', 'therapy', 'diagnostic', 'vaccination'])
    .withMessage('Invalid appointment type'),
  body('scheduledDate')
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date'),
  body('duration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('Duration must be between 15 and 480 minutes'),
  body('location.type')
    .optional()
    .isIn(['in_person', 'virtual', 'phone'])
    .withMessage('Invalid location type')
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
      patientId,
      doctorId,
      title,
      description,
      appointmentType,
      scheduledDate,
      duration = 30,
      location,
      notes
    } = req.body;

    // Determine patient and doctor based on user role
    let finalPatientId, finalDoctorId;
    
    if (req.user.role === 'patient') {
      // Patient is booking for themselves
      finalPatientId = req.user._id;
      finalDoctorId = doctorId;
      
      if (!finalDoctorId) {
        return res.status(400).json({
          success: false,
          message: 'Doctor/Provider ID is required'
        });
      }
    } else if (req.user.role === 'doctor' || req.user.role === 'provider') {
      // Doctor/Provider is creating appointment for a patient
      finalPatientId = patientId;
      finalDoctorId = req.user._id;
      
      if (!finalPatientId) {
        return res.status(400).json({
          success: false,
          message: 'Patient ID is required'
        });
      }
    } else {
      // Admin can specify both
      finalPatientId = patientId;
      finalDoctorId = doctorId || req.user._id;
    }

    // Normalize location object to match schema
    let normalizedLocation = null;
    if (location && location.type) {
      normalizedLocation = {
        type: location.type,
        address: typeof location.address === 'string' ? { street: location.address } : location.address,
        room: location.room || undefined,
        virtualLink: location.virtualLink || undefined
      };
    }

    const appointment = new Appointment({
      patientId: finalPatientId,
      doctorId: finalDoctorId,
      title,
      description: description || undefined,
      appointmentType,
      scheduledDate: new Date(scheduledDate),
      duration: parseInt(duration) || 30,
      location: normalizedLocation,
      notes: notes || undefined
    });

    await appointment.save();

    // Populate the appointment with user details
    await appointment.populate('patientId', 'firstName lastName email');
    await appointment.populate('doctorId', 'firstName lastName email');

    // Create notifications for both patient and doctor
    try {
      const appointmentDate = new Date(appointment.scheduledDate);
      const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Notification for patient
      const patientAlert = new Alert({
        userId: finalPatientId,
        alertType: 'appointment_reminder',
        title: 'New Appointment Scheduled',
        message: `Your appointment "${appointment.title}" with Dr. ${appointment.doctorId.firstName} ${appointment.doctorId.lastName} has been scheduled for ${formattedDate}.`,
        severity: 'medium',
        status: 'active',
        isRead: false,
        relatedAppointmentId: appointment._id
      });
      await patientAlert.save();

      // Notification for doctor
      const doctorAlert = new Alert({
        userId: finalDoctorId,
        alertType: 'appointment_reminder',
        title: 'New Appointment Booked',
        message: `You have a new appointment "${appointment.title}" with ${appointment.patientId.firstName} ${appointment.patientId.lastName} scheduled for ${formattedDate}.`,
        severity: 'medium',
        status: 'active',
        isRead: false,
        relatedAppointmentId: appointment._id
      });
      await doctorAlert.save();

      console.log('Appointment notifications created for patient and doctor');
    } catch (notificationError) {
      console.error('Error creating appointment notifications:', notificationError);
      // Don't fail the appointment creation if notifications fail
    }

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: { appointment }
    });

  } catch (error) {
    console.error('Create appointment error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    res.status(500).json({
      success: false,
      message: 'Server error while creating appointment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   PUT /api/appointments/:id
// @desc    Update appointment
// @access  Private
router.put('/:id', auth, [
  body('title')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('scheduledDate')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date'),
  body('status')
    .optional()
    .isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
    .withMessage('Invalid status'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
], async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find appointment
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check permissions
    // Allow: admin, doctor/provider (if they are the doctorId), or patient (if they are the patientId)
    const isAdmin = req.user.role === 'admin';
    const isDoctorOrProvider = req.user.role === 'doctor' || req.user.role === 'provider';
    const isAppointmentDoctor = isDoctorOrProvider && appointment.doctorId.toString() === req.user._id.toString();
    const isAppointmentPatient = req.user.role === 'patient' && appointment.patientId.toString() === req.user._id.toString();
    
    const canUpdate = isAdmin || isAppointmentDoctor || isAppointmentPatient;

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update appointments where you are the patient, doctor, or admin.'
      });
    }

    // Update appointment
    Object.assign(appointment, updateData);
    await appointment.save();

    // Populate the appointment with user details
    await appointment.populate('patientId', 'firstName lastName email');
    await appointment.populate('doctorId', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: { appointment }
    });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating appointment'
    });
  }
});

// @route   DELETE /api/appointments/:id
// @desc    Delete appointment
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check permissions - allow admin, doctor, or the patient who owns the appointment
    const canDelete = req.user.role === 'admin' || 
                     req.user.role === 'doctor' || 
                     req.user.role === 'provider' ||
                     (req.user.role === 'patient' && appointment.patientId.toString() === req.user._id.toString());

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own appointments or you must be a doctor/admin.'
      });
    }

    await Appointment.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Appointment deleted successfully'
    });

  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting appointment'
    });
  }
});

// @route   GET /api/appointments/upcoming
// @desc    Get upcoming appointments
// @access  Private
router.get('/upcoming', auth, async (req, res) => {
  try {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Build query based on user role
    let query = {
      scheduledDate: { $gte: now, $lte: oneWeekFromNow },
      status: { $in: ['scheduled', 'confirmed'] }
    };
    
    if (req.user.role === 'patient') {
      query.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      query.doctorId = req.user._id;
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'firstName lastName email profile')
      .populate('doctorId', 'firstName lastName email profile')
      .sort({ scheduledDate: 1 })
      .lean();

    res.json({
      success: true,
      data: { appointments }
    });

  } catch (error) {
    console.error('Get upcoming appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching upcoming appointments'
    });
  }
});

module.exports = router;
