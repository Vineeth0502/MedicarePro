const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const deviceSimulator = require('../src/services/deviceSimulator');

const generateMetricsNow = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not set in backend/.env file. Please add your MongoDB connection string.');
    }
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('Generating metrics for all patients...');
    await deviceSimulator.simulateDeviceData();
    
    console.log('Metrics generation complete!');

  } catch (error) {
    console.error('Error generating metrics:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

generateMetricsNow();

