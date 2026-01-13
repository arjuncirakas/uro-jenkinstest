import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Import database and routes
import { testConnection, initializeDatabase } from './config/database.js';
import authRoutes from './routes/auth.js';
import superadminRoutes from './routes/superadmin.js';
import patientRoutes from './routes/patients.js';
import notesRoutes from './routes/notes.js';
import investigationRoutes from './routes/investigations.js';
import bookingRoutes from './routes/booking.js';
import mdtRoutes from './routes/mdt.js';
import doctorsRoutes from './routes/doctors.js';
import notificationRoutes from './routes/notifications.js';
import gpRoutes from './routes/gp.js';
import nursesRoutes from './routes/nurses.js';
import consentFormRoutes from './routes/consentForms.js';
import kpiRoutes from './routes/kpi.js';
import exportRoutes from './routes/export.js';
import guidelineRoutes from './routes/guidelines.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { initializeNotificationsTable } from './services/notificationService.js';
import { corsOptions, validateCorsConfig, corsLoggingMiddleware } from './middleware/corsConfig.js';
import { initAutoNoShowScheduler } from './schedulers/autoNoShowScheduler.js';
import { protectApiRoutes } from './middleware/apiAuth.js';
import { restrictHealthCheckAccess } from './middleware/healthCheckAuth.js';
import { auditMiddleware, auditAuthMiddleware } from './middleware/auditMiddleware.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Get allowed origins for CSP
const getAllowedCSPOrigins = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    // In development, allow localhost origins
    return [
      "'self'",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://localhost:5000"
    ];
  }

  // In production, allow configured frontend URL
  const origins = ["'self'"];
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }

  return origins;
};

