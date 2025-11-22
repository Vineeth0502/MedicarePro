const express = require('express');
const { body, query, validationResult } = require('express-validator');
const HealthMetric = require('../models/HealthMetric');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/health-metrics
// @desc    Get health metrics for user
// @access  Private
router.get('/', auth, [
  query('metricType')
    .optional()
    .isIn([
      'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate',
      'steps', 'glucose', 'weight', 'height', 'temperature', 'oxygen_saturation',
      'sleep_duration', 'sleep_quality', 'calories_burned', 'hydration',
      'stress_level', 'mood'
    ])
    .withMessage('Invalid metric type'),
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
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
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
      metricType,
      startDate,
      endDate,
      limit = 100,
      page = 1
    } = req.query;

    // Build query
    const query = { userId: req.user._id, isActive: true };

    if (metricType) {
      query.metricType = metricType;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get metrics
    const metrics = await HealthMetric.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count for pagination
    const total = await HealthMetric.countDocuments(query);

    res.json({
      success: true,
      data: {
        metrics,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get health metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching health metrics'
    });
  }
});

// @route   POST /api/health-metrics
// @desc    Add new health metric
// @access  Private
router.post('/', auth, [
  body('metricType')
    .isIn([
      'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate',
      'steps', 'glucose', 'weight', 'height', 'temperature', 'oxygen_saturation',
      'sleep_duration', 'sleep_quality', 'calories_burned', 'hydration',
      'stress_level', 'mood'
    ])
    .withMessage('Invalid metric type'),
  body('value')
    .isNumeric()
    .withMessage('Value must be a number'),
  body('unit')
    .isIn([
      'mmHg', 'bpm', 'steps', 'mg/dL', 'kg', 'cm', '°C', '°F',
      '%', 'hours', 'minutes', 'calories', 'liters', 'ml',
      'scale_1_10', 'scale_1_5'
    ])
    .withMessage('Invalid unit'),
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('Timestamp must be a valid ISO 8601 date'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),
  body('source')
    .optional()
    .isIn(['manual', 'device', 'app', 'imported'])
    .withMessage('Invalid source')
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
      metricType,
      value,
      unit,
      timestamp,
      notes,
      source = 'manual',
      deviceId
    } = req.body;

    const metric = new HealthMetric({
      userId: req.user._id,
      metricType,
      value: parseFloat(value),
      unit,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      notes,
      source,
      deviceId
    });

    await metric.save();

    res.status(201).json({
      success: true,
      message: 'Health metric added successfully',
      data: { metric }
    });

  } catch (error) {
    console.error('Add health metric error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding health metric'
    });
  }
});

// @route   GET /api/health-metrics/summary
// @desc    Get health metrics summary
// @access  Private
router.get('/summary', auth, [
  query('period')
    .optional()
    .isIn(['day', 'week', 'month', 'year'])
    .withMessage('Invalid period')
], async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get metrics for the period
    const metrics = await HealthMetric.find({
      userId: req.user._id,
      isActive: true,
      timestamp: { $gte: startDate, $lte: now }
    }).lean();

    // Group by metric type and calculate statistics
    const summary = {};
    
    metrics.forEach(metric => {
      if (!summary[metric.metricType]) {
        summary[metric.metricType] = {
          values: [],
          unit: metric.unit,
          count: 0
        };
      }
      
      summary[metric.metricType].values.push(metric.value);
      summary[metric.metricType].count++;
    });

    // Calculate statistics for each metric type
    Object.keys(summary).forEach(metricType => {
      const values = summary[metricType].values;
      const sortedValues = values.sort((a, b) => a - b);
      
      summary[metricType] = {
        count: values.length,
        unit: summary[metricType].unit,
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        median: sortedValues[Math.floor(sortedValues.length / 2)],
        latest: values[values.length - 1],
        trend: values.length > 1 ? 
          (values[values.length - 1] - values[0]) / values.length : 0
      };
    });

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        summary
      }
    });

  } catch (error) {
    console.error('Get health metrics summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching health metrics summary'
    });
  }
});

