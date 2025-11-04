# Superadmin Setup Guide

This guide explains how to set up and use the superadmin functionality in the Urology Patient Management System.

## Overview

The superadmin system allows administrators to:
- Create new user accounts for GPs, Urologists, and Urology Nurses
- Send password setup emails to new users
- Manage all user accounts in the system
- Monitor user activity and status

## Backend Setup

### 1. Database Updates

The system automatically creates the necessary database tables and updates:
- Adds `superadmin` role to the users table
- Creates `password_setup_tokens` table for secure password setup
- Updates OTP verification types to include `password_setup`

### 2. Environment Variables

Add these variables to your `secure.env` file:

```env
# Superadmin Configuration
SUPERADMIN_EMAIL=admin@urology.com
SUPERADMIN_PASSWORD=SuperAdmin123!
```

### 3. Create Superadmin User

Run the superadmin creation script:

```bash
# Windows
cd backend
create-superadmin.bat

# Or manually
node scripts/create-superadmin.js
```

This will create a superadmin user with the credentials specified in your environment variables.

## Frontend Setup

### 1. New Routes Added

- `/superadmin/dashboard` - Superadmin dashboard
- `/superadmin/users` - User management page
- `/superadmin/users/new` - Add new user page
- `/setup-password` - Password setup page for new users

### 2. New Components

- `SuperadminLayout` - Layout component for superadmin pages
- `SuperadminDashboard` - Dashboard with user statistics
- `Users` - User management interface
- `AddUser` - Form to create new users
- `SetupPassword` - Password setup form for new users

## How It Works

### 1. User Creation Process

1. **Superadmin creates user**: Uses the "Add User" form to enter user details
2. **System generates temporary password**: A secure temporary password is created
3. **Password setup token generated**: A unique token is created with 24-hour expiry
4. **Email sent**: User receives an email with a link to set up their password
5. **User sets password**: User clicks the link and sets their own password
6. **Account activated**: User account is activated and ready to use

### 2. Email Templates

The system includes a new email template for password setup:
- Professional HTML email design
- Clear call-to-action button
- 24-hour expiry notice
- Fallback text version

### 3. Security Features

- **Token-based setup**: Secure tokens prevent unauthorized access
- **Time-limited tokens**: 24-hour expiry for security
- **One-time use**: Tokens are invalidated after use
- **Strong password requirements**: Enforced during setup
- **Role-based access**: Only superadmins can create users

## API Endpoints

### Superadmin Endpoints

- `POST /api/superadmin/users` - Create new user
- `GET /api/superadmin/users` - Get all users (with pagination and filters)
- `GET /api/superadmin/users/:id` - Get user by ID
- `PUT /api/superadmin/users/:id` - Update user
- `DELETE /api/superadmin/users/:id` - Delete user
- `POST /api/superadmin/users/:id/resend-password-setup` - Resend setup email

### Public Endpoints

- `POST /api/superadmin/setup-password` - Setup password for new user

## Usage Instructions

### 1. Login as Superadmin

1. Go to the login page
2. Use the superadmin credentials created during setup
3. You'll be redirected to the superadmin dashboard

### 2. Create New Users

1. Click "Add User" or go to `/superadmin/users/new`
2. Fill in the user details:
   - First Name
   - Last Name
   - Email Address
   - Phone Number
   - Organization/Hospital
   - Role (GP, Urologist, or Urology Nurse)
3. Click "Create User"
4. The system will send a password setup email to the user

### 3. Manage Users

1. Go to `/superadmin/users` to see all users
2. Use filters to search by name, email, role, or status
3. View user status (Active, Pending Setup, Inactive)
4. Edit user details
5. Resend password setup emails if needed
6. Delete users if necessary

### 4. User Password Setup

When a new user receives the setup email:
1. They click the "Set Up Password" button
2. They're taken to the password setup page
3. They create a secure password following the requirements
4. Their account is activated and they can login

## Security Considerations

### 1. Superadmin Access

- Superadmin accounts should be created only by system administrators
- Use strong passwords for superadmin accounts
- Consider implementing additional 2FA for superadmin accounts

### 2. User Creation

- Only superadmins can create new users
- All user creation is logged
- Email verification is required before account activation

### 3. Password Setup

- Tokens expire after 24 hours
- Tokens are single-use only
- Strong password requirements are enforced
- No password reuse is allowed

## Troubleshooting

### Common Issues

1. **Email not sending**: Check SMTP configuration in `secure.env`
2. **Token expired**: Resend password setup email from user management
3. **User can't access setup page**: Verify token is correct and not expired
4. **Database errors**: Ensure all migrations have been run

### Debug Steps

1. Check server logs for errors
2. Verify database connection
3. Test email configuration
4. Check token validity in database

## Future Enhancements

Potential improvements to consider:
- Bulk user import from CSV
- User role management
- Advanced user analytics
- Audit logging for user actions
- Email template customization
- User invitation system

## Support

For technical support or questions about the superadmin system:
1. Check the server logs
2. Verify configuration settings
3. Test with a simple user creation
4. Contact the development team if issues persist

