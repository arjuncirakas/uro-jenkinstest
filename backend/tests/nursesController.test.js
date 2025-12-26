import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn(() => Promise.resolve({
  query: mockQuery,
  release: mockRelease
}));

jest.unstable_mockModule('../config/database.js', () => ({
  default: { connect: mockConnect }
}));

jest.unstable_mockModule('../services/emailService.js', () => ({
  sendPasswordSetupEmail: jest.fn().mockResolvedValue({ success: true })
}));

jest.unstable_mockModule('../controllers/userControllerHelper.js', () => ({
  getAllUsersByRole: jest.fn(),
  getUserByIdAndRole: jest.fn(),
  checkEmailExists: jest.fn(),
  checkPhoneExists: jest.fn(),
  hashPassword: jest.fn(),
  softDeleteUserByRole: jest.fn(),
  getValidationErrors: jest.fn(),
  handleUniqueConstraintError: jest.fn(),
  createErrorResponse: jest.fn(),
  createSuccessResponse: jest.fn()
}));

// Import after mocking
const nursesController = await import('../controllers/nursesController.js');
const userControllerHelper = await import('../controllers/userControllerHelper.js');
const { sendPasswordSetupEmail } = await import('../services/emailService.js');

describe('nursesController', () => {
  let mockReq;
  let mockRes;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: mockQuery,
      release: mockRelease
    };
    mockConnect.mockResolvedValue(mockClient);

    mockReq = {
      params: {},
      query: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllNurses', () => {
    it('should get all active nurses by default', async () => {
      userControllerHelper.getAllUsersByRole.mockResolvedValue({
        success: true,
        data: [{ id: 1, email: 'nurse@test.com' }],
        count: 1
      });

      await nursesController.getAllNurses(mockReq, mockRes);

      // Default is_active = true, controller now correctly parses it
      expect(userControllerHelper.getAllUsersByRole).toHaveBeenCalledWith('urology_nurse', true);
      expect(userControllerHelper.createSuccessResponse).toHaveBeenCalled();
    });

    it('should get inactive nurses when is_active is false', async () => {
      mockReq.query.is_active = 'false';
      userControllerHelper.getAllUsersByRole.mockResolvedValue({
        success: true,
        data: [],
        count: 0
      });

      await nursesController.getAllNurses(mockReq, mockRes);

      expect(userControllerHelper.getAllUsersByRole).toHaveBeenCalledWith('urology_nurse', false);
    });

    it('should handle errors', async () => {
      userControllerHelper.getAllUsersByRole.mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      await nursesController.getAllNurses(mockReq, mockRes);

      expect(userControllerHelper.createErrorResponse).toHaveBeenCalledWith(mockRes, 500, 'Database error');
    });
  });

  describe('getNurseById', () => {
    it('should get nurse by ID successfully', async () => {
      mockReq.params.id = '1';
      userControllerHelper.getUserByIdAndRole.mockResolvedValue({
        success: true,
        data: { id: 1, email: 'nurse@test.com' }
      });

      await nursesController.getNurseById(mockReq, mockRes);

      expect(userControllerHelper.getUserByIdAndRole).toHaveBeenCalledWith('1', 'urology_nurse', 'Nurse');
      expect(userControllerHelper.createSuccessResponse).toHaveBeenCalled();
    });

    it('should return 404 when nurse not found', async () => {
      mockReq.params.id = '999';
      userControllerHelper.getUserByIdAndRole.mockResolvedValue({
        success: false,
        notFound: true,
        error: 'Nurse not found'
      });

      await nursesController.getNurseById(mockReq, mockRes);

      expect(userControllerHelper.createErrorResponse).toHaveBeenCalledWith(mockRes, 404, 'Nurse not found');
    });

    it('should handle database errors', async () => {
      mockReq.params.id = '1';
      userControllerHelper.getUserByIdAndRole.mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      await nursesController.getNurseById(mockReq, mockRes);

      expect(userControllerHelper.createErrorResponse).toHaveBeenCalledWith(mockRes, 500, 'Database error');
    });
  });

  describe('createNurse', () => {
    beforeEach(() => {
      mockReq.body = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@test.com',
        phone: '+1234567890',
        organization: 'Test Hospital'
      };
    });

    it('should create nurse successfully', async () => {
      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });
      userControllerHelper.checkEmailExists.mockResolvedValue(false);
      userControllerHelper.checkPhoneExists.mockResolvedValue(false);
      userControllerHelper.hashPassword.mockResolvedValue('hashed_password');
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'john.doe@test.com', first_name: 'John', last_name: 'Doe', phone: '+1234567890', organization: 'Test Hospital', role: 'urology_nurse', created_at: new Date() }]
        }) // INSERT user
        .mockResolvedValueOnce({}) // INSERT password_setup_tokens
        .mockResolvedValueOnce({}); // COMMIT

      sendPasswordSetupEmail.mockResolvedValue({ success: true });

      await nursesController.createNurse(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith('BEGIN');
      expect(userControllerHelper.checkEmailExists).toHaveBeenCalled();
      expect(userControllerHelper.checkPhoneExists).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should return validation errors', async () => {
      userControllerHelper.getValidationErrors.mockReturnValue({
        hasErrors: true,
        details: [{ field: 'email', message: 'Invalid email' }]
      });

      await nursesController.createNurse(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: [{ field: 'email', message: 'Invalid email' }]
      });
    });

    it('should return error if email exists', async () => {
      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });
      userControllerHelper.checkEmailExists.mockResolvedValue(true);

      await nursesController.createNurse(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(userControllerHelper.createErrorResponse).toHaveBeenCalledWith(mockRes, 409, 'User with this email already exists');
    });

    it('should return error if phone exists', async () => {
      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });
      userControllerHelper.checkEmailExists.mockResolvedValue(false);
      userControllerHelper.checkPhoneExists.mockResolvedValue(true);

      await nursesController.createNurse(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(userControllerHelper.createErrorResponse).toHaveBeenCalledWith(mockRes, 409, 'Phone number is already in use');
    });

    it('should handle email sending failure', async () => {
      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });
      userControllerHelper.checkEmailExists.mockResolvedValue(false);
      userControllerHelper.checkPhoneExists.mockResolvedValue(false);
      userControllerHelper.hashPassword.mockResolvedValue('hashed_password');
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'john.doe@test.com', first_name: 'John', last_name: 'Doe', phone: '+1234567890', organization: 'Test Hospital', role: 'urology_nurse', created_at: new Date() }]
        })
        .mockResolvedValueOnce({}) // INSERT password_setup_tokens
        .mockResolvedValueOnce({}); // COMMIT

      sendPasswordSetupEmail.mockResolvedValue({ success: false });

      await nursesController.createNurse(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('email sending failed')
        })
      );
    });

    it('should handle unique constraint errors', async () => {
      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });
      userControllerHelper.checkEmailExists.mockResolvedValue(false);
      userControllerHelper.checkPhoneExists.mockResolvedValue(false);
      userControllerHelper.hashPassword.mockResolvedValue('hashed_password');
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce({ code: '23505' }); // INSERT fails

      userControllerHelper.handleUniqueConstraintError.mockReturnValue({
        status: 409,
        error: 'Nurse with this email or phone already exists'
      });

      await nursesController.createNurse(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(userControllerHelper.createErrorResponse).toHaveBeenCalledWith(
        mockRes,
        409,
        'Nurse with this email or phone already exists'
      );
    });
  });

  describe('updateNurse', () => {
    beforeEach(() => {
      mockReq.params.id = '1';
      mockReq.body = {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@test.com',
        phone: '+1234567891',
        organization: 'New Hospital',
        is_active: true
      };
    });

    it('should update nurse successfully', async () => {
      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });
      userControllerHelper.checkEmailExists.mockResolvedValue(false);
      userControllerHelper.checkPhoneExists.mockResolvedValue(false);
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ email: 'old@test.com', is_active: true }]
        }) // SELECT existing
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'jane.doe@test.com', first_name: 'Jane', last_name: 'Doe', phone: '+1234567891', organization: 'New Hospital', role: 'urology_nurse', is_active: true, is_verified: true, created_at: new Date() }]
        }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith('COMMIT');
      expect(userControllerHelper.createSuccessResponse).toHaveBeenCalled();
    });

    it('should return validation errors', async () => {
      userControllerHelper.getValidationErrors.mockReturnValue({
        hasErrors: true,
        details: [{ field: 'email', message: 'Invalid email' }]
      });

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if nurse not found', async () => {
      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // SELECT returns empty

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(userControllerHelper.createErrorResponse).toHaveBeenCalledWith(mockRes, 404, 'Nurse not found');
    });

    it('should return 409 if new email already exists', async () => {
      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });

      // Existing nurse query
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ email: 'old@test.com', is_active: true }]
        }); // SELECT existing

      // checkEmailExists mock returning true
      userControllerHelper.checkEmailExists.mockResolvedValue(true);

      mockReq.body.email = 'new@test.com'; // Different email

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(userControllerHelper.createErrorResponse).toHaveBeenCalledWith(mockRes, 409, 'User with this email already exists');
    });

    it('should return 409 if phone number is already in use', async () => {
      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });

      // Existing nurse query
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ email: 'jane.doe@test.com', is_active: true }]
        }); // SELECT existing

      // checkEmailExists (false or skipped if email same)
      userControllerHelper.checkEmailExists.mockResolvedValue(false);

      // checkPhoneExists mock returning true
      userControllerHelper.checkPhoneExists.mockResolvedValue(true);

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(userControllerHelper.createErrorResponse).toHaveBeenCalledWith(mockRes, 409, 'Phone number is already in use');
    });

    it('should preserve is_active when not provided', async () => {
      delete mockReq.body.is_active;
      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });
      userControllerHelper.checkEmailExists.mockResolvedValue(false);
      userControllerHelper.checkPhoneExists.mockResolvedValue(false);
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ email: 'old@test.com', is_active: false }]
        }) // SELECT existing
        .mockResolvedValueOnce({
          rows: [{ id: 1, is_active: false }]
        }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([false]) // finalIsActive should be false
      );
    });

    it('should handle unique constraint errors during update', async () => {
      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ email: 'jane.doe@test.com', is_active: true }]
        }); // SELECT existing

      userControllerHelper.checkEmailExists.mockResolvedValue(false);
      userControllerHelper.checkPhoneExists.mockResolvedValue(false);

      const dbError = new Error('Unique constraint violation');
      dbError.code = '23505'; // Postgres unique violation code
      userControllerHelper.handleUniqueConstraintError.mockReturnValue({
        status: 409,
        error: 'Nurse with this email or phone already exists'
      });

      // Fail on update query
      mockQuery.mockRejectedValueOnce(dbError);

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(userControllerHelper.createErrorResponse).toHaveBeenCalledWith(mockRes, 409, 'Nurse with this email or phone already exists');
    });

    it('should handle generic database errors during update', async () => {
      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('DB Error')); // SELECT fails

      userControllerHelper.handleUniqueConstraintError.mockReturnValue({
        status: 500,
        error: 'Database error'
      });

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(userControllerHelper.createErrorResponse).toHaveBeenCalledWith(mockRes, 500, 'Database error');
    });
  });

  describe('deleteNurse', () => {
    beforeEach(() => {
      mockReq.params.id = '1';
    });

    it('should delete nurse successfully', async () => {
      userControllerHelper.softDeleteUserByRole.mockResolvedValue({
        success: true,
        message: 'Nurse deleted successfully'
      });

      await nursesController.deleteNurse(mockReq, mockRes);

      expect(userControllerHelper.softDeleteUserByRole).toHaveBeenCalledWith('1', 'urology_nurse', 'Nurse');
      expect(userControllerHelper.createSuccessResponse).toHaveBeenCalledWith(mockRes, { message: 'Nurse deleted successfully' });
    });

    it('should return 404 if nurse not found for deletion', async () => {
      userControllerHelper.softDeleteUserByRole.mockResolvedValue({
        success: false,
        notFound: true,
        error: 'Nurse not found'
      });

      await nursesController.deleteNurse(mockReq, mockRes);

      expect(userControllerHelper.createErrorResponse).toHaveBeenCalledWith(mockRes, 404, 'Nurse not found');
    });

    it('should return 500 if deletion fails', async () => {
      userControllerHelper.softDeleteUserByRole.mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      await nursesController.deleteNurse(mockReq, mockRes);

      expect(userControllerHelper.createErrorResponse).toHaveBeenCalledWith(mockRes, 500, 'Database error');
    });
  });

  describe('getAllNurses - is_active conditions', () => {
    it('should handle is_active as boolean true', async () => {
      mockReq.query = { is_active: true };
      userControllerHelper.getAllUsersByRole.mockResolvedValue({
        success: true,
        data: [],
        count: 0
      });

      await nursesController.getAllNurses(mockReq, mockRes);

      expect(userControllerHelper.getAllUsersByRole).toHaveBeenCalledWith('urology_nurse', true);
    });

    it('should handle is_active as string "true"', async () => {
      mockReq.query = { is_active: 'true' };
      userControllerHelper.getAllUsersByRole.mockResolvedValue({
        success: true,
        data: [],
        count: 0
      });

      await nursesController.getAllNurses(mockReq, mockRes);

      expect(userControllerHelper.getAllUsersByRole).toHaveBeenCalledWith('urology_nurse', true);
    });

    it('should handle is_active as false', async () => {
      mockReq.query = { is_active: false };
      userControllerHelper.getAllUsersByRole.mockResolvedValue({
        success: true,
        data: [],
        count: 0
      });

      await nursesController.getAllNurses(mockReq, mockRes);

      expect(userControllerHelper.getAllUsersByRole).toHaveBeenCalledWith('urology_nurse', false);
    });
  });

  describe('createNurse - email sending error handling', () => {
    it('should handle email sending error gracefully', async () => {
      const { sendPasswordSetupEmail } = await import('../services/emailService.js');
      sendPasswordSetupEmail.mockRejectedValueOnce(new Error('Email service down'));

      mockReq.body = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        phone: '1234567890'
      };

      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });
      userControllerHelper.checkEmailExists.mockResolvedValue(false);
      userControllerHelper.checkPhoneExists.mockResolvedValue(false);
      userControllerHelper.hashPassword.mockResolvedValue('hashed_password');

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'john@test.com', first_name: 'John', last_name: 'Doe', role: 'urology_nurse', created_at: new Date() }]
        }) // INSERT user
        .mockResolvedValueOnce({}) // INSERT token
        .mockResolvedValueOnce({}); // COMMIT

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await nursesController.createNurse(mockReq, mockRes);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error sending password setup email:', expect.any(Error));
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('email sending failed')
        })
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle successful email sending', async () => {
      const { sendPasswordSetupEmail } = await import('../services/emailService.js');
      sendPasswordSetupEmail.mockResolvedValueOnce({ success: true });

      mockReq.body = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        phone: '1234567890'
      };

      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });
      userControllerHelper.checkEmailExists.mockResolvedValue(false);
      userControllerHelper.checkPhoneExists.mockResolvedValue(false);
      userControllerHelper.hashPassword.mockResolvedValue('hashed_password');

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'john@test.com', first_name: 'John', last_name: 'Doe', role: 'urology_nurse', created_at: new Date() }]
        }) // INSERT user
        .mockResolvedValueOnce({}) // INSERT token
        .mockResolvedValueOnce({}); // COMMIT

      await nursesController.createNurse(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Password setup email sent'),
          data: expect.objectContaining({
            emailSent: true
          })
        })
      );
    });
  });

  describe('updateNurse - is_active and email conditions', () => {
    it('should handle is_active undefined (use existing value)', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        phone: '1234567890'
      };

      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ email: 'john@test.com', is_active: true }]
        }) // SELECT existing
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'john@test.com', first_name: 'John', last_name: 'Doe', phone: '1234567890', organization: null, role: 'urology_nurse', is_active: true, is_verified: false, created_at: new Date() }]
        }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      userControllerHelper.checkEmailExists.mockResolvedValue(false);
      userControllerHelper.checkPhoneExists.mockResolvedValue(false);

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([true]) // finalIsActive should be true (from existing)
      );
    });

    it('should handle is_active provided', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        phone: '1234567890',
        is_active: false
      };

      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ email: 'john@test.com', is_active: true }]
        }) // SELECT existing
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'john@test.com', first_name: 'John', last_name: 'Doe', phone: '1234567890', organization: null, role: 'urology_nurse', is_active: false, is_verified: false, created_at: new Date() }]
        }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      userControllerHelper.checkEmailExists.mockResolvedValue(false);
      userControllerHelper.checkPhoneExists.mockResolvedValue(false);

      await nursesController.updateNurse(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([false]) // finalIsActive should be false (from body)
      );
    });

    it('should handle email change (email !== oldEmail)', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'newemail@test.com',
        phone: '1234567890'
      };

      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ email: 'oldemail@test.com', is_active: true }]
        }) // SELECT existing
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'newemail@test.com', first_name: 'John', last_name: 'Doe', phone: '1234567890', organization: null, role: 'urology_nurse', is_active: true, is_verified: false, created_at: new Date() }]
        }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      userControllerHelper.checkEmailExists.mockResolvedValue(false);
      userControllerHelper.checkPhoneExists.mockResolvedValue(false);

      await nursesController.updateNurse(mockReq, mockRes);

      expect(userControllerHelper.checkEmailExists).toHaveBeenCalled();
    });

    it('should handle email not changed (email === oldEmail)', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        phone: '1234567890'
      };

      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ email: 'john@test.com', is_active: true }]
        }) // SELECT existing
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'john@test.com', first_name: 'John', last_name: 'Doe', phone: '1234567890', organization: null, role: 'urology_nurse', is_active: true, is_verified: false, created_at: new Date() }]
        }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      userControllerHelper.checkPhoneExists.mockResolvedValue(false);

      await nursesController.updateNurse(mockReq, mockRes);

      // Should not check email exists if email hasn't changed
      expect(userControllerHelper.checkEmailExists).not.toHaveBeenCalled();
    });

    it('should handle checkPhoneExists with excludeEmail', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        phone: '1234567890'
      };

      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ email: 'john@test.com', is_active: true }]
        }) // SELECT existing
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'john@test.com', first_name: 'John', last_name: 'Doe', phone: '1234567890', organization: null, role: 'urology_nurse', is_active: true, is_verified: false, created_at: new Date() }]
        }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      userControllerHelper.checkPhoneExists.mockResolvedValue(false);

      await nursesController.updateNurse(mockReq, mockRes);

      expect(userControllerHelper.checkPhoneExists).toHaveBeenCalledWith(
        expect.anything(),
        '1234567890',
        'john@test.com' // excludeEmail should be passed
      );
    });

    it('should handle checkPhoneExists with new email when email changed', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'newemail@test.com',
        phone: '1234567890'
      };

      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ email: 'oldemail@test.com', is_active: true }]
        }) // SELECT existing
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'newemail@test.com', first_name: 'John', last_name: 'Doe', phone: '1234567890', organization: null, role: 'urology_nurse', is_active: true, is_verified: false, created_at: new Date() }]
        }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      userControllerHelper.checkEmailExists.mockResolvedValue(false);
      userControllerHelper.checkPhoneExists.mockResolvedValue(false);

      await nursesController.updateNurse(mockReq, mockRes);

      expect(userControllerHelper.checkPhoneExists).toHaveBeenCalledWith(
        expect.anything(),
        '1234567890',
        'newemail@test.com' // Should use new email
      );
    });
  });

  describe('getAllNurses - is_active edge cases', () => {
    it('should handle is_active as undefined (defaults to true)', async () => {
      mockReq.query = {};
      userControllerHelper.getAllUsersByRole.mockResolvedValue({
        success: true,
        data: [],
        count: 0
      });

      await nursesController.getAllNurses(mockReq, mockRes);

      // Should default to true (line 22: is_active = true)
      expect(userControllerHelper.getAllUsersByRole).toHaveBeenCalledWith('urology_nurse', true);
    });

    it('should handle is_active as string "false"', async () => {
      mockReq.query = { is_active: 'false' };
      userControllerHelper.getAllUsersByRole.mockResolvedValue({
        success: true,
        data: [],
        count: 0
      });

      await nursesController.getAllNurses(mockReq, mockRes);

      // String "false" is not === true or === 'true', so isActiveBool should be false
      expect(userControllerHelper.getAllUsersByRole).toHaveBeenCalledWith('urology_nurse', false);
    });

    it('should handle is_active as other values (defaults to false)', async () => {
      mockReq.query = { is_active: 'other' };
      userControllerHelper.getAllUsersByRole.mockResolvedValue({
        success: true,
        data: [],
        count: 0
      });

      await nursesController.getAllNurses(mockReq, mockRes);

      // Other values should result in false (line 24: is_active === true || is_active === 'true')
      expect(userControllerHelper.getAllUsersByRole).toHaveBeenCalledWith('urology_nurse', false);
    });
  });

  describe('createNurse - organization handling', () => {
    it('should handle organization as null', async () => {
      mockReq.body = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        phone: '1234567890',
        organization: null
      };

      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });
      userControllerHelper.checkEmailExists.mockResolvedValue(false);
      userControllerHelper.checkPhoneExists.mockResolvedValue(false);
      userControllerHelper.hashPassword.mockResolvedValue('hashed_password');
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'john@test.com', first_name: 'John', last_name: 'Doe', phone: '1234567890', organization: null, role: 'urology_nurse', created_at: new Date() }]
        }) // INSERT user
        .mockResolvedValueOnce({}) // INSERT password_setup_tokens
        .mockResolvedValueOnce({}); // COMMIT

      sendPasswordSetupEmail.mockResolvedValue({ success: true });

      await nursesController.createNurse(mockReq, mockRes);

      // Should pass null for organization (line 86: organization || null)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([null]) // organization should be null
      );
    });

    it('should handle organization as undefined', async () => {
      mockReq.body = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        phone: '1234567890'
        // organization not provided
      };

      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });
      userControllerHelper.checkEmailExists.mockResolvedValue(false);
      userControllerHelper.checkPhoneExists.mockResolvedValue(false);
      userControllerHelper.hashPassword.mockResolvedValue('hashed_password');
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'john@test.com', first_name: 'John', last_name: 'Doe', phone: '1234567890', organization: null, role: 'urology_nurse', created_at: new Date() }]
        }) // INSERT user
        .mockResolvedValueOnce({}) // INSERT password_setup_tokens
        .mockResolvedValueOnce({}); // COMMIT

      sendPasswordSetupEmail.mockResolvedValue({ success: true });

      await nursesController.createNurse(mockReq, mockRes);

      // Should pass null for organization when undefined (line 86: organization || null)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([null]) // organization should be null
      );
    });
  });

  describe('updateNurse - email and organization edge cases', () => {
    it('should handle email as undefined/null (skip email check)', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        first_name: 'John',
        last_name: 'Doe',
        phone: '1234567890'
        // email not provided
      };

      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ email: 'old@test.com', is_active: true }]
        }) // SELECT existing
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'old@test.com', first_name: 'John', last_name: 'Doe', phone: '1234567890', organization: null, role: 'urology_nurse', is_active: true, is_verified: false, created_at: new Date() }]
        }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      userControllerHelper.checkPhoneExists.mockResolvedValue(false);

      await nursesController.updateNurse(mockReq, mockRes);

      // Should not check email exists when email is undefined (line 170: email && email !== oldEmail)
      expect(userControllerHelper.checkEmailExists).not.toHaveBeenCalled();
    });

    it('should handle organization as null in update', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        phone: '1234567890',
        organization: null
      };

      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ email: 'john@test.com', is_active: true }]
        }) // SELECT existing
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'john@test.com', first_name: 'John', last_name: 'Doe', phone: '1234567890', organization: null, role: 'urology_nurse', is_active: true, is_verified: false, created_at: new Date() }]
        }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      userControllerHelper.checkPhoneExists.mockResolvedValue(false);

      await nursesController.updateNurse(mockReq, mockRes);

      // Should pass null for organization (line 188: organization || null)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([null]) // organization should be null
      );
    });

    it('should handle organization as undefined in update', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        phone: '1234567890'
        // organization not provided
      };

      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ email: 'john@test.com', is_active: true }]
        }) // SELECT existing
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'john@test.com', first_name: 'John', last_name: 'Doe', phone: '1234567890', organization: null, role: 'urology_nurse', is_active: true, is_verified: false, created_at: new Date() }]
        }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      userControllerHelper.checkPhoneExists.mockResolvedValue(false);

      await nursesController.updateNurse(mockReq, mockRes);

      // Should pass null for organization when undefined (line 188: organization || null)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([null]) // organization should be null
      );
    });

    it('should use oldEmail when email is undefined in checkPhoneExists', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        first_name: 'John',
        last_name: 'Doe',
        phone: '1234567890'
        // email not provided
      };

      userControllerHelper.getValidationErrors.mockReturnValue({ hasErrors: false });

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ email: 'old@test.com', is_active: true }]
        }) // SELECT existing
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'old@test.com', first_name: 'John', last_name: 'Doe', phone: '1234567890', organization: null, role: 'urology_nurse', is_active: true, is_verified: false, created_at: new Date() }]
        }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      userControllerHelper.checkPhoneExists.mockResolvedValue(false);

      await nursesController.updateNurse(mockReq, mockRes);

      // Should use oldEmail when email is undefined (line 176: email || oldEmail)
      expect(userControllerHelper.checkPhoneExists).toHaveBeenCalledWith(
        expect.anything(),
        '1234567890',
        'old@test.com' // Should use oldEmail
      );
    });
  });
});
