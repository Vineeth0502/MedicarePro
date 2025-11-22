const express = require('express');
const { body, validationResult } = require('express-validator');
const ConsentSetting = require('../models/ConsentSetting');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/consent
// @desc    Get user consent settings
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let consentSettings = await ConsentSetting.findOne({ userId: req.user._id });

    // Create default consent settings if none exist
    if (!consentSettings) {
      consentSettings = new ConsentSetting({
        userId: req.user._id
      });
      await consentSettings.save();
    }

    res.json({
      success: true,
      data: { consentSettings }
    });

  } catch (error) {
    console.error('Get consent settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching consent settings'
    });
  }
});

// @route   PUT /api/consent
// @desc    Update user consent settings
// @access  Private
router.put('/', auth, [
  body('dataSharing.shareHeartRate')
    .optional()
    .isBoolean()
    .withMessage('shareHeartRate must be a boolean'),
  body('dataSharing.shareSleep')
    .optional()
    .isBoolean()
    .withMessage('shareSleep must be a boolean'),
  body('dataSharing.shareActivity')
    .optional()
    .isBoolean()
    .withMessage('shareActivity must be a boolean'),
  body('dataSharing.shareGlucose')
    .optional()
    .isBoolean()
    .withMessage('shareGlucose must be a boolean'),
  body('dataSharing.shareWeight')
    .optional()
    .isBoolean()
    .withMessage('shareWeight must be a boolean'),
  body('dataSharing.shareBloodPressure')
    .optional()
    .isBoolean()
    .withMessage('shareBloodPressure must be a boolean'),
  body('notifications.receiveAlerts')
    .optional()
    .isBoolean()
    .withMessage('receiveAlerts must be a boolean'),
  body('notifications.receiveReminders')
    .optional()
    .isBoolean()
    .withMessage('receiveReminders must be a boolean'),
  body('notifications.receiveAppointmentReminders')
    .optional()
    .isBoolean()
    .withMessage('receiveAppointmentReminders must be a boolean'),
  body('notifications.receiveMedicationReminders')
    .optional()
    .isBoolean()
    .withMessage('receiveMedicationReminders must be a boolean'),
  body('notifications.receiveWeeklyReports')
    .optional()
    .isBoolean()
    .withMessage('receiveWeeklyReports must be a boolean'),
  body('notifications.receiveMarketingEmails')
    .optional()
    .isBoolean()
    .withMessage('receiveMarketingEmails must be a boolean'),
  body('research.allowDataForResearch')
    .optional()
    .isBoolean()
    .withMessage('allowDataForResearch must be a boolean'),
  body('research.allowAnonymizedData')
    .optional()
    .isBoolean()
    .withMessage('allowAnonymizedData must be a boolean'),
  body('research.allowContactForResearch')
    .optional()
    .isBoolean()
    .withMessage('allowContactForResearch must be a boolean'),
  body('thirdParty.allowDataSharing')
    .optional()
    .isBoolean()
    .withMessage('allowDataSharing must be a boolean'),
  body('thirdParty.allowDeviceIntegration')
    .optional()
    .isBoolean()
    .withMessage('allowDeviceIntegration must be a boolean'),
  body('thirdParty.allowAppIntegration')
    .optional()
    .isBoolean()
    .withMessage('allowAppIntegration must be a boolean'),
  body('emergency.allowEmergencyAccess')
    .optional()
    .isBoolean()
    .withMessage('allowEmergencyAccess must be a boolean'),
  body('privacy.dataRetentionPeriod')
    .optional()
    .isInt({ min: 30, max: 2555 })
    .withMessage('dataRetentionPeriod must be between 30 and 2555 days'),
  body('privacy.allowDataExport')
    .optional()
    .isBoolean()
    .withMessage('allowDataExport must be a boolean'),
  body('privacy.allowDataDeletion')
    .optional()
    .isBoolean()
    .withMessage('allowDataDeletion must be a boolean')
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
    updateData.lastUpdated = new Date();

    const consentSettings = await ConsentSetting.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateData },
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      message: 'Consent settings updated successfully',
      data: { consentSettings }
    });

  } catch (error) {
    console.error('Update consent settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating consent settings'
    });
  }
});

// @route   POST /api/consent/emergency-contacts
// @desc    Add emergency contact
// @access  Private
router.post('/emergency-contacts', auth, [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('phone')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('relationship')
    .isLength({ min: 1, max: 50 })
    .withMessage('Relationship must be between 1 and 50 characters'),
  body('isPrimary')
    .optional()
    .isBoolean()
    .withMessage('isPrimary must be a boolean')
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

    const { name, phone, relationship, isPrimary = false } = req.body;

    let consentSettings = await ConsentSetting.findOne({ userId: req.user._id });

    if (!consentSettings) {
      consentSettings = new ConsentSetting({ userId: req.user._id });
    }

    // If this is the primary contact, remove primary from others
    if (isPrimary) {
      consentSettings.emergency.emergencyContacts.forEach(contact => {
        contact.isPrimary = false;
      });
    }

    consentSettings.emergency.emergencyContacts.push({
      name,
      phone,
      relationship,
      isPrimary
    });

    await consentSettings.save();

    res.json({
      success: true,
      message: 'Emergency contact added successfully',
      data: { consentSettings }
    });

  } catch (error) {
    console.error('Add emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding emergency contact'
    });
  }
});

// @route   DELETE /api/consent/emergency-contacts/:contactId
// @desc    Remove emergency contact
// @access  Private
router.delete('/emergency-contacts/:contactId', auth, async (req, res) => {
  try {
    const { contactId } = req.params;

    const consentSettings = await ConsentSetting.findOne({ userId: req.user._id });

    if (!consentSettings) {
      return res.status(404).json({
        success: false,
        message: 'Consent settings not found'
      });
    }

    consentSettings.emergency.emergencyContacts = consentSettings.emergency.emergencyContacts.filter(
      contact => contact._id.toString() !== contactId
    );

    await consentSettings.save();

    res.json({
      success: true,
      message: 'Emergency contact removed successfully',
      data: { consentSettings }
    });

  } catch (error) {
    console.error('Remove emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing emergency contact'
    });
  }
});

// @route   GET /api/consent/check/:dataType
// @desc    Check if user has consent for specific data type
// @access  Private
router.get('/check/:dataType', auth, async (req, res) => {
  try {
    const { dataType } = req.params;

    const consentSettings = await ConsentSetting.findOne({ userId: req.user._id });

    if (!consentSettings) {
      return res.json({
        success: true,
        data: { hasConsent: false }
      });
    }

    const hasConsent = consentSettings.hasConsentFor(dataType);

    res.json({
      success: true,
      data: { hasConsent }
    });

  } catch (error) {
    console.error('Check consent error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking consent'
    });
  }
});

// @route   GET /api/consent/notification/:notificationType
// @desc    Check if user wants to receive specific notifications
// @access  Private
router.get('/notification/:notificationType', auth, async (req, res) => {
  try {
    const { notificationType } = req.params;

    const consentSettings = await ConsentSetting.findOne({ userId: req.user._id });

    if (!consentSettings) {
      return res.json({
        success: true,
        data: { wantsNotification: false }
      });
    }

    const wantsNotification = consentSettings.wantsNotification(notificationType);

    res.json({
      success: true,
      data: { wantsNotification }
    });

  } catch (error) {
    console.error('Check notification consent error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking notification consent'
    });
  }
});

module.exports = router;