// @route   PUT /api/health-metrics/:id
// @desc    Update health metric
// @access  Private
router.put('/:id', auth, [
  body('value')
    .optional()
    .isNumeric()
    .withMessage('Value must be a number'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { value, notes } = req.body;

    const metric = await HealthMetric.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!metric) {
      return res.status(404).json({
        success: false,
        message: 'Health metric not found'
      });
    }

    if (value !== undefined) metric.value = parseFloat(value);
    if (notes !== undefined) metric.notes = notes;

    await metric.save();

    res.json({
      success: true,
      message: 'Health metric updated successfully',
      data: { metric }
    });

  } catch (error) {
    console.error('Update health metric error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating health metric'
    });
  }
});

// @route   DELETE /api/health-metrics/:id
// @desc    Delete health metric
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const metric = await HealthMetric.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!metric) {
      return res.status(404).json({
        success: false,
        message: 'Health metric not found'
      });
    }

    // Soft delete
    metric.isActive = false;
    await metric.save();

    res.json({
      success: true,
      message: 'Health metric deleted successfully'
    });

  } catch (error) {
    console.error('Delete health metric error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting health metric'
    });
  }
});

// @route   GET /api/health-metrics/patient/:patientId
// @desc    Get health metrics for a specific patient (Provider only)
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
    const { metricType, limit, startDate, endDate } = req.query; // No default limit - get all if not specified

    // Build query
    const query = { userId: patientId, isActive: true };

    if (metricType) {
      query.metricType = metricType;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Get metrics - apply limit only if specified
    let metricsQuery = HealthMetric.find(query).sort({ timestamp: -1 });
    if (limit) {
      metricsQuery = metricsQuery.limit(parseInt(limit));
    }
    const metrics = await metricsQuery.lean();

    res.json({
      success: true,
      data: { metrics }
    });

  } catch (error) {
    console.error('Get patient metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching patient metrics'
    });
  }
});

