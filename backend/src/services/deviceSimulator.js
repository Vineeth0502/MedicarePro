const HealthMetric = require('../models/HealthMetric');
const Alert = require('../models/Alert');
const User = require('../models/User');

// Normal ranges for health metrics
const NORMAL_RANGES = {
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

// Determine patient health status group based on index
// Target distribution: 12 healthy, 8 warning, 6 critical (for 26 patients)
const getPatientHealthGroup = (patientIndex, totalPatients) => {
  // Calculate target counts with slight variation
  const healthyTarget = Math.round(totalPatients * 0.46); // ~12/26
  const warningTarget = Math.round(totalPatients * 0.31); // ~8/26
  const criticalTarget = totalPatients - healthyTarget - warningTarget; // Remaining
  
  if (patientIndex < healthyTarget) {
    return 'healthy';
  } else if (patientIndex < healthyTarget + warningTarget) {
    return 'warning';
  } else {
    return 'critical';
  }
};

// Patient baseline profiles - each patient has unique characteristics based on health group
const getPatientBaseline = (patientId, patientIndex, totalPatients) => {
  // Create unique baseline for each patient based on their ID
  const seed = patientId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = (min, max) => {
    const x = Math.sin(seed + patientIndex) * 10000;
    return min + (x - Math.floor(x)) * (max - min);
  };

  const healthGroup = getPatientHealthGroup(patientIndex, totalPatients);

  // Healthy patients - all metrics within normal range
  if (healthGroup === 'healthy') {
    return {
      heart_rate: { base: 70, variance: 8 }, // 62-78 (normal: 60-100)
      blood_pressure_systolic: { base: 110, variance: 8 }, // 102-118 (normal: 90-120)
      blood_pressure_diastolic: { base: 70, variance: 5 }, // 65-75 (normal: 60-80)
      steps: { base: 8000, variance: 2000 },
      glucose: { base: 85, variance: 10 }, // 75-95 (normal: 70-100)
      temperature: { base: 36.6, variance: 0.3 }, // 36.3-36.9 (normal: 36.1-37.2)
      oxygen_saturation: { base: 98, variance: 1 }, // 97-99 (normal: 95-100)
      sleep_duration: { base: 7.5, variance: 0.5 }, // 7-8 (normal: 7-9)
      sleep_quality: { base: 8, variance: 1 }, // 7-9 (normal: 6-10)
      hydration: { base: 2.5, variance: 0.4 }, // 2.1-2.9 (normal: 1.5-4)
      stress_level: { base: 2.5, variance: 1 }, // 1.5-3.5 (normal: 1-5)
      mood: { base: 4, variance: 0.5 }, // 3.5-4.5 (normal: 3-5)
      calories_burned: { base: 2200, variance: 300 },
    };
  }
  
  // Warning patients - 3+ metrics outside normal range (but not critical)
  if (healthGroup === 'warning') {
    return {
      heart_rate: { base: 85, variance: 10 }, // 75-95 (slightly high but normal)
      blood_pressure_systolic: { base: 125, variance: 10 }, // 115-135 (slightly high: normal max is 120)
      blood_pressure_diastolic: { base: 82, variance: 6 }, // 76-88 (slightly high: normal max is 80)
      steps: { base: 4000, variance: 1500 }, // Low activity
      glucose: { base: 105, variance: 12 }, // 93-117 (slightly high: normal max is 100)
      temperature: { base: 36.7, variance: 0.3 },
      oxygen_saturation: { base: 96, variance: 1.5 }, // 94.5-97.5 (slightly low: normal min is 95)
      sleep_duration: { base: 6.0, variance: 0.8 }, // 5.2-6.8 (low: normal min is 7)
      sleep_quality: { base: 5.5, variance: 1.5 }, // 4-7 (low: normal min is 6)
      hydration: { base: 1.8, variance: 0.4 }, // 1.4-2.2 (low: normal min is 1.5)
      stress_level: { base: 6, variance: 1.5 }, // 4.5-7.5 (high: normal max is 5)
      mood: { base: 2.5, variance: 0.8 }, // 1.7-3.3 (low: normal min is 3)
      calories_burned: { base: 1500, variance: 250 },
    };
  }
  
  // Critical patients - at least 1 metric in critical range
  if (healthGroup === 'critical') {
    // Vary which metric is critical for different critical patients
    const criticalMetricType = patientIndex % 4; // Rotate between different critical conditions
    
    if (criticalMetricType === 0) {
      // High blood pressure critical
      return {
        heart_rate: { base: 95, variance: 10 },
        blood_pressure_systolic: { base: 165, variance: 10 }, // 155-175 (critical: >180, but close)
        blood_pressure_diastolic: { base: 105, variance: 8 }, // 97-113 (critical: >120, but close)
        steps: { base: 2000, variance: 1000 },
        glucose: { base: 180, variance: 15 }, // 165-195 (critical: >200, but close)
        temperature: { base: 37.8, variance: 0.4 }, // 37.4-38.2 (critical: >38.5, but close)
        oxygen_saturation: { base: 92, variance: 2 }, // 90-94 (critical: <90, but close)
        sleep_duration: { base: 4.5, variance: 1.0 }, // 3.5-5.5 (critical: <4, but close)
        sleep_quality: { base: 3, variance: 1.5 },
        hydration: { base: 1.2, variance: 0.4 }, // 0.8-1.6 (critical: <0.5, but close)
        stress_level: { base: 8, variance: 1.5 },
        mood: { base: 2, variance: 0.8 },
        calories_burned: { base: 1200, variance: 200 },
      };
    } else if (criticalMetricType === 1) {
      // High heart rate critical
      return {
        heart_rate: { base: 140, variance: 10 }, // 130-150 (critical: >150, but close)
        blood_pressure_systolic: { base: 145, variance: 12 },
        blood_pressure_diastolic: { base: 95, variance: 8 },
        steps: { base: 3000, variance: 1500 },
        glucose: { base: 160, variance: 20 },
        temperature: { base: 37.5, variance: 0.3 },
        oxygen_saturation: { base: 93, variance: 2 },
        sleep_duration: { base: 5.0, variance: 1.0 },
        sleep_quality: { base: 4, variance: 1.5 },
        hydration: { base: 1.5, variance: 0.4 },
        stress_level: { base: 8.5, variance: 1.0 },
        mood: { base: 1.8, variance: 0.7 },
        calories_burned: { base: 1400, variance: 250 },
      };
    } else if (criticalMetricType === 2) {
      // Low oxygen saturation critical
      return {
        heart_rate: { base: 90, variance: 12 },
        blood_pressure_systolic: { base: 150, variance: 15 },
        blood_pressure_diastolic: { base: 100, variance: 10 },
        steps: { base: 2500, variance: 1200 },
        glucose: { base: 170, variance: 18 },
        temperature: { base: 37.2, variance: 0.5 },
        oxygen_saturation: { base: 88, variance: 2 }, // 86-90 (critical: <90)
        sleep_duration: { base: 4.0, variance: 1.2 }, // 2.8-5.2 (critical: <4)
        sleep_quality: { base: 2.5, variance: 1.5 },
        hydration: { base: 1.0, variance: 0.4 },
        stress_level: { base: 9, variance: 0.8 },
        mood: { base: 1.5, variance: 0.8 },
        calories_burned: { base: 1100, variance: 200 },
      };
    } else {
      // Multiple critical metrics
      return {
        heart_rate: { base: 135, variance: 12 },
        blood_pressure_systolic: { base: 170, variance: 12 },
        blood_pressure_diastolic: { base: 110, variance: 8 },
        steps: { base: 1500, variance: 800 },
        glucose: { base: 190, variance: 15 },
        temperature: { base: 38.0, variance: 0.4 },
        oxygen_saturation: { base: 89, variance: 2 },
        sleep_duration: { base: 3.5, variance: 1.0 },
        sleep_quality: { base: 2, variance: 1.5 },
        hydration: { base: 0.9, variance: 0.3 },
        stress_level: { base: 9.5, variance: 0.5 },
        mood: { base: 1.2, variance: 0.6 },
        calories_burned: { base: 1000, variance: 200 },
      };
    }
  }
};

// Get latest metric value for gradual changes
const getLatestMetric = async (userId, metricType) => {
  const latest = await HealthMetric.findOne({
    userId,
    metricType,
    isActive: true
  })
    .sort({ timestamp: -1 })
    .lean();

  return latest;
};

// Generate realistic metric value with gradual changes
const generateMetricValue = async (userId, metricType, baseline, patientIndex, totalPatients = 26) => {
  const healthGroup = getPatientHealthGroup(patientIndex, totalPatients);
  const latest = await getLatestMetric(userId, metricType);
  const now = new Date();
  const hour = now.getHours();

  // Time-based variations (circadian rhythm)
  let timeMultiplier = 1;
  if (metricType === 'heart_rate') {
    // Heart rate is lower at night, higher during day
    timeMultiplier = hour >= 6 && hour <= 22 ? 1.1 : 0.9;
  } else if (metricType === 'steps') {
    // Steps accumulate during day
    const dayProgress = hour / 24;
    timeMultiplier = Math.min(dayProgress * 2, 1);
  } else if (metricType === 'sleep_duration' || metricType === 'sleep_quality') {
    // Sleep metrics only update at night/morning
    if (hour >= 6 && hour <= 10) {
      timeMultiplier = 1;
    } else {
      timeMultiplier = 0.5; // Less variation during day
    }
  }

  // Define realistic constraints for each metric
  const constraints = {
    heart_rate: { min: 40, max: 200 },
    blood_pressure_systolic: { min: 70, max: 200 },
    blood_pressure_diastolic: { min: 40, max: 120 },
    steps: { min: 0, max: 50000 },
    glucose: { min: 50, max: 300 },
    temperature: { min: 35, max: 40 },
    oxygen_saturation: { min: 85, max: 100 },
    sleep_duration: { min: 0, max: 16 },
    sleep_quality: { min: 0, max: 10 },
    hydration: { min: 0, max: 10 },
    stress_level: { min: 1, max: 10 },
    mood: { min: 1, max: 5 },
    calories_burned: { min: 0, max: 10000 },
  };

  const constraint = constraints[metricType] || { min: 0, max: 1000 };

  let newValue;
  if (latest && latest.timestamp) {
    // Check if latest value is within constraints, if not, reset to baseline
    let lastValue = latest.value;
    if (lastValue < constraint.min || lastValue > constraint.max) {
      // Previous value was out of range, reset to baseline
      lastValue = baseline.base;
    }

    // Gradual change from last value (realistic device behavior)
    const timeDiff = (now - new Date(latest.timestamp)) / (1000 * 60); // minutes
    const changeRate = Math.min(timeDiff / 120, 0.15); // Max 15% change per update cycle
    
    // Calculate target value within baseline range
    const targetValue = Math.max(
      constraint.min,
      Math.min(
        constraint.max,
        baseline.base + (Math.random() - 0.5) * baseline.variance * 2
      )
    );
    
    const change = (targetValue - lastValue) * changeRate;
    newValue = lastValue + change;
    
    // Add small random variation (constrained)
    const variation = (Math.random() - 0.5) * baseline.variance * 0.2;
    newValue += variation;
    
    // Constrain immediately after calculation
    newValue = Math.max(constraint.min, Math.min(constraint.max, newValue));
  } else {
    // First metric for this patient - use baseline (already constrained)
    newValue = Math.max(
      constraint.min,
      Math.min(
        constraint.max,
        baseline.base + (Math.random() - 0.5) * baseline.variance * 2
      )
    );
  }

  // Apply time-based variations (but keep within constraints)
  newValue *= timeMultiplier;
  
  // Apply health group constraints BEFORE final constraint check
  const range = NORMAL_RANGES[metricType];
  if (range) {
    if (healthGroup === 'healthy') {
      // Healthy patients: ALL metrics must be within normal range (never critical or abnormal)
      // Clamp to middle 90% of normal range to ensure safety
      const rangeSize = range.max - range.min;
      const safeMin = range.min + rangeSize * 0.05;
      const safeMax = range.max - rangeSize * 0.05;
      newValue = Math.max(safeMin, Math.min(safeMax, newValue));
    } else if (healthGroup === 'warning') {
      // Warning patients: Some metrics can be abnormal, but NEVER critical
      // Ensure values are outside normal but within safe limits (not critical)
      if (newValue < range.criticalMin || newValue > range.criticalMax) {
        // If somehow in critical range, move to warning range
        if (newValue < range.criticalMin) {
          newValue = range.criticalMin + Math.random() * (range.min - range.criticalMin);
        } else if (newValue > range.criticalMax) {
          newValue = range.criticalMax - Math.random() * (range.criticalMax - range.max);
        }
      }
      // Ensure at least some metrics are abnormal (outside normal but not critical)
      // This is handled by the baseline values, but ensure we don't go critical
      if (newValue < range.criticalMin) newValue = range.criticalMin + 1;
      if (newValue > range.criticalMax) newValue = range.criticalMax - 1;
    } else if (healthGroup === 'critical') {
      // Critical patients: At least one metric MUST be in critical range
      const criticalMetricType = patientIndex % 4;
      if (criticalMetricType === 0 && metricType === 'blood_pressure_systolic') {
        newValue = 180 + Math.random() * 15; // 180-195 (critical: >180)
      } else if (criticalMetricType === 1 && metricType === 'heart_rate') {
        newValue = 150 + Math.random() * 30; // 150-180 (critical: >150)
      } else if (criticalMetricType === 2 && metricType === 'oxygen_saturation') {
        newValue = 85 + Math.random() * 4; // 85-89 (critical: <90)
      } else if (criticalMetricType === 3) {
        if (metricType === 'oxygen_saturation') {
          newValue = 85 + Math.random() * 4; // 85-89
        } else if (metricType === 'sleep_duration') {
          newValue = Math.random() * 3.5; // 0-3.5 (critical: <4)
        }
      }
    }
  }

  // Final constraint check - CRITICAL to prevent any out-of-range values
  newValue = Math.max(constraint.min, Math.min(constraint.max, newValue));

  // Round based on metric type
  if (metricType === 'temperature' || metricType === 'sleep_duration' || metricType === 'hydration') {
    newValue = Math.round(newValue * 10) / 10;
  } else if (metricType === 'sleep_quality' || metricType === 'stress_level' || metricType === 'mood') {
    newValue = Math.round(newValue * 2) / 2; // 0.5 increments
  } else {
    newValue = Math.round(newValue);
  }

  return Math.max(0, newValue); // Ensure non-negative
};

// Map metric types to valid alert types
const getAlertType = (metricType, isHigh) => {
  const alertTypeMap = {
    heart_rate: isHigh ? 'elevated_heart_rate' : 'emergency', // low heart rate is emergency
    blood_pressure_systolic: isHigh ? 'high_blood_pressure' : 'low_blood_pressure',
    blood_pressure_diastolic: isHigh ? 'high_blood_pressure' : 'low_blood_pressure',
    glucose: isHigh ? 'high_glucose' : 'low_glucose',
    sleep_duration: 'irregular_sleep',
    sleep_quality: 'irregular_sleep',
    steps: 'low_activity',
    calories_burned: 'low_activity',
    temperature: 'emergency',
    oxygen_saturation: 'emergency',
    hydration: 'emergency',
    stress_level: 'emergency',
    mood: 'emergency',
  };
  
  return alertTypeMap[metricType] || 'emergency';
};

// Track last alert/warning times globally
let lastAlertTime = null;
let lastWarningTime = null;
let lastAlertPatientId = null;

// Check if value is abnormal and create alert or warning
const checkAndCreateAlert = async (userId, metric, range, shouldCreateWarning = false) => {
  if (!range) return;

  const value = metric.value;
  let severity = null;
  let alertType = null;
  let shouldAlert = false;
  let isHigh = false;
  let isWarning = false;

  const now = new Date();

  // For warnings: only create if 5-8 minutes have passed since last warning
  if (shouldCreateWarning) {
    if (lastWarningTime) {
      const minutesSinceLastWarning = (now - lastWarningTime) / (1000 * 60);
      // Random interval between 5-8 minutes
      const minInterval = 5;
      const maxInterval = 8;
      const requiredInterval = minInterval + Math.random() * (maxInterval - minInterval);
      
      if (minutesSinceLastWarning < requiredInterval) {
        return; // Too soon for another warning
      }
    }
    
    // Create a warning (medium severity, outside normal range but not critical)
    if (value < range.min || value > range.max) {
      severity = 'medium';
      shouldAlert = true;
      isWarning = true;
      isHigh = value > range.max;
      alertType = getAlertType(metric.metricType, isHigh);
    } else {
      return; // Value is normal, no warning needed
    }
  } else {
    // For alerts: only create if 1 hour has passed since last alert for ANY patient
    // And only for one random patient per hour
    if (lastAlertTime) {
      const hoursSinceLastAlert = (now - lastAlertTime) / (1000 * 60 * 60);
      if (hoursSinceLastAlert < 1) {
        return; // Too soon for another alert
      }
    }

    // Only create alert if this is the selected random patient for this hour
    // Get all patients to randomly select one
    const allPatients = await User.find({ role: 'patient', isActive: true }).select('_id').lean();
    if (allPatients.length === 0) return;

    // If we haven't selected a patient for this hour, or it's been more than 1 hour, select a new one
    if (!lastAlertPatientId || (lastAlertTime && (now - lastAlertTime) / (1000 * 60 * 60) >= 1)) {
      const randomIndex = Math.floor(Math.random() * allPatients.length);
      lastAlertPatientId = allPatients[randomIndex]._id.toString();
    }

    // Only create alert for the selected patient
    if (userId.toString() !== lastAlertPatientId) {
      return; // Not this patient's turn
    }

    // Check for critical values (only for selected patient)
    if (range.criticalMin !== undefined && value < range.criticalMin) {
      severity = 'critical';
      shouldAlert = true;
      isHigh = false;
      alertType = getAlertType(metric.metricType, false);
    } else if (range.criticalMax !== undefined && value > range.criticalMax) {
      severity = 'critical';
      shouldAlert = true;
      isHigh = true;
      alertType = getAlertType(metric.metricType, true);
    }
    // Check for high/low values (outside normal range)
    else if (value < range.min) {
      severity = 'high';
      shouldAlert = true;
      isHigh = false;
      alertType = getAlertType(metric.metricType, false);
    } else if (value > range.max) {
      severity = 'high';
      shouldAlert = true;
      isHigh = true;
      alertType = getAlertType(metric.metricType, true);
    }
  }

  if (shouldAlert && severity) {
    // Check if alert already exists for this metric (within last hour for alerts, last 5 min for warnings)
    const timeWindow = isWarning ? 5 * 60 * 1000 : 60 * 60 * 1000; // 5 min for warnings, 1 hour for alerts
    const timeAgo = new Date(Date.now() - timeWindow);
    const existingAlert = await Alert.findOne({
      userId,
      relatedMetricId: metric._id,
      status: 'active',
      triggeredAt: { $gte: timeAgo }
    });

    if (!existingAlert) {
      // For warnings, we don't need to check limits - just create it
      // For alerts, we already limited to 1 per hour per random patient

      const metricName = metric.metricType
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

      const patient = await User.findById(userId).select('firstName lastName').lean();
      const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : 'Patient';

      const message = `${patientName} has abnormal ${metricName}: ${value} ${metric.unit}. Normal range: ${range.min}-${range.max} ${metric.unit}`;
      const title = isWarning 
        ? `Warning: Abnormal ${metricName}` 
        : `Abnormal ${metricName} Alert`;

      // Only create alert if not a warning, or if it's critical
      if (!isWarning || severity === 'critical') {
        const alert = new Alert({
          userId,
          alertType: alertType || 'emergency',
          title,
          message,
          severity,
          status: 'active',
          relatedMetricId: metric._id,
          triggeredAt: new Date(),
          metadata: {
            threshold: range.min || range.max,
            actualValue: value,
            unit: metric.unit,
            isWarning: isWarning
          }
        });

        await alert.save();

        // Update last alert time if this is a real alert (not warning)
        if (!isWarning) {
          lastAlertTime = now;
        }

        // Also create alert for providers/doctors monitoring this patient
        if (patient) {
          const providers = await User.find({
            role: { $in: ['provider', 'doctor', 'admin'] },
            isActive: true
          }).select('_id').lean();

          for (const provider of providers) {
            // Check provider's active alerts count (limit to prevent spam)
            const providerActiveAlerts = await Alert.countDocuments({
              userId: provider._id,
              status: 'active'
            });

            // Only create provider alert if they have less than 50 active alerts
            if (providerActiveAlerts < 50) {
              const providerAlert = new Alert({
                userId: provider._id,
                alertType: alertType || 'emergency',
                title: isWarning ? `Warning: Patient ${patientName}` : `Patient Alert: ${patientName}`,
                message: `${patientName} - ${message}`,
                severity,
                status: 'active',
                relatedMetricId: metric._id,
                triggeredAt: new Date(),
                metadata: {
                  patientId: userId,
                  threshold: range.min || range.max,
                  actualValue: value,
                  unit: metric.unit,
                  isWarning: isWarning
                }
              });
              await providerAlert.save();
            }
          }
        }
      } else {
        // Create warning instead (lower severity, but still track it)
        // Warnings are stored as alerts with medium severity and isWarning flag
        const warning = new Alert({
          userId,
          alertType: alertType || 'emergency',
          title,
          message,
          severity: 'medium', // Warnings are medium severity
          status: 'active',
          relatedMetricId: metric._id,
          triggeredAt: new Date(),
          metadata: {
            threshold: range.min || range.max,
            actualValue: value,
            unit: metric.unit,
            isWarning: true
          }
        });

        await warning.save();
        // Update last warning time
        lastWarningTime = now;
      }
    }
  }
};

// Main function to simulate device data for all patients
const simulateDeviceData = async () => {
  try {
    console.log('[Device Simulator] Starting device data simulation...');
    
    // Get all active patients
    const patients = await User.find({
      role: 'patient',
      isActive: true
    }).select('_id').lean();

    if (patients.length === 0) {
      console.log('[Device Simulator] No patients found');
      return;
    }

    console.log(`[Device Simulator] Processing ${patients.length} patients...`);

    const now = new Date();
    const metricsToInsert = [];
    const allAlerts = [];

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const baseline = getPatientBaseline(patient._id, i, patients.length);

      // Generate metrics for each patient
      const metricTypes = [
        'heart_rate',
        'blood_pressure_systolic',
        'blood_pressure_diastolic',
        'steps',
        'glucose',
        'temperature',
        'oxygen_saturation',
        'sleep_duration',
        'sleep_quality',
        'hydration',
        'stress_level',
        'mood',
        'calories_burned'
      ];

      for (const metricType of metricTypes) {
        const baselineConfig = baseline[metricType];
        if (!baselineConfig) continue;

        const value = await generateMetricValue(patient._id, metricType, baselineConfig, i, patients.length);
        const unit = getUnitForMetric(metricType);

        const metric = {
          userId: patient._id,
          metricType,
          value,
          unit,
          timestamp: now,
          source: 'device',
          isActive: true
        };

        metricsToInsert.push(metric);
      }
    }

      // Insert all metrics
      if (metricsToInsert.length > 0) {
        const insertedMetrics = await HealthMetric.insertMany(metricsToInsert);
        console.log(`[Device Simulator] Inserted ${insertedMetrics.length} metrics`);

        // Check for warnings (every 5-8 minutes, 1 warning)
        // Randomly select one patient for warning
        if (patients.length > 0) {
          const randomPatientIndex = Math.floor(Math.random() * patients.length);
          const randomPatient = patients[randomPatientIndex];
          
          // Find a metric for this patient that's outside normal range
          const patientMetrics = insertedMetrics.filter(m => m.userId.toString() === randomPatient._id.toString());
          if (patientMetrics.length > 0) {
            // Randomly select one metric
            const randomMetric = patientMetrics[Math.floor(Math.random() * patientMetrics.length)];
            const range = NORMAL_RANGES[randomMetric.metricType];
            if (range) {
              try {
                await checkAndCreateAlert(randomMetric.userId, randomMetric, range, true); // true = create warning
              } catch (alertError) {
                console.error(`[Device Simulator] Error creating warning:`, alertError.message);
              }
            }
          }
        }

        // Check for alerts (1 alert per hour for one random patient)
        // Only check if it's been at least 1 hour since last alert
        const now = new Date();
        if (!lastAlertTime || (now - lastAlertTime) / (1000 * 60 * 60) >= 1) {
          if (patients.length > 0) {
            // Randomly select one patient for alert
            const randomPatientIndex = Math.floor(Math.random() * patients.length);
            const randomPatient = patients[randomPatientIndex];
            
            // Find a metric for this patient that's abnormal
            const patientMetrics = insertedMetrics.filter(m => m.userId.toString() === randomPatient._id.toString());
            if (patientMetrics.length > 0) {
              // Randomly select one metric
              const randomMetric = patientMetrics[Math.floor(Math.random() * patientMetrics.length)];
              const range = NORMAL_RANGES[randomMetric.metricType];
              if (range) {
                try {
                  await checkAndCreateAlert(randomMetric.userId, randomMetric, range, false); // false = create alert
                } catch (alertError) {
                  console.error(`[Device Simulator] Error creating alert:`, alertError.message);
                }
              }
            }
          }
        }

        console.log(`[Device Simulator] Completed simulation for ${patients.length} patients`);
      }

  } catch (error) {
    console.error('[Device Simulator] Error:', error);
  }
};

