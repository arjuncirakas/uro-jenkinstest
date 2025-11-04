# Patient Management API Documentation

## Overview
The Patient Management API provides comprehensive functionality for managing patient records in the urology department. This API supports creating, reading, updating, and deleting patient records with proper role-based access control.

## Base URL
```
http://localhost:5000/api/patients
```

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Role-Based Access Control
- **Urologists** (`urologist`): Full access to all patient operations
- **Urology Nurses** (`urology_nurse`): Full access to all patient operations
- **General Practitioners** (`gp`): Read-only access to patient records

## Endpoints

### 1. Get API Information
**GET** `/api/patients`

Returns information about available endpoints and required permissions.

**Response:**
```json
{
  "success": true,
  "message": "Patient Management API",
  "endpoints": {
    "addPatient": "POST /api/patients",
    "getPatients": "GET /api/patients",
    "getPatientById": "GET /api/patients/:id",
    "updatePatient": "PUT /api/patients/:id",
    "deletePatient": "DELETE /api/patients/:id"
  },
  "permissions": {
    "addPatient": "urologist, urology_nurse",
    "getPatients": "urologist, urology_nurse, gp",
    "getPatientById": "urologist, urology_nurse, gp",
    "updatePatient": "urologist, urology_nurse",
    "deletePatient": "urologist, urology_nurse"
  }
}
```

### 2. Add New Patient
**POST** `/api/patients`

