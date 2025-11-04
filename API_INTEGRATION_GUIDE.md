# API Integration Guide

## Overview
This guide explains how to integrate the UroPrep backend API with the frontend application, including security measures and best practices.

## Backend API Endpoints

### Authentication Endpoints

#### 1. Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "organization": "General Hospital",
  "password": "SecurePass123!",
  "role": "urologist"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration initiated. Please check your email for OTP verification.",
  "data": {
    "userId": 123,
    "email": "john.doe@example.com",
    "requiresVerification": true
  }
}
```

#### 2. Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "otp": "123456",
  "type": "registration"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration completed successfully",
  "data": {
    "user": {
      "id": 123,
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "organization": "General Hospital",
      "role": "urologist",
      "isActive": true,
      "isVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 3. Resend OTP
```http
POST /api/auth/resend-otp
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "type": "registration"
}
```

#### 4. Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

#### 5. Refresh Token
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 6. Logout User
```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 7. Get User Profile
```http
GET /api/auth/profile
Authorization: Bearer <access_token>
```

## Frontend Integration

### 1. Axios Configuration
The frontend uses a configured axios instance with automatic token management:

```javascript
import apiClient from '../config/axios.js';

// Automatic token attachment and refresh
const response = await apiClient.post('/auth/login', loginData);
```

### 2. Authentication Service
Use the auth service for all authentication operations:

```javascript
import authService from '../services/authService.js';

// Register user
const registerResponse = await authService.register(userData);

// Verify OTP
const otpResponse = await authService.verifyOTP(email, otp, 'registration');

// Login user
const loginResponse = await authService.login(email, password);

// Check authentication status
const isAuthenticated = authService.isAuthenticated();

// Get current user
const user = authService.getCurrentUser();
```

### 3. Token Management
The token service handles secure token storage and management:

```javascript
import tokenService from '../services/tokenService.js';

// Check if user is authenticated
const isAuth = tokenService.isAuthenticated();

// Get user role
const role = tokenService.getUserRole();

// Check if user has specific role
const isUrologist = tokenService.hasRole('urologist');

// Get user data
const user = tokenService.getUser();
```

## Security Features

### 1. Rate Limiting
- **General**: 100 requests per 15 minutes per IP
- **Authentication**: 5 attempts per 15 minutes per IP
- **OTP**: 3 requests per 5 minutes per IP
- **Registration**: 3 attempts per hour per IP

### 2. Input Validation
- **Client-side**: Real-time validation with immediate feedback
- **Server-side**: Comprehensive validation using Joi and express-validator
- **Sanitization**: XSS protection using DOMPurify

### 3. Password Security
- **Requirements**: Minimum 8 characters with uppercase, lowercase, number, and special character
- **Hashing**: bcrypt with 12 salt rounds
- **No Spaces**: Passwords cannot contain spaces

### 4. OTP Security
- **Generation**: Cryptographically secure 6-digit OTP
- **Expiration**: 10-minute validity period
- **Attempts**: Maximum 3 verification attempts
- **One-time Use**: Each OTP can only be used once

### 5. JWT Security
- **Access Token**: 15-minute expiration
- **Refresh Token**: 7-day expiration
- **Secure Storage**: Tokens stored in localStorage with validation
- **Auto-refresh**: Automatic token renewal before expiration

## Error Handling

### API Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### Frontend Error Handling
```javascript
try {
  const response = await authService.register(userData);
  // Handle success
} catch (error) {
  // Error object contains:
  // - message: User-friendly error message
  // - type: Error type (validation, auth, network, etc.)
  // - errors: Array of field-specific errors (for validation)
  console.error('Registration failed:', error.message);
}
```

## Environment Configuration

### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=urology_db
DB_USER=postgres
DB_PASSWORD=secure_password

# JWT
JWT_SECRET=your_strong_jwt_secret
JWT_REFRESH_SECRET=your_strong_refresh_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env)
```env
VITE_API_URL=https://api.yourdomain.com/api
VITE_APP_NAME=UroPrep
VITE_NODE_ENV=production
```

## Testing

### Backend Security Tests
```bash
cd backend
npm run test-security
```

### Manual Testing Checklist
- [ ] User registration with OTP verification
- [ ] User login with proper authentication
- [ ] Token refresh functionality
- [ ] Rate limiting enforcement
- [ ] Input validation on all fields
- [ ] Password strength requirements
- [ ] OTP expiration and attempt limits
- [ ] Error handling and user feedback
- [ ] Security headers validation
- [ ] CORS configuration

## Deployment Considerations

### Production Security
1. **HTTPS**: Always use HTTPS in production
2. **Environment Variables**: Use secure environment variable management
3. **Database Security**: Use connection pooling and secure credentials
4. **Monitoring**: Implement security monitoring and alerting
5. **Updates**: Regular security updates and dependency management

### Performance Optimization
1. **Database Indexes**: Optimized for security and performance
2. **Connection Pooling**: Efficient database connections
3. **Caching**: Implement appropriate caching strategies
4. **Rate Limiting**: Balanced security and usability

## Troubleshooting

### Common Issues

#### 1. CORS Errors
- Ensure FRONTEND_URL is correctly configured
- Check CORS middleware configuration
- Verify request headers

#### 2. Token Issues
- Check token expiration
- Verify token format
- Ensure proper token storage

#### 3. Rate Limiting
- Check rate limit configuration
- Monitor request patterns
- Adjust limits if needed

#### 4. Database Connection
- Verify database credentials
- Check connection pool settings
- Monitor connection usage

## Support

For technical support or security concerns:
- Development Team: [Contact Information]
- Security Team: [Contact Information]
- Documentation: [Link to Documentation]

## Changelog

### Version 1.0.0
- Initial API implementation
- OTP-based registration flow
- JWT authentication system
- Comprehensive security measures
- Rate limiting and input validation
- Frontend integration with axios