// Generate historical data for a patient (backfill)
const generateHistoricalData = async (patientId, patientIndex, daysBack = 180, totalPatients = 26) => {
  try {
    const baseline = getPatientBaseline(patientId, patientIndex, totalPatients);
    const now = new Date();
    const metricsToInsert = [];
    
    // Generate data for the past N days, with multiple readings per day
    const metricTypes = [
      'heart_rate',
      'blood_pressure_systolic',
      'blood_pressure_diastolic',
      'steps',
      'glucose',
      'temperature',
      'oxygen_saturation',
      'sleep_duration',
      'sleep_quality',
      'hydration',
      'stress_level',
      'mood',
      'calories_burned'
    ];

    // Generate data points throughout each day (every 2-4 hours)
    for (let day = daysBack; day >= 0; day--) {
      const dayDate = new Date(now);
      dayDate.setDate(dayDate.getDate() - day);
      dayDate.setHours(0, 0, 0, 0);

      // Generate 6-8 readings per day (every 3-4 hours)
      const readingsPerDay = 6 + Math.floor(Math.random() * 3);
      
      for (let reading = 0; reading < readingsPerDay; reading++) {
        const timestamp = new Date(dayDate);
        const hour = Math.floor((reading / readingsPerDay) * 24);
        timestamp.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

        for (const metricType of metricTypes) {
          const baselineConfig = baseline[metricType];
          if (!baselineConfig) continue;

          // Generate value with some variation based on time of day
          const hourOfDay = timestamp.getHours();
          let timeMultiplier = 1;
          
          if (metricType === 'heart_rate') {
            timeMultiplier = hourOfDay >= 6 && hourOfDay <= 22 ? 1.1 : 0.9;
          } else if (metricType === 'steps') {
            // Steps accumulate during day
            const dayProgress = hourOfDay / 24;
            timeMultiplier = Math.min(dayProgress * 2, 1);
          } else if (metricType === 'sleep_duration' || metricType === 'sleep_quality') {
            // Sleep metrics only at night/morning
            if (hourOfDay >= 6 && hourOfDay <= 10) {
              timeMultiplier = 1;
            } else {
              timeMultiplier = 0.5;
            }
          }

          // Define constraints first
          const constraints = {
            heart_rate: { min: 40, max: 200 },
            blood_pressure_systolic: { min: 70, max: 200 },
            blood_pressure_diastolic: { min: 40, max: 120 },
            steps: { min: 0, max: 50000 },
            glucose: { min: 50, max: 300 },
            temperature: { min: 35, max: 40 },
            oxygen_saturation: { min: 85, max: 100 },
            sleep_duration: { min: 0, max: 16 },
            sleep_quality: { min: 0, max: 10 },
            hydration: { min: 0, max: 10 },
            stress_level: { min: 1, max: 10 },
            mood: { min: 1, max: 5 },
            calories_burned: { min: 0, max: 10000 },
          };

          const constraint = constraints[metricType] || { min: 0, max: 1000 };

          // Generate realistic value WITHIN constraints from the start
          let value = Math.max(
            constraint.min,
            Math.min(
              constraint.max,
              baselineConfig.base + (Math.random() - 0.5) * baselineConfig.variance * 2
            )
          );
          
          // Apply health group constraints
          const healthGroup = getPatientHealthGroup(patientIndex, totalPatients);
          const range = NORMAL_RANGES[metricType];
          if (range) {
            if (healthGroup === 'healthy') {
              // Healthy: ALL metrics within normal range (middle 90%)
              const rangeSize = range.max - range.min;
              const safeMin = range.min + rangeSize * 0.05;
              const safeMax = range.max - rangeSize * 0.05;
              value = Math.max(safeMin, Math.min(safeMax, value));
            } else if (healthGroup === 'warning') {
              // Warning: Some abnormal but NEVER critical
              if (value < range.criticalMin) value = range.criticalMin + 1;
              if (value > range.criticalMax) value = range.criticalMax - 1;
            } else if (healthGroup === 'critical') {
              // Critical: At least one metric in critical range
              const criticalMetricType = patientIndex % 4;
              if (criticalMetricType === 0 && metricType === 'blood_pressure_systolic') {
                value = 180 + Math.random() * 15;
              } else if (criticalMetricType === 1 && metricType === 'heart_rate') {
                value = 150 + Math.random() * 30;
              } else if (criticalMetricType === 2 && metricType === 'oxygen_saturation') {
                value = 85 + Math.random() * 4;
              } else if (criticalMetricType === 3) {
                if (metricType === 'oxygen_saturation') {
                  value = 85 + Math.random() * 4;
                } else if (metricType === 'sleep_duration') {
                  value = Math.random() * 3.5;
                }
              }
            }
          }
          
          // Apply time-based variations (but keep within constraints)
          value *= timeMultiplier;
          
          // Final constraint check - CRITICAL
          value = Math.max(constraint.min, Math.min(constraint.max, value));

          // Round based on metric type
          if (metricType === 'temperature' || metricType === 'sleep_duration' || metricType === 'hydration') {
            value = Math.round(value * 10) / 10;
          } else if (metricType === 'sleep_quality' || metricType === 'stress_level' || metricType === 'mood') {
            value = Math.round(value * 2) / 2;
          } else {
            value = Math.round(value);
          }

          value = Math.max(0, value);

          const unit = getUnitForMetric(metricType);

          metricsToInsert.push({
            userId: patientId,
            metricType,
            value,
            unit,
            timestamp,
            source: 'device',
            isActive: true
          });
        }
      }
    }

    // Insert in batches to avoid memory issues
    const batchSize = 500;
    let insertedCount = 0;
    
    for (let i = 0; i < metricsToInsert.length; i += batchSize) {
      const batch = metricsToInsert.slice(i, i + batchSize);
      try {
        await HealthMetric.insertMany(batch, { ordered: false });
        insertedCount += batch.length;
      } catch (err) {
        // Ignore duplicate key errors
        if (err.code !== 11000) {
          console.error(`[Device Simulator] Error inserting batch:`, err.message);
        } else {
          // Count successful inserts even if some duplicates
          insertedCount += batch.length;
        }
      }
    }

    return insertedCount;
  } catch (error) {
    console.error(`[Device Simulator] Error generating historical data for patient ${patientId}:`, error);
    return 0;
  }
};

