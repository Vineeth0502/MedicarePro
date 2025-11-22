const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const User = require('../src/models/User');
const HealthMetric = require('../src/models/HealthMetric');
const deviceSimulator = require('../src/services/deviceSimulator');

async function regeneratePatientMetrics() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://vineeth05:doCMGfSLHDjy0Iby@cluster0.8mcedne.mongodb.net/healthmonitor?retryWrites=true&w=majority';
    
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
    });
    console.log('✅ MongoDB Atlas connected successfully\n');

    // Get all patients
    const patients = await User.find({
      role: 'patient',
      isActive: true
    }).select('_id firstName lastName').lean();

    console.log(`📊 Found ${patients.length} patients\n`);
    console.log('🗑️  Deleting existing metrics to regenerate with new distribution...\n');

    // Delete all existing metrics
    const deleteResult = await HealthMetric.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing metrics\n`);

    // Initialize historical data (6 months) with new distribution
    console.log('🔄 Generating 6 months of historical data with target distribution:');
    console.log('   - 12 healthy patients (~46%)');
    console.log('   - 8 warning patients (~31%)');
    console.log('   - 6 critical patients (~23%)\n');
    
    await deviceSimulator.initializeHistoricalData();

    // Run one simulation cycle to generate current metrics
    console.log('\n🔄 Running initial device simulation...\n');
    await deviceSimulator.simulateDeviceData();

    console.log('\n✅ Patient metrics regeneration complete!');
    console.log(`👥 Total patients: ${patients.length}`);
    console.log('💡 Device simulator will continue to update metrics every 1 minute automatically\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
regeneratePatientMetrics();

