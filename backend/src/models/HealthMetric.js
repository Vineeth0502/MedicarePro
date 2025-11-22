const mongoose = require('mongoose');

const healthMetricSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metricType: {
    type: String,
    required: true,
    enum: [
      'blood_pressure_systolic',
      'blood_pressure_diastolic',
      'heart_rate',
      'steps',
      'glucose',
      'weight',
      'height',
      'temperature',
      'oxygen_saturation',
      'sleep_duration',
      'sleep_quality',
      'calories_burned',
      'hydration',
      'stress_level',
      'mood'
    ]
  },
  value: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true,
    enum: [
      'mmHg', 'bpm', 'steps', 'mg/dL', 'kg', 'cm', '°C', '°F', 
      '%', 'hours', 'minutes', 'calories', 'liters', 'ml', 
      'scale_1_10', 'scale_1_5'
    ]
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: 500
  },
  source: {
    type: String,
    enum: ['manual', 'device', 'app', 'imported'],
    default: 'manual'
  },
  deviceId: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
healthMetricSchema.index({ userId: 1, metricType: 1, timestamp: -1 });
healthMetricSchema.index({ userId: 1, timestamp: -1 });

// Virtual for formatted value
healthMetricSchema.virtual('formattedValue').get(function() {
  return `${this.value} ${this.unit}`;
});

module.exports = mongoose.model('HealthMetric', healthMetricSchema);

