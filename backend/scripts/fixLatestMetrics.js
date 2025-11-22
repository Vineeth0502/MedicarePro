const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const User = require('../src/models/User');
const HealthMetric = require('../src/models/HealthMetric');
const deviceSimulator = require('../src/services/deviceSimulator');

async function fixLatestMetrics() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not set in backend/.env file. Please add your MongoDB connection string.');
    }
    
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
    });
    console.log('✅ Connected to MongoDB\n');

    // Delete the most recent metrics (last hour) to force regeneration
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const deleteResult = await HealthMetric.deleteMany({
      timestamp: { $gte: oneHourAgo },
      isActive: true
    });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} recent metrics\n`);

    // Run the device simulator to generate fresh metrics with correct constraints
    console.log('🔄 Generating fresh metrics with correct health distribution...\n');
    await deviceSimulator.simulateDeviceData();

    console.log('\n✅ Latest metrics regenerated!');
    console.log('💡 The dashboard should now show the correct distribution:\n');
    console.log('   - ~12 Healthy patients');
    console.log('   - ~8 Warning patients');
    console.log('   - ~6 Critical patients\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixLatestMetrics();

