# Urology Backend API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require an `Authorization` header with a Bearer token:
```
Authorization: Bearer <access_token>
```

## Endpoints

### 1. User Registration

**POST** `/auth/register`

Register a new user in the system.

**Request Body:**
```json
{
  "firstName": "string (required, min: 2, max: 50)",
  "lastName": "string (required, min: 2, max: 50)",
  "email": "string (required, valid email)",
  "password": "string (required, min: 8, must contain uppercase, lowercase, number, special character)",
  "role": "string (required, one of: 'urologist', 'gp', 'nurse')"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "john.doe@hospital.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "urologist",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation errors
- `409 Conflict` - Email already exists

### 2. User Login

**POST** `/auth/login`

Authenticate user and return access tokens.

**Request Body:**
```json
{
  "email": "string (required, valid email)",
  "password": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "john.doe@hospital.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "urologist",
      "is_active": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Invalid credentials

### 3. Refresh Access Token

**POST** `/auth/refresh-token`

Get a new access token using a valid refresh token.

**Request Body:**
```json
{
  "refreshToken": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Invalid or expired refresh token

### 4. User Logout

**POST** `/auth/logout`

Revoke refresh token and logout user.

**Request Body:**
```json
{
  "refreshToken": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### 5. Get User Profile

**GET** `/auth/profile`

Get current user profile information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "john.doe@hospital.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "urologist",
      "is_active": true
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ]
}
```

## Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Validation error or invalid input |
| 401 | Unauthorized - Authentication required or invalid |
| 403 | Forbidden - Insufficient permissions |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error - Server error |

## CORS

- **Allowed Origins**: Configurable via `FRONTEND_URL` environment variable
- **Default**: `http://localhost:5173`
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization

## Security Features

1. **Password Hashing**: bcryptjs with salt rounds
2. **JWT Tokens**: Secure token-based authentication
3. **Token Rotation**: Refresh tokens are rotated on each use
5. **Input Validation**: Comprehensive request validation
6. **SQL Injection Prevention**: Parameterized queries
7. **CORS Protection**: Configurable cross-origin resource sharing

## Testing

Run the test suite:
```bash
npm test
```

Run specific test file:
```bash
npm test tests/auth.test.js
```

## Health Check

**GET** `/health`

Check server status.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```
