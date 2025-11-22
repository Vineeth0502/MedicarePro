const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const User = require('../src/models/User');
const HealthMetric = require('../src/models/HealthMetric');

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

async function verifyHealthStatus() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not set in backend/.env file. Please add your MongoDB connection string.');
    }
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
    });
    console.log('Connected to MongoDB\n');

    const patients = await User.find({ role: 'patient', isActive: true })
      .select('_id firstName lastName')
      .lean();

    console.log(`Analyzing ${patients.length} patients...\n`);

    const statusCounts = { healthy: 0, monitoring: 0, warning: 0, critical: 0, no_data: 0 };

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      
      // Get latest metrics for each type
      const metricTypes = [
        'heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic',
        'glucose', 'temperature', 'oxygen_saturation',
        'sleep_duration', 'sleep_quality', 'hydration', 'stress_level', 'mood'
      ];

      let abnormalCount = 0;
      let criticalCount = 0;
      let totalMetrics = 0;

      for (const metricType of metricTypes) {
        const latest = await HealthMetric.findOne({
          userId: patient._id,
          metricType,
          isActive: true
        })
          .sort({ timestamp: -1 })
          .lean();

        if (!latest) continue;
        
        totalMetrics++;
        const range = NORMAL_RANGES[metricType];
        if (range) {
          if (range.criticalMin !== undefined && latest.value < range.criticalMin) {
            criticalCount++;
          } else if (range.criticalMax !== undefined && latest.value > range.criticalMax) {
            criticalCount++;
          } else if (latest.value < range.min || latest.value > range.max) {
            abnormalCount++;
          }
        }
      }

      let status = 'healthy';
      if (criticalCount > 0) status = 'critical';
      else if (abnormalCount > 2) status = 'warning';
      else if (abnormalCount > 0) status = 'monitoring';
      else if (totalMetrics === 0) status = 'no_data';

      statusCounts[status]++;

      const expectedGroup = i < 12 ? 'healthy' : i < 20 ? 'warning' : 'critical';
      const match = status === expectedGroup || 
                   (expectedGroup === 'healthy' && status === 'monitoring') ||
                   (expectedGroup === 'warning' && (status === 'warning' || status === 'monitoring'));

      console.log(`${i + 1}. ${patient.firstName} ${patient.lastName}`);
      console.log(`   Expected: ${expectedGroup}, Actual: ${status} ${match ? '✅' : '❌'}`);
      console.log(`   Critical: ${criticalCount}, Abnormal: ${abnormalCount}, Total: ${totalMetrics}`);
    }

    console.log('\n  Summary:');
    console.log(`   Healthy: ${statusCounts.healthy}`);
    console.log(`   Monitoring: ${statusCounts.monitoring}`);
    console.log(`   Warning: ${statusCounts.warning}`);
    console.log(`   Critical: ${statusCounts.critical}`);
    console.log(`   No Data: ${statusCounts.no_data}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

verifyHealthStatus();

