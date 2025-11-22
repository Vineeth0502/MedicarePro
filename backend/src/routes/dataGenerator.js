const express = require('express');
const HealthMetric = require('../models/HealthMetric');
const Alert = require('../models/Alert');
const { auth } = require('../middleware/auth');
const router = express.Router();

// @route   POST /api/data-generator/health-metrics
// @desc    Generate sample health metrics for testing (simulates real-time device data)
// @access  Private
router.post('/health-metrics', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { count = 10, metricTypes = ['heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'steps', 'glucose'] } = req.body;

    const metrics = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000)); // Each metric 1 hour apart
      
      metricTypes.forEach(metricType => {
        let value, unit;
        
        switch (metricType) {
          case 'heart_rate':
            value = Math.floor(Math.random() * 40) + 60; // 60-100 bpm
            unit = 'bpm';
            break;
          case 'blood_pressure_systolic':
            value = Math.floor(Math.random() * 40) + 110; // 110-150 mmHg
            unit = 'mmHg';
            break;
          case 'blood_pressure_diastolic':
            value = Math.floor(Math.random() * 20) + 70; // 70-90 mmHg
            unit = 'mmHg';
            break;
          case 'steps':
            value = Math.floor(Math.random() * 5000) + 3000; // 3000-8000 steps
            unit = 'steps';
            break;
          case 'glucose':
            value = Math.floor(Math.random() * 60) + 80; // 80-140 mg/dL
            unit = 'mg/dL';
            break;
          case 'weight':
            value = Math.floor(Math.random() * 20) + 70; // 70-90 kg
            unit = 'kg';
            break;
          case 'sleep_duration':
            value = (Math.random() * 3 + 6).toFixed(1); // 6-9 hours
            unit = 'hours';
            break;
          case 'calories_burned':
            value = Math.floor(Math.random() * 1000) + 1500; // 1500-2500 calories
            unit = 'calories';
            break;
          default:
            value = Math.random() * 100;
            unit = 'units';
        }

        metrics.push({
          userId,
          metricType,
          value: parseFloat(value),
          unit,
          timestamp,
          source: 'device',
          isActive: true
        });
      });
    }

    // Insert metrics
    const insertedMetrics = await HealthMetric.insertMany(metrics);

    // Check for alerts based on metrics
    const alerts = [];
    insertedMetrics.forEach(metric => {
      if (metric.metricType === 'heart_rate' && metric.value > 100) {
        alerts.push({
          userId,
          alertType: 'elevated_heart_rate',
          title: 'Elevated Heart Rate',
          message: `Heart rate of ${metric.value} bpm detected`,
          severity: metric.value > 120 ? 'high' : 'medium',
          status: 'active',
          relatedMetricId: metric._id,
          triggeredAt: metric.timestamp
        });
      }
      if (metric.metricType === 'blood_pressure_systolic' && metric.value > 140) {
        alerts.push({
          userId,
          alertType: 'high_blood_pressure',
          title: 'High Blood Pressure',
          message: `Systolic BP of ${metric.value} mmHg detected`,
          severity: 'high',
          status: 'active',
          relatedMetricId: metric._id,
          triggeredAt: metric.timestamp
        });
      }
      if (metric.metricType === 'glucose' && metric.value > 140) {
        alerts.push({
          userId,
          alertType: 'high_glucose',
          title: 'High Glucose Level',
          message: `Glucose level of ${metric.value} mg/dL detected`,
          severity: 'high',
          status: 'active',
          relatedMetricId: metric._id,
          triggeredAt: metric.timestamp
        });
      }
    });

    if (alerts.length > 0) {
      await Alert.insertMany(alerts);
    }

    res.json({
      success: true,
      message: `Generated ${insertedMetrics.length} health metrics and ${alerts.length} alerts`,
      data: {
        metrics: insertedMetrics.length,
        alerts: alerts.length
      }
    });

  } catch (error) {
    console.error('Data generator error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating health metrics',
      error: error.message
    });
  }
});

