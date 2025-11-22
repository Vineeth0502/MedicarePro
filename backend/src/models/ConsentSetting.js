const mongoose = require('mongoose');

const consentSettingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  dataSharing: {
    shareHeartRate: {
      type: Boolean,
      default: true
    },
    shareSleep: {
      type: Boolean,
      default: true
    },
    shareActivity: {
      type: Boolean,
      default: true
    },
    shareGlucose: {
      type: Boolean,
      default: true
    },
    shareWeight: {
      type: Boolean,
      default: true
    },
    shareBloodPressure: {
      type: Boolean,
      default: true
    }
  },
  notifications: {
    receiveAlerts: {
      type: Boolean,
      default: true
    },
    receiveReminders: {
      type: Boolean,
      default: true
    },
    receiveAppointmentReminders: {
      type: Boolean,
      default: true
    },
    receiveMedicationReminders: {
      type: Boolean,
      default: true
    },
    receiveWeeklyReports: {
      type: Boolean,
      default: true
    },
    receiveMarketingEmails: {
      type: Boolean,
      default: false
    }
  },
  research: {
    allowDataForResearch: {
      type: Boolean,
      default: true
    },
    allowAnonymizedData: {
      type: Boolean,
      default: true
    },
    allowContactForResearch: {
      type: Boolean,
      default: false
    }
  },
  thirdParty: {
    allowDataSharing: {
      type: Boolean,
      default: false
    },
    allowDeviceIntegration: {
      type: Boolean,
      default: true
    },
    allowAppIntegration: {
      type: Boolean,
      default: true
    }
  },
  emergency: {
    allowEmergencyAccess: {
      type: Boolean,
      default: true
    },
    emergencyContacts: [{
      name: String,
      phone: String,
      relationship: String,
      isPrimary: Boolean
    }]
  },
  privacy: {
    dataRetentionPeriod: {
      type: Number,
      default: 365, // days
      min: 30,
      max: 2555 // 7 years
    },
    allowDataExport: {
      type: Boolean,
      default: true
    },
    allowDataDeletion: {
      type: Boolean,
      default: true
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  version: {
    type: String,
    default: '1.0'
  }
}, {
  timestamps: true
});

// Index for efficient queries
consentSettingSchema.index({ userId: 1 });

// Method to check if user has given consent for specific data type
consentSettingSchema.methods.hasConsentFor = function(dataType) {
  const dataSharing = this.dataSharing;
  
  switch (dataType) {
    case 'heart_rate':
      return dataSharing.shareHeartRate;
    case 'sleep':
      return dataSharing.shareSleep;
    case 'activity':
      return dataSharing.shareActivity;
    case 'glucose':
      return dataSharing.shareGlucose;
    case 'weight':
      return dataSharing.shareWeight;
    case 'blood_pressure':
      return dataSharing.shareBloodPressure;
    default:
      return false;
  }
};

// Method to check if user wants to receive specific notifications
consentSettingSchema.methods.wantsNotification = function(notificationType) {
  const notifications = this.notifications;
  
  switch (notificationType) {
    case 'alerts':
      return notifications.receiveAlerts;
    case 'reminders':
      return notifications.receiveReminders;
    case 'appointments':
      return notifications.receiveAppointmentReminders;
    case 'medications':
      return notifications.receiveMedicationReminders;
    case 'reports':
      return notifications.receiveWeeklyReports;
    case 'marketing':
      return notifications.receiveMarketingEmails;
    default:
      return false;
  }
};

module.exports = mongoose.model('ConsentSetting', consentSettingSchema);

