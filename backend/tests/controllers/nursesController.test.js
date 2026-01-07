/**
 * Comprehensive tests for nursesController.js to achieve 100% coverage
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
const mockPool = {
  connect: jest.fn()
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

const mockSendPasswordSetupEmail = jest.fn().mockResolvedValue({ success: true });
jest.unstable_mockModule('../services/emailService.js', () => ({
  sendPasswordSetupEmail: mockSendPasswordSetupEmail
}));

const mockHelperFunctions = {
  getAllUsersByRole: jest.fn(),
  getUserByIdAndRole: jest.fn(),
  checkEmailExists: jest.fn(),
  checkPhoneExists: jest.fn(),
  hashPassword: jest.fn(),
  softDeleteUserByRole: jest.fn(),
  getValidationErrors: jest.fn(),
  handleUniqueConstraintError: jest.fn(),
  createErrorResponse: jest.fn((res, status, message) => res.status(status).json({ success: false, error: message })),
  createSuccessResponse: jest.fn((res, data) => res.status(200).json({ success: true, ...data }))
};

jest.unstable_mockModule('./userControllerHelper.js', () => mockHelperFunctions);

describe('nursesController', () => {
  let nursesController;
  let mockReq;
  let mockRes;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
    
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 1, role: 'superadmin' }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    nursesController = await import('../controllers/nursesController.js');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAllNurses', () => {
    it('should get all active nurses when is_active is true', async () => {
      mockReq.query = { is_active: true };
      mockHelperFunctions.getAllUsersByRole.mockResolvedValue({
        success: true,
        data: [{ id: 1, name: 'Nurse 1' }],
        count: 1
      });

      await nursesController.getAllNurses(mockReq, mockRes);

      expect(mockHelperFunctions.getAllUsersByRole).toHaveBeenCalledWith('urology_nurse', true);
      expect(mockHelperFunctions.createSuccessResponse).toHaveBeenCalled();
    });

    it('should get all active nurses when is_active is "true" string', async () => {
      mockReq.query = { is_active: 'true' };
      mockHelperFunctions.getAllUsersByRole.mockResolvedValue({
        success: true,
        data: [],
        count: 0
      });

      await nursesController.getAllNurses(mockReq, mockRes);

      expect(mockHelperFunctions.getAllUsersByRole).toHaveBeenCalledWith('urology_nurse', true);
    });

    it('should get inactive nurses when is_active is false', async () => {
      mockReq.query = { is_active: false };
      mockHelperFunctions.getAllUsersByRole.mockResolvedValue({
        success: true,
        data: [],
        count: 0
      });

      await nursesController.getAllNurses(mockReq, mockRes);

      expect(mockHelperFunctions.getAllUsersByRole).toHaveBeenCalledWith('urology_nurse', false);
    });

    it('should handle error when getAllUsersByRole fails', async () => {
      mockReq.query = { is_active: true };
      mockHelperFunctions.getAllUsersByRole.mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      await nursesController.getAllNurses(mockReq, mockRes);

      expect(mockHelperFunctions.createErrorResponse).toHaveBeenCalledWith(mockRes, 500, 'Database error');
    });
  });

  describe('getNurseById', () => {
    it('should get nurse by ID successfully', async () => {
      mockReq.params = { id: '1' };
      mockHelperFunctions.getUserByIdAndRole.mockResolvedValue({
        success: true,
        data: { id: 1, name: 'Nurse 1' }
      });

      await nursesController.getNurseById(mockReq, mockRes);

      expect(mockHelperFunctions.getUserByIdAndRole).toHaveBeenCalledWith('1', 'urology_nurse', 'Nurse');
      expect(mockHelperFunctions.createSuccessResponse).toHaveBeenCalled();
    });

    it('should return 404 when nurse not found', async () => {
      mockReq.params = { id: '999' };
      mockHelperFunctions.getUserByIdAndRole.mockResolvedValue({
        success: false,
        notFound: true,
        error: 'Nurse not found'
      });

      await nursesController.getNurseById(mockReq, mockRes);

      expect(mockHelperFunctions.createErrorResponse).toHaveBeenCalledWith(mockRes, 404, 'Nurse not found');
    });

    it('should return 500 when database error occurs', async () => {
      mockReq.params = { id: '1' };
      mockHelperFunctions.getUserByIdAndRole.mockResolvedValue({
        success: false,
        notFound: false,
        error: 'Database error'
      });

      await nursesController.getNurseById(mockReq, mockRes);

      expect(mockHelperFunctions.createErrorResponse).toHaveBeenCalledWith(mockRes, 500, 'Database error');
    });
  });

  describe('createNurse', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'nurse@test.com',
        first_name: 'Test',
        last_name: 'Nurse',
        phone: '1234567890',
        organization: 'Test Org'
      };
    });

    it('should create nurse successfully with email sent', async () => {
      mockHelperFunctions.getValidationErrors.mockReturnValue({ hasErrors: false });
      mockHelperFunctions.checkEmailExists.mockResolvedValue(false);
      mockHelperFunctions.checkPhoneExists.mockResolvedValue(false);
      mockHelperFunctions.hashPassword.mockResolvedValue('hashed_password');
      mockSendPasswordSetupEmail.mockResolvedValue({ success: true });
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'nurse@test.com', first_name: 'Test', last_name: 'Nurse', phone: '1234567890', organization: 'Test Org', role: 'urology_nurse', created_at: new Date() }] }) // INSERT
        .mockResolvedValueOnce({}) // INSERT password_setup_tokens
        .mockResolvedValueOnce({}); // COMMIT

      await nursesController.createNurse(mockReq, mockRes);

      expect(mockClient.query).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create nurse successfully without email sent', async () => {
      mockHelperFunctions.getValidationErrors.mockReturnValue({ hasErrors: false });
      mockHelperFunctions.checkEmailExists.mockResolvedValue(false);
      mockHelperFunctions.checkPhoneExists.mockResolvedValue(false);
      mockHelperFunctions.hashPassword.mockResolvedValue('hashed_password');
      mockSendPasswordSetupEmail.mockRejectedValue(new Error('Email error'));
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'nurse@test.com', first_name: 'Test', last_name: 'Nurse', phone: '1234567890', organization: 'Test Org', role: 'urology_nurse', created_at: new Date() }] }) // INSERT
        .mockResolvedValueOnce({}) // INSERT password_setup_tokens
        .mockResolvedValueOnce({}); // COMMIT

      await nursesController.createNurse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ 
        success: true,
        message: expect.stringContaining('email sending failed')
      }));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return validation errors', async () => {
      mockHelperFunctions.getValidationErrors.mockReturnValue({ 
        hasErrors: true, 
        details: ['Invalid email'] 
      });
      mockClient.query.mockResolvedValueOnce({}); // BEGIN

      await nursesController.createNurse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return error if email exists', async () => {
      mockHelperFunctions.getValidationErrors.mockReturnValue({ hasErrors: false });
      mockHelperFunctions.checkEmailExists.mockResolvedValue(true);
      mockClient.query.mockResolvedValueOnce({}); // BEGIN

      await nursesController.createNurse(mockReq, mockRes);

      expect(mockHelperFunctions.createErrorResponse).toHaveBeenCalledWith(mockRes, 409, expect.stringContaining('email'));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return error if phone exists', async () => {
      mockHelperFunctions.getValidationErrors.mockReturnValue({ hasErrors: false });
      mockHelperFunctions.checkEmailExists.mockResolvedValue(false);
      mockHelperFunctions.checkPhoneExists.mockResolvedValue(true);
      mockClient.query.mockResolvedValueOnce({}); // BEGIN

      await nursesController.createNurse(mockReq, mockRes);

      expect(mockHelperFunctions.createErrorResponse).toHaveBeenCalledWith(mockRes, 409, expect.stringContaining('phone'));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockHelperFunctions.getValidationErrors.mockReturnValue({ hasErrors: false });
      mockHelperFunctions.checkEmailExists.mockResolvedValue(false);
      mockHelperFunctions.checkPhoneExists.mockResolvedValue(false);
      mockHelperFunctions.hashPassword.mockResolvedValue('hashed_password');
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // INSERT fails

      await nursesController.createNurse(mockReq, mockRes);

      expect(mockHelperFunctions.handleUniqueConstraintError).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateNurse', () => {
    beforeEach(() => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        first_name: 'Updated',
        last_name: 'Name',
        email: 'updated@test.com',
        phone: '9876543210',
        organization: 'New Org',
        is_active: true
      };
    });

    it('should update nurse successfully', async () => {
      mockHelperFunctions.getValidationErrors.mockReturnValue({ hasErrors: false });
      mockHelperFunctions.checkEmailExists.mockResolvedValue(false);
      mockHelperFunctions.checkPhoneExists.mockResolvedValue(false);
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ email: 'old@test.com', is_active: false }] }) // SELECT existing
        .mockResolvedValueOnce({ rows: [{ id: 1, ...mockReq.body, role: 'urology_nurse', is_verified: false, created_at: new Date() }] }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockClient.query).toHaveBeenCalled();
      expect(mockHelperFunctions.createSuccessResponse).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should update nurse without changing email', async () => {
      mockHelperFunctions.getValidationErrors.mockReturnValue({ hasErrors: false });
      mockHelperFunctions.checkPhoneExists.mockResolvedValue(false);
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ email: 'nurse@test.com', is_active: false }] }) // SELECT existing
        .mockResolvedValueOnce({ rows: [{ id: 1, ...mockReq.body, email: 'nurse@test.com', role: 'urology_nurse', is_verified: false, created_at: new Date() }] }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      mockReq.body.email = 'nurse@test.com'; // Same email

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockHelperFunctions.createSuccessResponse).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return validation errors', async () => {
      mockHelperFunctions.getValidationErrors.mockReturnValue({ 
        hasErrors: true, 
        details: ['Invalid data'] 
      });
      mockClient.query.mockResolvedValueOnce({}); // BEGIN

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 404 when nurse not found', async () => {
      mockHelperFunctions.getValidationErrors.mockReturnValue({ hasErrors: false });
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // SELECT returns no rows

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockHelperFunctions.createErrorResponse).toHaveBeenCalledWith(mockRes, 404, expect.stringContaining('not found'));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return error if new email exists', async () => {
      mockHelperFunctions.getValidationErrors.mockReturnValue({ hasErrors: false });
      mockHelperFunctions.checkEmailExists.mockResolvedValue(true);
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ email: 'old@test.com', is_active: false }] }); // SELECT existing

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockHelperFunctions.createErrorResponse).toHaveBeenCalledWith(mockRes, 409, expect.stringContaining('email'));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockHelperFunctions.getValidationErrors.mockReturnValue({ hasErrors: false });
      mockHelperFunctions.checkEmailExists.mockResolvedValue(false);
      mockHelperFunctions.checkPhoneExists.mockResolvedValue(false);
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ email: 'old@test.com', is_active: false }] }) // SELECT existing
        .mockRejectedValueOnce(new Error('Database error')); // UPDATE fails

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockHelperFunctions.handleUniqueConstraintError).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('deleteNurse', () => {
    it('should delete nurse successfully', async () => {
      mockReq.params = { id: '1' };
      mockHelperFunctions.softDeleteUserByRole.mockResolvedValue({
        success: true
      });

      await nursesController.deleteNurse(mockReq, mockRes);

      expect(mockHelperFunctions.softDeleteUserByRole).toHaveBeenCalledWith('1', 'urology_nurse', 'Nurse');
      expect(mockHelperFunctions.createSuccessResponse).toHaveBeenCalled();
    });

    it('should handle error when deletion fails', async () => {
      mockReq.params = { id: '1' };
      mockHelperFunctions.softDeleteUserByRole.mockResolvedValue({
        success: false,
        error: 'Deletion failed'
      });

      await nursesController.deleteNurse(mockReq, mockRes);

      expect(mockHelperFunctions.createErrorResponse).toHaveBeenCalledWith(mockRes, 500, 'Deletion failed');
    });

    it('should return 404 when nurse not found during deletion', async () => {
      mockReq.params = { id: '999' };
      mockHelperFunctions.softDeleteUserByRole.mockResolvedValue({
        success: false,
        notFound: true,
        error: 'Nurse not found'
      });

      await nursesController.deleteNurse(mockReq, mockRes);

      expect(mockHelperFunctions.createErrorResponse).toHaveBeenCalledWith(mockRes, 404, 'Nurse not found');
    });
  });

  describe('createNurse - edge cases', () => {
    it('should handle null organization', async () => {
      mockReq.body = {
        email: 'nurse@test.com',
        first_name: 'Test',
        last_name: 'Nurse',
        phone: '1234567890',
        organization: null
      };
      mockHelperFunctions.getValidationErrors.mockReturnValue({ hasErrors: false });
      mockHelperFunctions.checkEmailExists.mockResolvedValue(false);
      mockHelperFunctions.checkPhoneExists.mockResolvedValue(false);
      mockHelperFunctions.hashPassword.mockResolvedValue('hashed_password');
      mockSendPasswordSetupEmail.mockResolvedValue({ success: true });
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'nurse@test.com', first_name: 'Test', last_name: 'Nurse', phone: '1234567890', organization: null, role: 'urology_nurse', created_at: new Date() }] }) // INSERT
        .mockResolvedValueOnce({}) // INSERT password_setup_tokens
        .mockResolvedValueOnce({}); // COMMIT

      await nursesController.createNurse(mockReq, mockRes);

      expect(mockClient.query).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should handle undefined organization', async () => {
      mockReq.body = {
        email: 'nurse@test.com',
        first_name: 'Test',
        last_name: 'Nurse',
        phone: '1234567890'
      };
      mockHelperFunctions.getValidationErrors.mockReturnValue({ hasErrors: false });
      mockHelperFunctions.checkEmailExists.mockResolvedValue(false);
      mockHelperFunctions.checkPhoneExists.mockResolvedValue(false);
      mockHelperFunctions.hashPassword.mockResolvedValue('hashed_password');
      mockSendPasswordSetupEmail.mockResolvedValue({ success: true });
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'nurse@test.com', first_name: 'Test', last_name: 'Nurse', phone: '1234567890', organization: null, role: 'urology_nurse', created_at: new Date() }] }) // INSERT
        .mockResolvedValueOnce({}) // INSERT password_setup_tokens
        .mockResolvedValueOnce({}); // COMMIT

      await nursesController.createNurse(mockReq, mockRes);

      expect(mockClient.query).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should handle connection error', async () => {
      mockReq.body = {
        email: 'nurse@test.com',
        first_name: 'Test',
        last_name: 'Nurse',
        phone: '1234567890'
      };
      mockPool.connect.mockRejectedValueOnce(new Error('Connection failed'));

      try {
        await nursesController.createNurse(mockReq, mockRes);
      } catch (error) {
        expect(error.message).toContain('Connection failed');
      }
    });
  });

  describe('updateNurse - edge cases', () => {
    it('should handle undefined is_active', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        first_name: 'Updated',
        last_name: 'Name',
        email: 'updated@test.com',
        phone: '9876543210',
        organization: 'New Org'
        // is_active is undefined
      };
      mockHelperFunctions.getValidationErrors.mockReturnValue({ hasErrors: false });
      mockHelperFunctions.checkEmailExists.mockResolvedValue(false);
      mockHelperFunctions.checkPhoneExists.mockResolvedValue(false);
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ email: 'old@test.com', is_active: false }] }) // SELECT existing
        .mockResolvedValueOnce({ rows: [{ id: 1, ...mockReq.body, is_active: false, role: 'urology_nurse', is_verified: false, created_at: new Date() }] }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockHelperFunctions.createSuccessResponse).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle when email is not provided in update', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        first_name: 'Updated',
        last_name: 'Name',
        phone: '9876543210',
        organization: 'New Org',
        is_active: true
        // email is not provided
      };
      mockHelperFunctions.getValidationErrors.mockReturnValue({ hasErrors: false });
      mockHelperFunctions.checkPhoneExists.mockResolvedValue(false);
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ email: 'old@test.com', is_active: false }] }) // SELECT existing
        .mockResolvedValueOnce({ rows: [{ id: 1, ...mockReq.body, email: 'old@test.com', role: 'urology_nurse', is_verified: false, created_at: new Date() }] }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockHelperFunctions.createSuccessResponse).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle when phone is not provided in update', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        first_name: 'Updated',
        last_name: 'Name',
        email: 'updated@test.com',
        organization: 'New Org',
        is_active: true
        // phone is not provided
      };
      mockHelperFunctions.getValidationErrors.mockReturnValue({ hasErrors: false });
      mockHelperFunctions.checkEmailExists.mockResolvedValue(false);
      mockHelperFunctions.checkPhoneExists.mockResolvedValue(false);
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ email: 'old@test.com', is_active: false }] }) // SELECT existing
        .mockResolvedValueOnce({ rows: [{ id: 1, ...mockReq.body, phone: null, role: 'urology_nurse', is_verified: false, created_at: new Date() }] }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockHelperFunctions.createSuccessResponse).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle connection error during update', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        first_name: 'Updated',
        last_name: 'Name',
        email: 'updated@test.com',
        phone: '9876543210'
      };
      mockPool.connect.mockRejectedValueOnce(new Error('Connection failed'));

      try {
        await nursesController.updateNurse(mockReq, mockRes);
      } catch (error) {
        expect(error.message).toContain('Connection failed');
      }
    });
  });
});