// @route   POST /api/data-generator/simulate-device
// @desc    Simulate a health device sending real-time data
// @access  Private
router.post('/simulate-device', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { deviceType = 'fitness_tracker' } = req.body;

    const now = new Date();
    const metrics = [];

    // Simulate different device types
    if (deviceType === 'fitness_tracker' || deviceType === 'all') {
      metrics.push({
        userId,
        metricType: 'heart_rate',
        value: Math.floor(Math.random() * 40) + 60,
        unit: 'bpm',
        timestamp: now,
        source: 'device',
        isActive: true
      });

      metrics.push({
        userId,
        metricType: 'steps',
        value: Math.floor(Math.random() * 2000) + 1000,
        unit: 'steps',
        timestamp: now,
        source: 'device',
        isActive: true
      });

      metrics.push({
        userId,
        metricType: 'calories_burned',
        value: Math.floor(Math.random() * 500) + 200,
        unit: 'calories',
        timestamp: now,
        source: 'device',
        isActive: true
      });
    }

    if (deviceType === 'blood_pressure_monitor' || deviceType === 'all') {
      metrics.push({
        userId,
        metricType: 'blood_pressure_systolic',
        value: Math.floor(Math.random() * 40) + 110,
        unit: 'mmHg',
        timestamp: now,
        source: 'device',
        isActive: true
      });

      metrics.push({
        userId,
        metricType: 'blood_pressure_diastolic',
        value: Math.floor(Math.random() * 20) + 70,
        unit: 'mmHg',
        timestamp: now,
        source: 'device',
        isActive: true
      });
    }

    if (deviceType === 'glucose_meter' || deviceType === 'all') {
      metrics.push({
        userId,
        metricType: 'glucose',
        value: Math.floor(Math.random() * 60) + 80,
        unit: 'mg/dL',
        timestamp: now,
        source: 'device',
        isActive: true
      });
    }

    // Check if we have any metrics to insert
    if (metrics.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No metrics generated. Invalid device type or configuration.'
      });
    }

    // Insert metrics
    const insertedMetrics = await HealthMetric.insertMany(metrics);

    // Check for alerts
    const alerts = [];
    insertedMetrics.forEach(metric => {
      if (metric.metricType === 'heart_rate' && metric.value > 100) {
        alerts.push({
          userId,
          alertType: 'elevated_heart_rate',
          title: 'Elevated Heart Rate Detected',
          message: `Heart rate of ${metric.value} bpm is above normal range`,
          severity: metric.value > 120 ? 'high' : 'medium',
          status: 'active',
          relatedMetricId: metric._id,
          triggeredAt: now
        });
      }
      if (metric.metricType === 'blood_pressure_systolic' && metric.value > 140) {
        alerts.push({
          userId,
          alertType: 'high_blood_pressure',
          title: 'High Blood Pressure Alert',
          message: `Systolic BP of ${metric.value} mmHg detected`,
          severity: 'high',
          status: 'active',
          relatedMetricId: metric._id,
          triggeredAt: now
        });
      }
      if (metric.metricType === 'glucose' && metric.value > 140) {
        alerts.push({
          userId,
          alertType: 'high_glucose',
          title: 'High Glucose Alert',
          message: `Glucose level of ${metric.value} mg/dL is elevated`,
          severity: 'high',
          status: 'active',
          relatedMetricId: metric._id,
          triggeredAt: now
        });
      }
    });

    if (alerts.length > 0) {
      await Alert.insertMany(alerts);
    }

    res.json({
      success: true,
      message: 'Device data simulated successfully',
      data: {
        metrics: insertedMetrics,
        alerts: alerts.length,
        timestamp: now
      }
    });

  } catch (error) {
    console.error('Device simulation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error simulating device data',
      error: error.message
    });
  }
});

module.exports = router;

