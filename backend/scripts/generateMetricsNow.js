const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const deviceSimulator = require('../src/services/deviceSimulator');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vineeth05:doCMGfSLHDjy0Iby@cluster0.8mcedne.mongodb.net/healthmonitor?retryWrites=true&w=majority';

const generateMetricsNow = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🔄 Generating metrics for all patients...');
    await deviceSimulator.simulateDeviceData();
    
    console.log('✅ Metrics generation complete!');

  } catch (error) {
    console.error('❌ Error generating metrics:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

generateMetricsNow();