// Initialize historical data for all patients
const initializeHistoricalData = async () => {
  try {
    console.log('[Device Simulator] Initializing historical data (6 months = 180 days)...');
    
    const patients = await User.find({
      role: 'patient',
      isActive: true
    }).select('_id').lean();

    if (patients.length === 0) {
      console.log('[Device Simulator] No patients found for historical data');
      return;
    }

    let totalInserted = 0;
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      
      // Check if patient already has historical data
      const existingMetrics = await HealthMetric.countDocuments({
        userId: patient._id,
        isActive: true
      });

      // Only generate if patient has less than 1000 metrics (indicating new patient or needs refresh)
      if (existingMetrics < 1000) {
        const healthGroup = getPatientHealthGroup(i, patients.length);
        console.log(`[Device Simulator] Generating 6 months (180 days) of historical data for patient ${patient._id} (${healthGroup})...`);
        const inserted = await generateHistoricalData(patient._id, i, 180, patients.length);
        totalInserted += inserted;
        console.log(`[Device Simulator] Inserted ${inserted} historical metrics for patient ${patient._id}`);
      } else {
        console.log(`[Device Simulator] Patient ${patient._id} already has historical data (${existingMetrics} metrics)`);
      }
    }

    console.log(`[Device Simulator] Historical data initialization complete. Total: ${totalInserted} metrics`);
  } catch (error) {
    console.error('[Device Simulator] Error initializing historical data:', error);
  }
};

