// Global error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler] Error:', err);
  console.error('[Error Handler] Error stack:', err.stack);
  console.error('[Error Handler] Request path:', req.path);
  console.error('[Error Handler] Request method:', req.method);

  // Default error
  let error = {
    success: false,
    message: 'Internal Server Error',
    statusCode: 500
  };

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      success: false,
      message: `Validation Error: ${message}`,
      statusCode: 400
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      success: false,
      message: 'Invalid token',
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      success: false,
      message: 'Token expired',
      statusCode: 401
    };
  }

  // PostgreSQL unique constraint error
  if (err.code === '23505') {
    error = {
      success: false,
      message: 'Duplicate entry. This record already exists.',
      statusCode: 409
    };
  }

  // PostgreSQL foreign key constraint error
  if (err.code === '23503') {
    error = {
      success: false,
      message: 'Referenced record does not exist.',
      statusCode: 400
    };
  }

  // PostgreSQL not null constraint error
  if (err.code === '23502') {
    error = {
      success: false,
      message: 'Required field is missing.',
      statusCode: 400
    };
  }

  // 404 Not Found error
  if (err.statusCode === 404) {
    error = {
      success: false,
      message: err.message,
      statusCode: 404
    };
  }

  // Ensure response hasn't been sent
  if (!res.headersSent) {
    // Ensure CORS headers are set even in error responses
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    }
    
    res.status(error.statusCode).json({
      success: error.success,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        error: err.message,
        code: err.code
      })
    });
  } else {
    console.error('[Error Handler] Response already sent, cannot send error response');
  }
};

// 404 handler
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};
