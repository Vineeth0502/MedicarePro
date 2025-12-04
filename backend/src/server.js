const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const healthMetricRoutes = require('./routes/healthMetrics');
const alertRoutes = require('./routes/alerts');
const consentRoutes = require('./routes/consent');
const appointmentRoutes = require('./routes/appointments');
const dataGeneratorRoutes = require('./routes/dataGenerator');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 5001;

// CORS configuration - must be before other middleware
const corsOptions = {
  origin: function (origin, callback) {
    // In development, allow all localhost origins
    if (process.env.NODE_ENV === 'development') {
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
        return;
      }
    }
    
    // Allow requests with no origin (like mobile apps or curl requests)
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      // Vercel frontend URLs (wildcard for preview deployments)
      /^https:\/\/medicare-pro.*\.vercel\.app$/,
      /^https:\/\/.*-medicare-pro.*\.vercel\.app$/
    ];
    
    // Check if origin matches any allowed origin (string or regex)
    const isAllowed = !origin || allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Security middleware (configured to work with CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Handle preflight OPTIONS requests
app.options('*', cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HealthMonitor API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/health-metrics', healthMetricRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/data-generator', dataGeneratorRoutes);
app.use('/api/messages', messageRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// MongoDB connection
const connectDB = async () => {
  try {
    // Use MongoDB Atlas connection string from .env
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not set in .env file. Please add your MongoDB connection string to backend/.env');
    }
    
    console.log('Connecting to MongoDB Atlas...');
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    
    console.log('MongoDB Atlas connected successfully');
    console.log('Database:', mongoose.connection.name);
    console.log('Host:', mongoose.connection.host);
    
    // Create indexes for better performance
    try {
      await mongoose.connection.db.collection('healthmetrics').createIndex({ userId: 1, metricType: 1, timestamp: -1 });
      await mongoose.connection.db.collection('alerts').createIndex({ userId: 1, status: 1, triggeredAt: -1 });
      await mongoose.connection.db.collection('appointments').createIndex({ patientId: 1, scheduledDate: 1 });
      await mongoose.connection.db.collection('users').createIndex({ email: 1, username: 1 });
      await mongoose.connection.db.collection('consentsettings').createIndex({ userId: 1 });
      console.log('Database indexes created');
    } catch (indexError) {
      console.log('Warning: Some indexes may already exist:', indexError.message);
    }
    
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.error('Warning: Server will continue without database connection.');
    console.error('Warning: API endpoints will not work until MongoDB is connected.');
    console.error('To fix: Update MONGODB_URI in .env or check MongoDB Atlas credentials.');
    // Don't exit - allow server to start for CORS testing
    // process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    // Try to connect to MongoDB, but don't fail if it doesn't work
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API URL: http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      if (!mongoose.connection.readyState) {
        console.log(`Warning: MongoDB not connected - some features may not work`);
      } else {
        // Start device simulator (runs every 1 minute)
        const deviceSimulator = require('./services/deviceSimulator');
        console.log('[Device Simulator] Starting automatic device data simulation (every 1 minute)...');
        
        // Clean up invalid metrics first
        deviceSimulator.cleanupInvalidMetrics().then(() => {
          // Initialize historical data (30 days)
          return deviceSimulator.initializeHistoricalData();
        }).then(() => {
          // Then start real-time updates
          console.log('[Device Simulator] Starting real-time updates...');
          
          // Run immediately
          deviceSimulator.simulateDeviceData();
          
          // Then run every 1 minute (60,000 milliseconds)
          setInterval(() => {
            deviceSimulator.simulateDeviceData();
          }, 60000); // 1 minute
          
          console.log('[Device Simulator] Device simulator started successfully');
        });
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

startServer();

module.exports = app;

