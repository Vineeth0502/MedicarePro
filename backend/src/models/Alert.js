const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  alertType: {
    type: String,
    required: true,
    enum: [
      'elevated_heart_rate',
      'high_blood_pressure',
      'low_blood_pressure',
      'irregular_sleep',
      'low_activity',
      'high_glucose',
      'low_glucose',
      'medication_reminder',
      'appointment_reminder',
      'checkup_due',
      'emergency',
      'device_offline',
      'data_sync_issue'
    ]
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'dismissed'],
    default: 'active'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  triggeredAt: {
    type: Date,
    default: Date.now
  },
  acknowledgedAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  relatedMetricId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HealthMetric'
  },
  relatedAppointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  metadata: {
    threshold: Number,
    actualValue: Number,
    unit: String,
    deviceId: String,
    location: {
      type: String,
      coordinates: [Number] // [longitude, latitude]
    }
  },
  actions: [{
    type: {
      type: String,
      enum: ['acknowledge', 'dismiss', 'resolve', 'escalate']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    notes: String
  }]
}, {
  timestamps: true
});

// Index for efficient queries
alertSchema.index({ userId: 1, status: 1, triggeredAt: -1 });
alertSchema.index({ userId: 1, isRead: 1, triggeredAt: -1 });
alertSchema.index({ alertType: 1, severity: 1 });

// Virtual for time since triggered
alertSchema.virtual('timeSinceTriggered').get(function() {
  const now = new Date();
  const diff = now - this.triggeredAt;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
});

module.exports = mongoose.model('Alert', alertSchema);

