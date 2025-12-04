const mongoose = require('mongoose');

// Helper function to ensure MongoDB connection
const ensureDBConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    return true; // Already connected
  }
  
  if (mongoose.connection.readyState === 2) {
    // Connecting, wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (mongoose.connection.readyState === 1) {
      return true;
    }
  }
  
  // Not connected, try to reconnect
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    return false;
  }
  
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      heartbeatFrequencyMS: 10000,
    });
    return mongoose.connection.readyState === 1;
  } catch (error) {
    console.error('Reconnection attempt failed:', error.message);
    return false;
  }
};

module.exports = { ensureDBConnection };