Creates a new patient record. Accessible by urologists and nurses.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "dateOfBirth": "1980-05-15",
  "gender": "Male",
  "phone": "+61 412 345 678",
  "email": "john.smith@email.com",
  "address": "123 Main Street",
  "postcode": "2000",
  "city": "Sydney",
  "state": "NSW",
  "referringDepartment": "General Practice",
  "referralDate": "2024-01-15",
  "initialPSA": 4.5,
  "initialPSADate": "2024-01-10",
  "medicalHistory": "No significant medical history",
  "currentMedications": "None",
  "allergies": "None known",
  "assignedUrologist": "Dr. Sarah Wilson",
  "emergencyContactName": "Jane Smith",
  "emergencyContactPhone": "+61 412 345 679",
  "emergencyContactRelationship": "Spouse",
  "priority": "Normal",
  "notes": "Initial consultation for elevated PSA levels"
}
```

**Required Fields:**
- `firstName` (string, 2-100 chars, letters and spaces only)
- `lastName` (string, 2-100 chars, letters and spaces only)
- `dateOfBirth` (date, cannot be in future)
- `gender` (enum: "Male", "Female", "Other")

**Optional Fields:**
- `phone` (string, valid phone format)
- `email` (string, valid email format)
- `address` (string, max 500 chars)
- `postcode` (string, max 10 chars)
- `city` (string, max 100 chars)
- `state` (string, max 10 chars)
- `referringDepartment` (string, max 255 chars)
- `referralDate` (date, cannot be in future)
- `initialPSA` (number, 0-999.99, 2 decimal places)
- `initialPSADate` (date, cannot be in future)
- `medicalHistory` (string, max 2000 chars)
- `currentMedications` (string, max 2000 chars)
- `allergies` (string, max 1000 chars)
- `assignedUrologist` (string, max 255 chars)
- `emergencyContactName` (string, max 100 chars)
- `emergencyContactPhone` (string, valid phone format)
- `emergencyContactRelationship` (string, max 50 chars)
- `priority` (enum: "Low", "Normal", "High", "Urgent", default: "Normal")
- `notes` (string, max 2000 chars)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Patient added successfully",
  "data": {
    "patient": {
      "id": 1,
      "upi": "URP2024001",
      "firstName": "John",
      "lastName": "Smith",
      "fullName": "John Smith",
      "dateOfBirth": "1980-05-15",
      "age": 44,
      "gender": "Male",
      "phone": "+61 412 345 678",
      "email": "john.smith@email.com",
      "address": "123 Main Street",
      "postcode": "2000",
      "city": "Sydney",
      "state": "NSW",
      "referringDepartment": "General Practice",
      "referralDate": "2024-01-15",
      "initialPSA": 4.5,
      "initialPSADate": "2024-01-10",
      "medicalHistory": "No significant medical history",
      "currentMedications": "None",
      "allergies": "None known",
      "assignedUrologist": "Dr. Sarah Wilson",
      "emergencyContactName": "Jane Smith",
      "emergencyContactPhone": "+61 412 345 679",
      "emergencyContactRelationship": "Spouse",
      "priority": "Normal",
      "notes": "Initial consultation for elevated PSA levels",
      "status": "Active",
      "createdBy": 1,
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**
- `400` - Validation errors
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `409` - Conflict (duplicate email/phone/UPI)
- `500` - Internal server error

### 3. Get All Patients
**GET** `/api/patients/list`

Retrieves a paginated list of patients. Accessible by urologists, nurses, and GPs.

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50) - Items per page
- `search` (string) - Search in name, UPI, phone, email
- `status` (string, default: "Active") - Filter by status
- `assignedUrologist` (string) - Filter by assigned urologist
- `sortBy` (string, default: "created_at") - Sort field
- `sortOrder` (string, default: "DESC") - Sort order (ASC/DESC)

**Example Request:**
```
GET /api/patients/list?page=1&limit=10&search=John&status=Active&assignedUrologist=Dr. Sarah Wilson
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "patients": [
      {
        "id": 1,
        "upi": "URP2024001",
        "firstName": "John",
        "lastName": "Smith",
        "fullName": "John Smith",
        "dateOfBirth": "1980-05-15",
        "age": 44,
        "gender": "Male",
        "phone": "+61 412 345 678",
        "email": "john.smith@email.com",
        "address": "123 Main Street",
        "postcode": "2000",
        "city": "Sydney",
        "state": "NSW",
        "referringDepartment": "General Practice",
        "referralDate": "2024-01-15",
        "initialPSA": 4.5,
        "initialPSADate": "2024-01-10",
        "medicalHistory": "No significant medical history",
        "currentMedications": "None",
        "allergies": "None known",
        "assignedUrologist": "Dr. Sarah Wilson",
        "emergencyContactName": "Jane Smith",
        "emergencyContactPhone": "+61 412 345 679",
        "emergencyContactRelationship": "Spouse",
        "priority": "Normal",
        "notes": "Initial consultation for elevated PSA levels",
        "status": "Active",
        "createdBy": 1,
        "createdByName": "Dr. Admin User",
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### 4. Get Patient by ID
**GET** `/api/patients/:id`

Retrieves a specific patient by ID. Accessible by urologists, nurses, and GPs.

**Path Parameters:**
- `id` (number) - Patient ID

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "patient": {
      "id": 1,
      "upi": "URP2024001",
      "firstName": "John",
      "lastName": "Smith",
      "fullName": "John Smith",
      "dateOfBirth": "1980-05-15",
      "age": 44,
      "gender": "Male",
      "phone": "+61 412 345 678",
      "email": "john.smith@email.com",
      "address": "123 Main Street",
      "postcode": "2000",
      "city": "Sydney",
      "state": "NSW",
      "referringDepartment": "General Practice",
      "referralDate": "2024-01-15",
      "initialPSA": 4.5,
      "initialPSADate": "2024-01-10",
      "medicalHistory": "No significant medical history",
      "currentMedications": "None",
      "allergies": "None known",
      "assignedUrologist": "Dr. Sarah Wilson",
      "emergencyContactName": "Jane Smith",
      "emergencyContactPhone": "+61 412 345 679",
      "emergencyContactRelationship": "Spouse",
      "priority": "Normal",
      "notes": "Initial consultation for elevated PSA levels",
      "status": "Active",
      "createdBy": 1,
      "createdByName": "Dr. Admin User",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**
- `404` - Patient not found
- `401` - Unauthorized
- `403` - Forbidden
- `500` - Internal server error

### 5. Update Patient
**PUT** `/api/patients/:id`

Updates an existing patient record. Accessible by urologists and nurses.

**Path Parameters:**
- `id` (number) - Patient ID

**Request Body:**
All fields are optional. Only provided fields will be updated.

```json
{
  "notes": "Updated notes - patient responded well to initial consultation",
  "priority": "High",
  "assignedUrologist": "Dr. Michael Chen"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Patient updated successfully",
  "data": {
    "patient": {
      "id": 1,
      "upi": "URP2024001",
      "firstName": "John",
      "lastName": "Smith",
      "fullName": "John Smith",
      "dateOfBirth": "1980-05-15",
      "age": 44,
      "gender": "Male",
      "phone": "+61 412 345 678",
      "email": "john.smith@email.com",
      "address": "123 Main Street",
      "postcode": "2000",
      "city": "Sydney",
      "state": "NSW",
      "referringDepartment": "General Practice",
      "referralDate": "2024-01-15",
      "initialPSA": 4.5,
      "initialPSADate": "2024-01-10",
      "medicalHistory": "No significant medical history",
      "currentMedications": "None",
      "allergies": "None known",
      "assignedUrologist": "Dr. Michael Chen",
      "emergencyContactName": "Jane Smith",
      "emergencyContactPhone": "+61 412 345 679",
      "emergencyContactRelationship": "Spouse",
      "priority": "High",
      "notes": "Updated notes - patient responded well to initial consultation",
      "status": "Active",
      "createdBy": 1,
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T11:45:00.000Z"
    }
  }
}
```

### 6. Delete Patient (Soft Delete)
**DELETE** `/api/patients/:id`

Soft deletes a patient by setting status to "Inactive". Accessible by urologists and nurses.

**Path Parameters:**
- `id` (number) - Patient ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Patient deleted successfully"
}
```

**Error Responses:**
- `404` - Patient not found
- `401` - Unauthorized
- `403` - Forbidden
- `500` - Internal server error

## Error Handling

### Validation Errors (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "firstName",
      "message": "First name is required"
    },
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### Unauthorized Access (401)
```json
{
  "success": false,
  "message": "Access token required"
}
```

### Forbidden Access (403)
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### Conflict Errors (409)
```json
{
  "success": false,
  "message": "Patient with this email already exists"
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Patient not found"
}
```

### Internal Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Rate Limiting
All endpoints are subject to rate limiting:
- General rate limit: 100 requests per 15 minutes per IP
- Additional rate limits may apply based on endpoint

## Security Features
- JWT-based authentication
- Role-based access control
- XSS protection on all inputs
- Input validation and sanitization
- SQL injection prevention
- Rate limiting

## Testing
Use the provided test script to verify API functionality:
```bash
node scripts/test-patient-api.js
```

## Database Schema
The patient data is stored in the `patients` table with the following structure:
- `id` (SERIAL PRIMARY KEY)
- `upi` (VARCHAR(20) UNIQUE) - Auto-generated unique patient identifier
- Personal information fields
- Medical information fields
- Emergency contact fields
- Audit fields (created_by, created_at, updated_at)
- Status and priority fields

## Notes
- UPI (Urology Patient ID) is automatically generated in format: URP{YYYY}{XXXX}
- Age is calculated dynamically from date of birth
- All timestamps are in UTC
- Soft delete is implemented (status set to "Inactive")
- Database indexes are created for optimal query performance