// Security middleware with environment-aware CSP
app.use(helmet({
  contentSecurityPolicy: false,
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  contentTypeOptions: 'nosniff',
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  crossOriginEmbedderPolicy: false,
  // Allow cross-origin resources to work with CORS "*" configuration
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Additional security headers middleware
app.use((req, res, next) => {
  // Ensure HSTS header is set
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  // Ensure X-Content-Type-Options is set
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Additional security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Apply rate limiting to all routes
app.use(generalLimiter);

// CORS configuration with enhanced logging
app.use(cors(corsOptions));
app.use(corsLoggingMiddleware);


// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Production logging
  app.use(morgan('combined'));
}

// Security logging middleware
app.use((req, res, next) => {
  // Log security events
  if (req.path.includes('/api/') && req.method !== 'GET') {
    console.log(`🔒 Security Event: ${req.method} ${req.path} from ${req.ip} at ${new Date().toISOString()}`);
  }
  next();
});

// Health check endpoint - minimal response, optionally restricted to internal monitoring
app.get('/health', restrictHealthCheckAccess, (req, res) => {
  res.json({
    status: 'OK'
  });
});

// API routes - SECURITY FIX: Removed metadata exposure
// Previously exposed API version, endpoints, and internal documentation to unauthenticated users
app.get('/api', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Authentication required'
  });
});

// Serve uploaded files statically (for debugging)
app.use('/uploads', express.static('uploads'));

// Apply audit middleware for API routes
app.use('/api', auditMiddleware);

// Apply global API authentication middleware
// This protects ALL /api/* routes except public auth endpoints
app.use(protectApiRoutes);

// Debug logging for all API requests - with special handling for file requests
app.use('/api', (req, res, next) => {
  const isFileRequest = req.originalUrl.includes('/files/') || 
                        req.originalUrl.includes('/investigations/files/') ||
                        req.path.includes('/files/') ||
                        req.path.includes('/investigations/files/');
  
  if (isFileRequest) {
    console.log('📁 [FILE REQUEST DETECTED] ==========================================');
    console.log('📁 [FILE REQUEST DETECTED] Method:', req.method);
    console.log('📁 [FILE REQUEST DETECTED] Original URL:', req.originalUrl);
    console.log('📁 [FILE REQUEST DETECTED] Path:', req.path);
    console.log('📁 [FILE REQUEST DETECTED] Base URL:', req.baseUrl);
    console.log('📁 [FILE REQUEST DETECTED] URL:', req.url);
    console.log('📁 [FILE REQUEST DETECTED] Query:', req.query);
    console.log('📁 [FILE REQUEST DETECTED] Params:', req.params);
    console.log('📁 [FILE REQUEST DETECTED] Headers:', {
      host: req.get('host'),
      'x-forwarded-for': req.get('x-forwarded-for'),
      'x-real-ip': req.get('x-real-ip'),
      'user-agent': req.get('user-agent'),
      'accept': req.get('accept'),
      'content-type': req.get('content-type')
    });
    console.log('📁 [FILE REQUEST DETECTED] IP:', req.ip);
    console.log('📁 [FILE REQUEST DETECTED] ==========================================');
  } else {
    console.log(`🌐 [API Request] ${req.method} ${req.originalUrl}`);
    console.log(`🌐 [API Request] Path: ${req.path}`);
    console.log(`🌐 [API Request] Base URL: ${req.baseUrl}`);
    console.log(`🌐 [API Request] URL: ${req.url}`);
    console.log(`🌐 [API Request] Headers:`, {
      host: req.get('host'),
      'x-forwarded-for': req.get('x-forwarded-for'),
      'x-real-ip': req.get('x-real-ip')
    });
  }
  next();
});

// Register API routes with audit logging
app.use('/api/auth', auditAuthMiddleware, authRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api', notesRoutes);
app.use('/api', investigationRoutes);
// Namespace booking routes to avoid /api/doctors collision
app.use('/api/booking', bookingRoutes);
app.use('/api/notifications', notificationRoutes);

// Backward-compatibility: redirect old appointments endpoints to new namespace
app.use('/api/appointments', (req, res) => {
  const queryIndex = req.originalUrl.indexOf('?');
  const query = queryIndex !== -1 ? req.originalUrl.slice(queryIndex) : '';
  // Preserve subpath after /api/appointments
  const subPath = req.path || '';
  const target = `/api/booking/appointments${subPath}${query}`;
  return res.redirect(307, target);
});
app.use('/api', mdtRoutes);
app.use('/api', doctorsRoutes);
app.use('/api/gp', gpRoutes);
app.use('/api/nurses', nursesRoutes);
console.log('✅ Nurses routes registered at /api/nurses');

// Register consent forms routes with explicit logging
console.log('🔧 Registering consent forms routes at /api/consent-forms');
console.log('🔧 Consent forms routes file imported:', consentFormRoutes ? 'YES' : 'NO');
app.use('/api/consent-forms', (req, res, next) => {
  console.log(`🔍 [Consent Forms Router] ${req.method} ${req.originalUrl}`);
  console.log(`🔍 [Consent Forms Router] Path: ${req.path}`);
  console.log(`🔍 [Consent Forms Router] Base URL: ${req.baseUrl}`);
  next();
}, consentFormRoutes);
console.log('✅ Consent forms routes registered at /api/consent-forms');
console.log('✅ Available routes: GET /api/consent-forms/templates, POST /api/consent-forms/templates, etc.');
app.use('/api/kpi', kpiRoutes);
console.log('✅ KPI routes registered at /api/kpi');
app.use('/api/export', exportRoutes);
console.log('✅ Export routes registered at /api/export');
app.use('/api/guidelines', guidelineRoutes);
console.log('✅ Guidelines routes registered at /api/guidelines');

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Validate CORS configuration
    const corsValid = validateCorsConfig();
    if (!corsValid) {
      console.error('❌ CORS configuration is invalid. Please check your environment variables.');
      console.error('   Set FRONTEND_URL to your production frontend URL in .env file.');
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }

    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Initialize database tables
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      console.error('❌ Failed to initialize database. Exiting...');
      process.exit(1);
    }

    // Initialize notifications table
    await initializeNotificationsTable();

    // Initialize automatic no-show scheduler
    initAutoNoShowScheduler();

    // Initialize automatic appointment scheduler
    const { initAutoAppointmentScheduler } = await import('./schedulers/autoAppointmentScheduler.js');
    initAutoAppointmentScheduler();

    console.log(`⏰ Auto appointment scheduler: Active (runs daily at 2:00 AM)`);

    // Initialize baseline calculation scheduler
    const { initBaselineCalculationScheduler } = await import('./schedulers/baselineCalculationScheduler.js');
    initBaselineCalculationScheduler();

    console.log(`⏰ Baseline calculation scheduler: Active (runs daily at 3:00 AM)`);

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log(`✅ Token refresh endpoint: http://localhost:${PORT}/api/auth/refresh-token`);
      console.log(`⏰ Auto no-show scheduler: Active (runs every hour)`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

startServer();
