# Urology Patient Management System - Setup Instructions

This document provides step-by-step instructions to set up both the backend and frontend of the Urology Patient Management System.

## System Overview

- **Backend**: Node.js + Express + PostgreSQL + JWT Authentication
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: PostgreSQL
- **Authentication**: JWT with access and refresh tokens

## Prerequisites

Before starting, ensure you have the following installed:

1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **PostgreSQL** (v12 or higher) - [Download here](https://www.postgresql.org/download/)
3. **Git** (optional) - [Download here](https://git-scm.com/)

## Backend Setup

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
# Copy the example environment file
copy env.example .env
```

Edit the `.env` file with your configuration:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=urology_db
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password

# JWT Configuration (Generate strong secrets)
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_secure
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_here_make_it_long_and_secure
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

### 4. Set Up PostgreSQL Database

#### Option A: Using psql (Command Line)
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE urology_db;

-- Exit psql
\q
```

#### Option B: Using pgAdmin (GUI)
1. Open pgAdmin
2. Right-click on "Databases"
3. Select "Create" > "Database"
4. Name: `urology_db`
5. Click "Save"

### 5. Initialize Database Tables
```bash
npm run setup-db
```

### 6. Start the Backend Server
```bash
# Development mode (with auto-restart)
npm run dev

# Or production mode
npm start
```

The backend will be available at: `http://localhost:5000`

## Frontend Setup

### 1. Navigate to Frontend Directory
```bash
cd frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Frontend Development Server
```bash
npm run dev
```

The frontend will be available at: `http://localhost:5173`

## Quick Start (Windows)

### Backend Quick Start
1. Open Command Prompt in the `backend` directory
2. Run: `setup.bat`
3. Edit `.env` file with your database credentials
4. Run: `start.bat`

### Frontend Quick Start
1. Open Command Prompt in the `frontend` directory
2. Run: `npm install`
3. Run: `npm run dev`

## Testing the Setup

### 1. Backend Health Check
Visit: `http://localhost:5000/health`

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

### 2. Frontend Access
Visit: `http://localhost:5173`

You should see the login page with:
- Login form
- Register button
- Role selection (Urologist, GP, Nurse)

### 3. Test Registration
1. Click "Create one here" on the login page
2. Fill out the registration form
3. Submit the form
4. You should be redirected to login with a success message

### 4. Test Login
1. Use the registered credentials to login
2. You should be redirected to the appropriate dashboard based on role

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/refresh-token` | Refresh access token |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/profile` | Get user profile |

### Example API Calls

#### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@hospital.com",
    "password": "SecurePass123!",
    "role": "urologist"
  }'
```

#### Login User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@hospital.com",
    "password": "SecurePass123!"
  }'
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Error
- **Error**: "Database connection failed"
- **Solution**: 
  - Check PostgreSQL is running
  - Verify database credentials in `.env`
  - Ensure database `urology_db` exists

#### 2. Port Already in Use
- **Error**: "Port 5000 is already in use"
- **Solution**: 
  - Change PORT in `.env` file
  - Or kill the process using port 5000

#### 3. CORS Error
- **Error**: "CORS policy" error in browser
- **Solution**: 
  - Check `FRONTEND_URL` in `.env` matches frontend URL
  - Ensure frontend is running on correct port

#### 4. JWT Secret Error
- **Error**: "JWT secret not defined"
- **Solution**: 
  - Set `JWT_SECRET` and `JWT_REFRESH_SECRET` in `.env`
  - Use strong, unique secrets

### Logs and Debugging

#### Backend Logs
- Development: Logs appear in console
- Check for error messages and stack traces

#### Frontend Logs
- Open browser Developer Tools (F12)
- Check Console tab for errors
- Check Network tab for API call failures

## Development Workflow

### 1. Backend Development
1. Make changes to backend code
2. Server auto-restarts (if using `npm run dev`)
3. Test API endpoints using Postman or curl

### 2. Frontend Development
1. Make changes to frontend code
2. Browser auto-refreshes (if using `npm run dev`)
3. Test UI changes in browser

### 3. Database Changes
1. Modify database schema in `config/database.js`
2. Run `npm run setup-db` to apply changes
3. Update API endpoints as needed

## Production Deployment

### Backend Production
1. Set `NODE_ENV=production` in `.env`
2. Use `npm start` instead of `npm run dev`
3. Set up process manager (PM2) for production
4. Configure reverse proxy (Nginx)

### Frontend Production
1. Run `npm run build`
2. Serve the `dist` folder with a web server
3. Update `FRONTEND_URL` in backend `.env`

## Support

If you encounter issues:

1. Check the logs for error messages
2. Verify all prerequisites are installed
3. Ensure all environment variables are set correctly
4. Check that PostgreSQL is running and accessible
5. Verify ports 5000 and 5173 are available

## Next Steps

Once the basic setup is working:

1. **Connect Frontend to Backend**: Update frontend to use actual API endpoints
2. **Add More Features**: Implement patient management, appointments, etc.
3. **Add Tests**: Write unit and integration tests
4. **Add Documentation**: Create API documentation
5. **Deploy**: Set up production deployment

## File Structure

```
latesturology/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   └── auth.js
│   ├── scripts/
│   │   └── setup-db.js
│   ├── tests/
│   │   └── auth.test.js
│   ├── utils/
│   │   ├── jwt.js
│   │   └── validation.js
│   ├── server.js
│   ├── package.json
│   ├── env.example
│   └── README.md
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── auth/
    │   │       ├── Login.jsx
    │   │       └── Register.jsx
    │   ├── AppRoutes.jsx
    │   └── ...
    ├── package.json
    └── ...
```
