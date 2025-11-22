const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  appointmentType: {
    type: String,
    enum: [
      'consultation',
      'checkup',
      'follow_up',
      'emergency',
      'surgery',
      'therapy',
      'diagnostic',
      'vaccination'
    ],
    default: 'consultation'
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    default: 30, // minutes
    min: 15,
    max: 480
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled'
  },
  location: {
    type: {
      type: String,
      enum: ['in_person', 'virtual', 'phone'],
      default: 'in_person'
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    room: String,
    virtualLink: String
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push', 'call']
    },
    scheduledFor: Date,
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  followUp: {
    required: {
      type: Boolean,
      default: false
    },
    scheduledDate: Date,
    notes: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
appointmentSchema.index({ patientId: 1, scheduledDate: 1 });
appointmentSchema.index({ doctorId: 1, scheduledDate: 1 });
appointmentSchema.index({ status: 1, scheduledDate: 1 });

// Virtual for appointment duration in hours
appointmentSchema.virtual('durationHours').get(function() {
  return this.duration / 60;
});

// Virtual for time until appointment
appointmentSchema.virtual('timeUntilAppointment').get(function() {
  const now = new Date();
  const diff = this.scheduledDate - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return 'Now';
});

// Method to check if appointment is upcoming
appointmentSchema.methods.isUpcoming = function() {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  return this.scheduledDate > now && this.scheduledDate <= oneHourFromNow;
};

// Method to check if appointment is overdue
appointmentSchema.methods.isOverdue = function() {
  const now = new Date();
  return this.scheduledDate < now && this.status === 'scheduled';
};

module.exports = mongoose.model('Appointment', appointmentSchema);