// Helper function to get unit for metric type
const getUnitForMetric = (metricType) => {
  const units = {
    blood_pressure_systolic: 'mmHg',
    blood_pressure_diastolic: 'mmHg',
    heart_rate: 'bpm',
    steps: 'steps',
    glucose: 'mg/dL',
    weight: 'kg',
    height: 'cm',
    temperature: '°C',
    oxygen_saturation: '%',
    sleep_duration: 'hours',
    sleep_quality: 'scale_1_10',
    calories_burned: 'calories',
    hydration: 'liters',
    stress_level: 'scale_1_10',
    mood: 'scale_1_5',
  };
  return units[metricType] || 'units';
};

// Clean up invalid metric values in database
const cleanupInvalidMetrics = async () => {
  try {
    console.log('[Device Simulator] Cleaning up invalid metric values...');
    
    const constraints = {
      heart_rate: { min: 40, max: 200 },
      blood_pressure_systolic: { min: 70, max: 200 },
      blood_pressure_diastolic: { min: 40, max: 120 },
      steps: { min: 0, max: 50000 },
      glucose: { min: 50, max: 300 },
      temperature: { min: 35, max: 40 },
      oxygen_saturation: { min: 85, max: 100 },
      sleep_duration: { min: 0, max: 16 },
      sleep_quality: { min: 0, max: 10 },
      hydration: { min: 0, max: 10 },
      stress_level: { min: 1, max: 10 },
      mood: { min: 1, max: 5 },
      calories_burned: { min: 0, max: 10000 },
    };

    let totalDeleted = 0;
    let totalFixed = 0;
    
    for (const [metricType, constraint] of Object.entries(constraints)) {
      // Find all invalid metrics (values outside realistic range)
      const invalidMetrics = await HealthMetric.find({
        metricType,
        $or: [
          { value: { $lt: constraint.min } },
          { value: { $gt: constraint.max } }
        ],
        isActive: true
      });

      if (invalidMetrics.length > 0) {
        console.log(`[Device Simulator] Found ${invalidMetrics.length} invalid ${metricType} metrics`);
        
        // Get unique patient IDs
        const patientIds = [...new Set(invalidMetrics.map(m => m.userId.toString()))];
        
        for (let i = 0; i < patientIds.length; i++) {
          const patientId = patientIds[i];
          const patient = await User.findById(patientId).select('_id').lean();
          if (!patient) continue;
          
          const baseline = getPatientBaseline(patient._id, i);
          const baselineConfig = baseline[metricType];
          
          if (baselineConfig) {
            // Delete all invalid metrics for this patient and metric type
            const deleteResult = await HealthMetric.deleteMany({
              userId: patient._id,
              metricType,
              $or: [
                { value: { $lt: constraint.min } },
                { value: { $gt: constraint.max } }
              ],
              isActive: true
            });
            
            totalDeleted += deleteResult.deletedCount;
            console.log(`[Device Simulator] Deleted ${deleteResult.deletedCount} invalid ${metricType} metrics for patient ${patientId}`);
          }
        }
      }
    }

    if (totalDeleted > 0) {
      console.log(`[Device Simulator] Cleaned up ${totalDeleted} invalid metric values (deleted)`);
    } else {
      console.log('[Device Simulator] No invalid metrics found');
    }
  } catch (error) {
    console.error('[Device Simulator] Error cleaning up invalid metrics:', error);
  }
};

module.exports = {
  simulateDeviceData,
  initializeHistoricalData,
  cleanupInvalidMetrics,
  getPatientBaseline
};