// @route   GET /api/health-metrics/hospital/overview
// @desc    Get hospital-wide health metrics overview (Provider/Doctor/Admin only)
// @access  Private (Provider/Doctor/Admin only)
router.get('/hospital/overview', auth, [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('period')
    .optional()
    .isIn(['day', 'week', 'month', 'year'])
    .withMessage('Invalid period')
], async (req, res) => {
  try {
    // Check if user is provider/doctor/admin
    if (!['provider', 'doctor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Provider access required.'
      });
    }

    const { startDate, endDate, period = 'day' } = req.query;
    const User = require('../models/User');
    
    // Calculate date range
    const now = new Date();
    let startDateFilter;
    
    if (startDate) {
      startDateFilter = new Date(startDate);
    } else {
      switch (period) {
        case 'day':
          startDateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
    }
    
    const endDateFilter = endDate ? new Date(endDate) : now;

    // Get all patients - SIMPLE
    const patients = await User.find({ role: 'patient', isActive: true })
      .select('_id firstName lastName email')
      .lean();
    
    const patientIds = patients.map(p => p._id);
    const totalPatients = patients.length;

    // Get latest metrics for each patient - SIMPLE AGGREGATION
    let latestMetrics = [];
    if (patientIds.length > 0) {
      try {
        // First, check if we have any metrics at all
        const totalMetricsCount = await HealthMetric.countDocuments({ 
          userId: { $in: patientIds },
          isActive: true 
        });
        console.log(`[Hospital Overview] Total metrics found for ${patientIds.length} patients: ${totalMetricsCount}`);
        
        if (totalMetricsCount === 0) {
          console.log('[Hospital Overview] No metrics found in database for these patients');
          latestMetrics = [];
        } else {
          latestMetrics = await HealthMetric.aggregate([
            {
              $match: {
                userId: { $in: patientIds },
                isActive: true
              }
            },
            {
              $sort: { timestamp: -1 }
            },
            {
              $group: {
                _id: { 
                  userId: '$userId', 
                  metricType: '$metricType' 
                },
                value: { $first: '$value' },
                unit: { $first: '$unit' }
              }
            }
          ], {
            maxTimeMS: 10000,
            allowDiskUse: true
          });
          
          console.log(`[Hospital Overview] Found ${latestMetrics.length} latest metrics (unique patient+metric combinations)`);
          if (latestMetrics.length > 0) {
            console.log('[Hospital Overview] Sample metric:', {
              userId: latestMetrics[0]._id.userId?.toString(),
              metricType: latestMetrics[0]._id.metricType,
              value: latestMetrics[0].value
            });
          }
        }
      } catch (aggError) {
        console.error('Aggregation error:', aggError);
        console.error('Error details:', aggError.message, aggError.stack);
        // Continue with empty array
        latestMetrics = [];
      }
    } else {
      console.log('No patient IDs found');
    }

    // Calculate patient health status - SIMPLE
    const patientHealthStatus = {};
    const statusCounts = { healthy: 0, monitoring: 0, warning: 0, critical: 0, no_data: 0 };
    
    // Create a map for faster lookup
    const metricsByPatient = {};
    latestMetrics.forEach(metric => {
      if (!metric || !metric._id || !metric._id.userId) return;
      const userIdStr = metric._id.userId.toString();
      if (!metricsByPatient[userIdStr]) {
        metricsByPatient[userIdStr] = {};
      }
      if (metric._id.metricType && metric.value !== undefined && metric.value !== null) {
        metricsByPatient[userIdStr][metric._id.metricType] = metric.value;
      }
    });
    
    console.log(`[Hospital Overview] Metrics map created with ${Object.keys(metricsByPatient).length} patients`);
    if (Object.keys(metricsByPatient).length > 0) {
      const firstPatientId = Object.keys(metricsByPatient)[0];
      console.log(`[Hospital Overview] Sample patient ${firstPatientId} has metrics:`, Object.keys(metricsByPatient[firstPatientId]));
    }
    
    patients.forEach(patient => {
      const patientIdStr = patient._id.toString();
      const patientMetrics = metricsByPatient[patientIdStr] || {};

      if (Object.keys(patientMetrics).length === 0) {
        patientHealthStatus[patientIdStr] = { status: 'no_data', metricsCount: 0 };
        statusCounts.no_data++;
        return;
      }

      let abnormalCount = 0;
      let criticalCount = 0;
      let totalMetrics = 0;

      Object.keys(patientMetrics).forEach(metricType => {
        const value = patientMetrics[metricType];
        totalMetrics++;
        const range = getNormalRange(metricType);
        if (range) {
          if (range.criticalMin !== undefined && value < range.criticalMin) {
            criticalCount++;
          } else if (range.criticalMax !== undefined && value > range.criticalMax) {
            criticalCount++;
          } else if (value < range.min || value > range.max) {
            abnormalCount++;
          }
        }
      });

      let status = 'healthy';
      if (criticalCount > 0) status = 'critical';
      else if (abnormalCount > 2) status = 'warning';
      else if (abnormalCount > 0) status = 'monitoring';

      patientHealthStatus[patientIdStr] = {
        status,
        metricsCount: totalMetrics,
        abnormalCount,
        criticalCount
      };
      statusCounts[status]++;
    });

    // Enhanced metric summary with time series data - OPTIMIZED
    const summary = {};
    const allMetricTypes = ['heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'temperature', 'glucose', 'oxygen_saturation', 'steps', 'calories_burned', 'weight', 'height', 'sleep_duration', 'sleep_quality', 'hydration', 'stress_level', 'mood'];
    
    // Get time series data for the selected period - USE AGGREGATION FOR PERFORMANCE
    const timeSeriesData = {};
    let daysBack = 7;
    if (period === 'day') daysBack = 1;
    else if (period === 'week') daysBack = 7;
    else if (period === 'month') daysBack = 30;
    else if (period === 'year') daysBack = 365;
    
    // Use aggregation to efficiently group by date and metric type
    if (patientIds.length > 0) {
      try {
        const timeSeriesStartDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
        const timeSeriesAggregation = await HealthMetric.aggregate([
          {
            $match: {
              userId: { $in: patientIds },
              isActive: true,
              timestamp: { $gte: timeSeriesStartDate }
            }
          },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                metricType: '$metricType'
              },
              avg: { $avg: '$value' },
              min: { $min: '$value' },
              max: { $max: '$value' },
              count: { $sum: 1 }
            }
          }
        ], {
          maxTimeMS: 15000,
          allowDiskUse: true
        });
        
        // Build timeSeriesData object from aggregation results
        for (const result of timeSeriesAggregation) {
          if (!result._id || !result._id.date || !result._id.metricType) continue;
          const dateKey = result._id.date;
          const metricType = result._id.metricType;
          if (!timeSeriesData[dateKey]) {
            timeSeriesData[dateKey] = {};
          }
          timeSeriesData[dateKey][metricType] = {
            avg: result.avg || 0,
            min: result.min || 0,
            max: result.max || 0,
            count: result.count || 0
          };
        }
      } catch (tsError) {
        console.error('[Hospital Overview] Time series aggregation error:', tsError);
        // Continue without time series data
      }
    }
    
    // Process each metric type
    for (const metricType of allMetricTypes) {
      const typeMetrics = latestMetrics.filter(m => 
        m && m._id && m._id.metricType === metricType && typeof m.value === 'number'
      );
      if (typeMetrics.length > 0) {
        const values = typeMetrics.map(m => m.value).filter(v => typeof v === 'number' && !isNaN(v));
        if (values.length > 0) {
          const sortedValues = [...values].sort((a, b) => a - b);
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          
          // Build time series from pre-aggregated data
          const timeSeries = {};
          for (const dateKey in timeSeriesData) {
            if (timeSeriesData[dateKey][metricType]) {
              timeSeries[dateKey] = timeSeriesData[dateKey][metricType];
            }
          }
          
          summary[metricType] = {
            unit: typeMetrics[0].unit || '',
            count: values.length,
            patientCount: new Set(typeMetrics.map(m => m._id.userId.toString())).size,
            average: mean,
            min: Math.min(...values),
            max: Math.max(...values),
            median: sortedValues[Math.floor(sortedValues.length / 2)] || 0,
            p25: sortedValues[Math.floor(sortedValues.length * 0.25)] || 0,
            p75: sortedValues[Math.floor(sortedValues.length * 0.75)] || 0,
            stdDev: calculateStdDev(values, mean),
            timeSeries: timeSeries
          };
        }
      }
    }

    const patientsWithMetrics = Object.keys(patientHealthStatus).filter(
      id => patientHealthStatus[id].status !== 'no_data'
    ).length;

    res.json({
      success: true,
      data: {
        period,
        startDate: startDateFilter,
        endDate: endDateFilter,
        totalPatients,
        patientsWithMetrics,
        metricSummary: summary,
        patientHealthStatus,
        statusCounts,
        patients: patients.map(p => ({
          _id: p._id,
          name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email,
          email: p.email,
          healthStatus: patientHealthStatus[p._id.toString()] || { status: 'no_data', metricsCount: 0 }
        }))
      }
    });

  } catch (error) {
    console.error('Get hospital overview error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching hospital overview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to format date
function formatDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Helper function to calculate standard deviation
function calculateStdDev(values, mean) {
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

// Helper function to get normal ranges
function getNormalRange(metricType) {
  const ranges = {
    blood_pressure_systolic: { min: 90, max: 120, criticalMin: 70, criticalMax: 180 },
    blood_pressure_diastolic: { min: 60, max: 80, criticalMin: 40, criticalMax: 120 },
    heart_rate: { min: 60, max: 100, criticalMin: 40, criticalMax: 150 },
    temperature: { min: 36.1, max: 37.2, criticalMin: 35, criticalMax: 38.5 },
    oxygen_saturation: { min: 95, max: 100, criticalMin: 90, criticalMax: 100 },
    glucose: { min: 70, max: 100, criticalMin: 50, criticalMax: 200 },
    sleep_duration: { min: 7, max: 9, criticalMin: 4, criticalMax: 12 },
    sleep_quality: { min: 6, max: 10, criticalMin: 1, criticalMax: 10 },
    hydration: { min: 1.5, max: 4, criticalMin: 0.5, criticalMax: 6 },
    stress_level: { min: 1, max: 5, criticalMin: 1, criticalMax: 10 },
    mood: { min: 3, max: 5, criticalMin: 1, criticalMax: 5 },
  };
  return ranges[metricType] || null;
}

module.exports = router;
