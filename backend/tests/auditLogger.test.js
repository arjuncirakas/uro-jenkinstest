/**
 * Comprehensive tests for auditLogger.js
 * Tests all functions including hash chain immutability controls
 * Target: 100% coverage
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import crypto from 'crypto';

// Mock database
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

const mockPool = {
  connect: jest.fn(() => Promise.resolve(mockClient))
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('auditLogger', () => {
  let auditLogger;
  let calculateLogHash;

  beforeEach(async () => {
    jest.clearAllMocks();
    auditLogger = await import('../services/auditLogger.js');
    
    // Access the private calculateLogHash function through testing
    // We'll test it indirectly through the public functions
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeAuditLogsTable', () => {
    it('should create audit_logs table if it does not exist', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ exists: false }] }) // Table doesn't exist
        .mockResolvedValueOnce({ rows: [] }) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [] }) // Index 1
        .mockResolvedValueOnce({ rows: [] }) // Index 2
        .mockResolvedValueOnce({ rows: [] }) // Index 3
        .mockResolvedValueOnce({ rows: [] }) // Index 4
        .mockResolvedValueOnce({ rows: [] }) // Index 5
        .mockResolvedValueOnce({ rows: [] }) // Index 6
        .mockResolvedValueOnce({ rows: [] }) // Index 7
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Check triggers (COUNT query)
        .mockResolvedValueOnce({ rows: [] }) // CREATE FUNCTION delete
        .mockResolvedValueOnce({ rows: [] }) // CREATE FUNCTION update
        .mockResolvedValueOnce({ rows: [] }) // DROP TRIGGER delete
        .mockResolvedValueOnce({ rows: [] }) // DROP TRIGGER update
        .mockResolvedValueOnce({ rows: [] }) // CREATE TRIGGER delete
        .mockResolvedValueOnce({ rows: [] }); // CREATE TRIGGER update

      const result = await auditLogger.initializeAuditLogsTable();

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE audit_logs')
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('previous_hash VARCHAR(64)')
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should not create table if it already exists', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // Table exists
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // Column exists
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // Triggers exist

      const result = await auditLogger.initializeAuditLogsTable();

      expect(result).toBe(true);
      // Should not call CREATE TABLE
      const createTableCalls = mockClient.query.mock.calls.filter(call =>
        call[0] && typeof call[0] === 'string' && call[0].includes('CREATE TABLE audit_logs')
      );
      expect(createTableCalls.length).toBe(0);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should add previous_hash column if table exists but column does not', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // Table exists
        .mockResolvedValueOnce({ rows: [{ exists: false }] }) // Column doesn't exist
        .mockResolvedValueOnce({ rows: [] }) // ALTER TABLE
        .mockResolvedValueOnce({ rows: [] }) // CREATE INDEX
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              timestamp: new Date('2024-01-01'),
              user_id: 1,
              user_email: 'test@test.com',
              user_role: 'admin',
              action: 'test.action',
              resource_type: 'test',
              resource_id: 1,
              ip_address: '127.0.0.1',
              user_agent: 'test',
              request_method: 'GET',
              request_path: '/test',
              status: 'success',
              error_code: null,
              error_message: null,
              metadata: null,
              previous_hash: null
            }
          ]
        }) // SELECT existing logs
        .mockResolvedValueOnce({ rows: [] }) // UPDATE for migration
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Check triggers (COUNT query)
        .mockResolvedValueOnce({ rows: [] }) // CREATE FUNCTION delete
        .mockResolvedValueOnce({ rows: [] }) // CREATE FUNCTION update
        .mockResolvedValueOnce({ rows: [] }) // DROP TRIGGER delete
        .mockResolvedValueOnce({ rows: [] }) // DROP TRIGGER update
        .mockResolvedValueOnce({ rows: [] }) // CREATE TRIGGER delete
        .mockResolvedValueOnce({ rows: [] }); // CREATE TRIGGER update

      const result = await auditLogger.initializeAuditLogsTable();

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE audit_logs')
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ADD COLUMN previous_hash')
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle errors during table creation', async () => {
      const error = new Error('Database error');
      mockClient.query.mockRejectedValueOnce(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await auditLogger.initializeAuditLogsTable();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Failed to initialize audit logs table:',
        error
      );
      consoleSpy.mockRestore();
    });

    it('should handle errors during column addition', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // Table exists
        .mockResolvedValueOnce({ rows: [{ exists: false }] }) // Column doesn't exist
        .mockRejectedValueOnce(new Error('ALTER TABLE failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await auditLogger.initializeAuditLogsTable();

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('logAuditEvent', () => {
    it('should log audit event with hash chain when no previous logs exist', async () => {
      const logData = {
        userId: 1,
        userEmail: 'test@test.com',
        userRole: 'admin',
        action: 'test.action',
        resourceType: 'test',
        resourceId: 1,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        requestMethod: 'GET',
        requestPath: '/test',
        status: 'success',
        errorCode: null,
        errorMessage: null,
        metadata: { test: 'data' }
      };

      // No previous logs
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // SELECT last log (empty)
        .mockResolvedValueOnce({
          rows: [{ id: 1, timestamp: new Date() }]
        }); // INSERT RETURNING

      await auditLogger.logAuditEvent(logData);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY id DESC'),
        expect.anything()
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          1,
          'test@test.com',
          'admin',
          'test.action',
          'test',
          1,
          '127.0.0.1',
          'test-agent',
          'GET',
          '/test',
          'success',
          null,
          null,
          '{"test":"data"}',
          '' // previous_hash should be empty for first entry
        ])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should log audit event with hash chain when previous logs exist', async () => {
      const logData = {
        userId: 2,
        userEmail: 'test2@test.com',
        userRole: 'user',
        action: 'test.action2',
        resourceType: 'test2',
        resourceId: 2,
        ipAddress: '127.0.0.2',
        userAgent: 'test-agent2',
        requestMethod: 'POST',
        requestPath: '/test2',
        status: 'success',
        errorCode: null,
        errorMessage: null,
        metadata: null
      };

      const previousLog = {
        id: 1,
        previous_hash: '',
        timestamp: new Date('2024-01-01'),
        user_id: 1,
        user_email: 'test@test.com',
        user_role: 'admin',
        action: 'test.action',
        resource_type: 'test',
        resource_id: 1,
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        request_method: 'GET',
        request_path: '/test',
        status: 'success',
        error_code: null,
        error_message: null,
        metadata: null
      };

      // Calculate expected hash
      const previousHash = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            id: previousLog.id,
            timestamp: previousLog.timestamp,
            userId: previousLog.user_id,
            userEmail: previousLog.user_email,
            userRole: previousLog.user_role,
            action: previousLog.action,
            resourceType: previousLog.resource_type,
            resourceId: previousLog.resource_id,
            ipAddress: previousLog.ip_address,
            userAgent: previousLog.user_agent,
            requestMethod: previousLog.request_method,
            requestPath: previousLog.request_path,
            status: previousLog.status,
            errorCode: previousLog.error_code,
            errorMessage: previousLog.error_message,
            metadata: previousLog.metadata,
            previousHash: previousLog.previous_hash || ''
          })
        )
        .digest('hex');

      mockClient.query
        .mockResolvedValueOnce({ rows: [previousLog] }) // SELECT last log
        .mockResolvedValueOnce({
          rows: [{ id: 2, timestamp: new Date() }]
        }); // INSERT RETURNING

      await auditLogger.logAuditEvent(logData);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          2,
          'test2@test.com',
          'user',
          'test.action2',
          'test2',
          2,
          '127.0.0.2',
          'test-agent2',
          'POST',
          '/test2',
          'success',
          null,
          null,
          null,
          previousHash // Should use calculated hash of previous entry
        ])
      );
    });

    it('should handle null values in log data', async () => {
      const logData = {
        userId: null,
        userEmail: null,
        userRole: null,
        action: 'test.action',
        resourceType: null,
        resourceId: null,
        ipAddress: null,
        userAgent: null,
        requestMethod: null,
        requestPath: null,
        status: 'success',
        errorCode: null,
        errorMessage: null,
        metadata: null
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // No previous logs
        .mockResolvedValueOnce({
          rows: [{ id: 1, timestamp: new Date() }]
        });

      await auditLogger.logAuditEvent(logData);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          null, // userId
          null, // userEmail
          null, // userRole
          'test.action', // action
          null, // resourceType
          null, // resourceId
          null, // ipAddress
          null, // userAgent
          null, // requestMethod
          null, // requestPath
          'success', // status
          null, // errorCode
          null, // errorMessage
          null, // metadata
          '' // previous_hash
        ])
      );
    });

    it('should handle stringified metadata', async () => {
      const logData = {
        action: 'test.action',
        status: 'success',
        metadata: { nested: { data: 'value' } }
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, timestamp: new Date() }]
        });

      await auditLogger.logAuditEvent(logData);

      const insertCall = mockClient.query.mock.calls.find(call =>
        call[0].includes('INSERT INTO audit_logs')
      );
      expect(insertCall[1]).toContain(JSON.stringify(logData.metadata));
    });

    it('should not throw errors on database failure', async () => {
      const logData = {
        action: 'test.action',
        status: 'success'
      };

      const error = new Error('Database connection failed');
      mockClient.query.mockRejectedValueOnce(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(auditLogger.logAuditEvent(logData)).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Failed to log audit event:',
        error
      );
      consoleSpy.mockRestore();
    });
  });

  describe('logAuthEvent', () => {
    it('should log authentication event with user data', async () => {
      const mockReq = {
        user: { id: 1, email: 'test@test.com', role: 'admin' },
        body: { email: 'test@test.com' },
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
        get: jest.fn(() => 'test-agent'),
        method: 'POST',
        path: '/api/auth/login',
        originalUrl: '/api/auth/login'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, timestamp: new Date() }]
        });

      await auditLogger.logAuthEvent(mockReq, 'login', 'success');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          1, // userId
          'test@test.com', // userEmail
          'admin', // userRole
          'auth.login', // action
          'authentication', // resourceType
        ])
      );
    });

    it('should log authentication event without user data', async () => {
      const mockReq = {
        body: { email: 'test@test.com' },
        ip: '127.0.0.1',
        get: jest.fn(() => 'test-agent'),
        method: 'POST',
        path: '/api/auth/login',
        originalUrl: '/api/auth/login'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, timestamp: new Date() }]
        });

      await auditLogger.logAuthEvent(mockReq, 'login', 'failure', 'Invalid credentials');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          null, // userId
          'test@test.com', // userEmail from body
          null, // userRole
          'auth.login', // action
        ])
      );
    });

    it('should not log password in metadata for login action', async () => {
      const mockReq = {
        user: { id: 1, email: 'test@test.com', role: 'admin' },
        body: { email: 'test@test.com', password: 'secret123' },
        ip: '127.0.0.1',
        get: jest.fn(() => 'test-agent'),
        method: 'POST',
        path: '/api/auth/login',
        originalUrl: '/api/auth/login'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, timestamp: new Date() }]
        });

      await auditLogger.logAuthEvent(mockReq, 'login', 'success');

      const insertCall = mockClient.query.mock.calls.find(call =>
        call[0].includes('INSERT INTO audit_logs')
      );
      const metadata = JSON.parse(insertCall[1][13]); // metadata is at index 13
      expect(metadata.body).toEqual({ email: 'test@test.com' });
      expect(metadata.body.password).toBeUndefined();
    });
  });

  describe('logPHIAccess', () => {
    it('should log PHI access event', async () => {
      const mockReq = {
        user: { id: 1, email: 'doctor@test.com', role: 'urologist' },
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
        get: jest.fn(() => 'test-agent'),
        method: 'GET',
        path: '/api/patients/123',
        originalUrl: '/api/patients/123'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, timestamp: new Date() }]
        });

      await auditLogger.logPHIAccess(mockReq, 'patient', 123, 'view');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          1, // userId
          'doctor@test.com', // userEmail
          'urologist', // userRole
          'phi.view', // action
          'patient', // resourceType
          123, // resourceId
        ])
      );
    });
  });

  describe('logPrivilegeChange', () => {
    it('should log privilege change event', async () => {
      const mockReq = {
        user: { id: 1, email: 'admin@test.com', role: 'superadmin' },
        ip: '127.0.0.1',
        get: jest.fn(() => 'test-agent'),
        method: 'PUT',
        path: '/api/superadmin/users/2',
        originalUrl: '/api/superadmin/users/2'
      };

      const changes = { role: 'urologist', is_active: true };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, timestamp: new Date() }]
        });

      await auditLogger.logPrivilegeChange(mockReq, 2, changes);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          1, // userId
          'admin@test.com', // userEmail
          'superadmin', // userRole
          'privilege.change', // action
          'user', // resourceType
          2, // resourceId (targetUserId)
        ])
      );

      const insertCall = mockClient.query.mock.calls.find(call =>
        call[0].includes('INSERT INTO audit_logs')
      );
      const metadata = JSON.parse(insertCall[1][13]);
      expect(metadata.changes).toEqual(changes);
    });
  });

  describe('logFailedAccess', () => {
    it('should log failed access attempt', async () => {
      const mockReq = {
        body: { email: 'test@test.com' },
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
        get: jest.fn(() => 'test-agent'),
        method: 'GET',
        path: '/api/patients/123',
        originalUrl: '/api/patients/123'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, timestamp: new Date() }]
        });

      await auditLogger.logFailedAccess(mockReq, 'Unauthorized access attempt');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          null, // userId
          'test@test.com', // userEmail from body
          null, // userRole
          'access.denied', // action
          null, // resourceType
          null, // resourceId
          '127.0.0.1', // ipAddress
          'failure', // status
          'Unauthorized access attempt', // errorMessage
        ])
      );
    });

    it('should handle missing email in body', async () => {
      const mockReq = {
        body: {},
        ip: '127.0.0.1',
        get: jest.fn(() => 'test-agent'),
        method: 'GET',
        path: '/api/test',
        originalUrl: '/api/test'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, timestamp: new Date() }]
        });

      await auditLogger.logFailedAccess(mockReq, 'Access denied');

      const insertCall = mockClient.query.mock.calls.find(call =>
        call[0].includes('INSERT INTO audit_logs')
      );
      expect(insertCall[1][1]).toBeNull(); // userEmail should be null
    });
  });

  describe('logDataExport', () => {
    it('should log data export event', async () => {
      const mockReq = {
        user: { id: 1, email: 'admin@test.com', role: 'superadmin' },
        ip: '127.0.0.1',
        get: jest.fn(() => 'test-agent'),
        method: 'GET',
        path: '/api/superadmin/data-audit/export',
        originalUrl: '/api/superadmin/data-audit/export'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, timestamp: new Date() }]
        });

      await auditLogger.logDataExport(mockReq, 'patients', 100);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          1, // userId
          'admin@test.com', // userEmail
          'superadmin', // userRole
          'data.export', // action
          'patients', // resourceType (exportType)
        ])
      );

      const insertCall = mockClient.query.mock.calls.find(call =>
        call[0].includes('INSERT INTO audit_logs')
      );
      const metadata = JSON.parse(insertCall[1][13]);
      expect(metadata.exportType).toBe('patients');
      expect(metadata.recordCount).toBe(100);
    });
  });

  describe('verifyAuditLogIntegrity', () => {
    it('should return valid result when no logs exist', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await auditLogger.verifyAuditLogIntegrity();

      expect(result.isValid).toBe(true);
      expect(result.totalLogs).toBe(0);
      expect(result.verifiedLogs).toBe(0);
      expect(result.tamperedLogs).toEqual([]);
      expect(result.message).toBe('No audit logs found');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should verify integrity of single log entry', async () => {
      const log = {
        id: 1,
        timestamp: new Date('2024-01-01'),
        user_id: 1,
        user_email: 'test@test.com',
        user_role: 'admin',
        action: 'test.action',
        resource_type: 'test',
        resource_id: 1,
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        request_method: 'GET',
        request_path: '/test',
        status: 'success',
        error_code: null,
        error_message: null,
        metadata: null,
        previous_hash: '' // First entry should have empty previous_hash
      };

      mockClient.query.mockResolvedValueOnce({ rows: [log] });

      const result = await auditLogger.verifyAuditLogIntegrity();

      expect(result.isValid).toBe(true);
      expect(result.totalLogs).toBe(1);
      expect(result.verifiedLogs).toBe(1);
      expect(result.tamperedLogs).toEqual([]);
    });

    it('should detect tampering when hash chain is broken', async () => {
      const log1 = {
        id: 1,
        timestamp: new Date('2024-01-01'),
        user_id: 1,
        user_email: 'test@test.com',
        user_role: 'admin',
        action: 'test.action1',
        resource_type: 'test',
        resource_id: 1,
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        request_method: 'GET',
        request_path: '/test1',
        status: 'success',
        error_code: null,
        error_message: null,
        metadata: null,
        previous_hash: ''
      };

      // Calculate correct hash for log1
      const correctHash1 = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            id: log1.id,
            timestamp: log1.timestamp,
            userId: log1.user_id,
            userEmail: log1.user_email,
            userRole: log1.user_role,
            action: log1.action,
            resourceType: log1.resource_type,
            resourceId: log1.resource_id,
            ipAddress: log1.ip_address,
            userAgent: log1.user_agent,
            requestMethod: log1.request_method,
            requestPath: log1.request_path,
            status: log1.status,
            errorCode: log1.error_code,
            errorMessage: log1.error_message,
            metadata: log1.metadata,
            previousHash: ''
          })
        )
        .digest('hex');

      const log2 = {
        id: 2,
        timestamp: new Date('2024-01-02'),
        user_id: 2,
        user_email: 'test2@test.com',
        user_role: 'user',
        action: 'test.action2',
        resource_type: 'test',
        resource_id: 2,
        ip_address: '127.0.0.2',
        user_agent: 'test-agent2',
        request_method: 'POST',
        request_path: '/test2',
        status: 'success',
        error_code: null,
        error_message: null,
        metadata: null,
        previous_hash: 'wrong_hash' // Wrong hash - tampering detected
      };

      mockClient.query.mockResolvedValueOnce({ rows: [log1, log2] });

      const result = await auditLogger.verifyAuditLogIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.totalLogs).toBe(2);
      expect(result.verifiedLogs).toBe(1);
      expect(result.tamperedLogs).toHaveLength(1);
      expect(result.tamperedLogs[0].logId).toBe(2);
      expect(result.tamperedLogs[0].issue).toContain('Hash chain broken');
      expect(result.tamperedLogs[0].expectedPreviousHash).toBe(correctHash1);
      expect(result.tamperedLogs[0].storedPreviousHash).toBe('wrong_hash');
    });

    it('should verify integrity of multiple valid log entries', async () => {
      const log1 = {
        id: 1,
        timestamp: new Date('2024-01-01'),
        user_id: 1,
        user_email: 'test@test.com',
        user_role: 'admin',
        action: 'test.action1',
        resource_type: 'test',
        resource_id: 1,
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        request_method: 'GET',
        request_path: '/test1',
        status: 'success',
        error_code: null,
        error_message: null,
        metadata: null,
        previous_hash: ''
      };

      // Calculate hash for log1
      const hash1 = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            id: log1.id,
            timestamp: log1.timestamp,
            userId: log1.user_id,
            userEmail: log1.user_email,
            userRole: log1.user_role,
            action: log1.action,
            resourceType: log1.resource_type,
            resourceId: log1.resource_id,
            ipAddress: log1.ip_address,
            userAgent: log1.user_agent,
            requestMethod: log1.request_method,
            requestPath: log1.request_path,
            status: log1.status,
            errorCode: log1.error_code,
            errorMessage: log1.error_message,
            metadata: log1.metadata,
            previousHash: ''
          })
        )
        .digest('hex');

      const log2 = {
        id: 2,
        timestamp: new Date('2024-01-02'),
        user_id: 2,
        user_email: 'test2@test.com',
        user_role: 'user',
        action: 'test.action2',
        resource_type: 'test',
        resource_id: 2,
        ip_address: '127.0.0.2',
        user_agent: 'test-agent2',
        request_method: 'POST',
        request_path: '/test2',
        status: 'success',
        error_code: null,
        error_message: null,
        metadata: null,
        previous_hash: hash1 // Correct hash
      };

      mockClient.query.mockResolvedValueOnce({ rows: [log1, log2] });

      const result = await auditLogger.verifyAuditLogIntegrity();

      expect(result.isValid).toBe(true);
      expect(result.totalLogs).toBe(2);
      expect(result.verifiedLogs).toBe(2);
      expect(result.tamperedLogs).toEqual([]);
      expect(result.message).toContain('All 2 audit logs verified');
    });

    it('should detect issue when first entry has non-empty previous_hash', async () => {
      const log = {
        id: 1,
        timestamp: new Date('2024-01-01'),
        user_id: 1,
        user_email: 'test@test.com',
        user_role: 'admin',
        action: 'test.action',
        resource_type: 'test',
        resource_id: 1,
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        request_method: 'GET',
        request_path: '/test',
        status: 'success',
        error_code: null,
        error_message: null,
        metadata: null,
        previous_hash: 'should_be_empty' // Should be empty for first entry
      };

      mockClient.query.mockResolvedValueOnce({ rows: [log] });

      const result = await auditLogger.verifyAuditLogIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.tamperedLogs).toHaveLength(1);
      expect(result.tamperedLogs[0].logId).toBe(1);
      expect(result.tamperedLogs[0].issue).toContain('First entry should have empty previous_hash');
    });

    it('should handle missing hash (pre-migration logs)', async () => {
      const log1 = {
        id: 1,
        timestamp: new Date('2024-01-01'),
        user_id: 1,
        user_email: 'test@test.com',
        user_role: 'admin',
        action: 'test.action1',
        resource_type: 'test',
        resource_id: 1,
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        request_method: 'GET',
        request_path: '/test1',
        status: 'success',
        error_code: null,
        error_message: null,
        metadata: null,
        previous_hash: ''
      };

      const log2 = {
        id: 2,
        timestamp: new Date('2024-01-02'),
        user_id: 2,
        user_email: 'test2@test.com',
        user_role: 'user',
        action: 'test.action2',
        resource_type: 'test',
        resource_id: 2,
        ip_address: '127.0.0.2',
        user_agent: 'test-agent2',
        request_method: 'POST',
        request_path: '/test2',
        status: 'success',
        error_code: null,
        error_message: null,
        metadata: null,
        previous_hash: null // Missing hash - pre-migration log
      };

      mockClient.query.mockResolvedValueOnce({ rows: [log1, log2] });

      const result = await auditLogger.verifyAuditLogIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.tamperedLogs).toHaveLength(1);
      expect(result.tamperedLogs[0].issue).toContain('Missing hash (pre-migration log)');
    });

    it('should handle database errors during verification', async () => {
      const error = new Error('Database connection failed');
      mockClient.query.mockRejectedValueOnce(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await auditLogger.verifyAuditLogIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(result.message).toBe('Failed to verify audit log integrity');
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Failed to verify audit log integrity:',
        error
      );
      consoleSpy.mockRestore();
    });

    it('should handle null previous_hash in first entry', async () => {
      const log = {
        id: 1,
        timestamp: new Date('2024-01-01'),
        user_id: 1,
        user_email: 'test@test.com',
        user_role: 'admin',
        action: 'test.action',
        resource_type: 'test',
        resource_id: 1,
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        request_method: 'GET',
        request_path: '/test',
        status: 'success',
        error_code: null,
        error_message: null,
        metadata: null,
        previous_hash: null // null is acceptable for first entry
      };

      mockClient.query.mockResolvedValueOnce({ rows: [log] });

      const result = await auditLogger.verifyAuditLogIntegrity();

      expect(result.isValid).toBe(true);
      expect(result.tamperedLogs).toEqual([]);
    });
  });

  describe('initializeAuditLogImmutability', () => {
    it('should create immutability triggers when they do not exist', async () => {
      // Mock table exists check
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // Table exists
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // previous_hash column exists
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // Triggers don't exist (COUNT query)

      // Mock trigger creation queries
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // CREATE FUNCTION prevent_audit_log_delete
        .mockResolvedValueOnce({ rows: [] }) // CREATE FUNCTION prevent_audit_log_update
        .mockResolvedValueOnce({ rows: [] }) // DROP TRIGGER IF EXISTS delete
        .mockResolvedValueOnce({ rows: [] }) // DROP TRIGGER IF EXISTS update
        .mockResolvedValueOnce({ rows: [] }) // CREATE TRIGGER delete
        .mockResolvedValueOnce({ rows: [] }); // CREATE TRIGGER update

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await auditLogger.initializeAuditLogsTable();

      // Verify trigger creation was attempted
      const createFunctionCalls = mockClient.query.mock.calls.filter(call =>
        call[0] && typeof call[0] === 'string' && call[0].includes('CREATE OR REPLACE FUNCTION prevent_audit_log')
      );
      expect(createFunctionCalls.length).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });

    it('should not create triggers when they already exist', async () => {
      // Mock table exists, column exists, triggers exist
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // Table exists
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // previous_hash column exists
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // Both triggers exist (COUNT = 2)

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await auditLogger.initializeAuditLogsTable();

      // Should not call CREATE FUNCTION or CREATE TRIGGER when triggers exist
      const createFunctionCalls = mockClient.query.mock.calls.filter(call =>
        call[0] && typeof call[0] === 'string' && call[0].includes('CREATE OR REPLACE FUNCTION prevent_audit_log')
      );
      expect(createFunctionCalls.length).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should handle errors during trigger creation gracefully', async () => {
      // Mock table exists, column exists, triggers don't exist
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // Table exists
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // previous_hash column exists
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Triggers don't exist
        .mockRejectedValueOnce(new Error('Permission denied')); // CREATE FUNCTION fails

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // Should not throw - allows application to continue
      await expect(auditLogger.initializeAuditLogsTable()).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create immutability triggers'),
        expect.anything()
      );
      
      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should handle partial trigger existence', async () => {
      // Mock table exists, column exists, only one trigger exists
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // Table exists
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // previous_hash column exists
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // Only one trigger exists

      // Mock trigger creation queries (should create missing trigger)
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // CREATE FUNCTION prevent_audit_log_delete
        .mockResolvedValueOnce({ rows: [] }) // CREATE FUNCTION prevent_audit_log_update
        .mockResolvedValueOnce({ rows: [] }) // DROP TRIGGER IF EXISTS delete
        .mockResolvedValueOnce({ rows: [] }) // DROP TRIGGER IF EXISTS update
        .mockResolvedValueOnce({ rows: [] }) // CREATE TRIGGER delete
        .mockResolvedValueOnce({ rows: [] }); // CREATE TRIGGER update

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await auditLogger.initializeAuditLogsTable();

      // Should attempt to create triggers since count is not 2
      const createFunctionCalls = mockClient.query.mock.calls.filter(call =>
        call[0] && typeof call[0] === 'string' && call[0].includes('CREATE OR REPLACE FUNCTION prevent_audit_log')
      );
      expect(createFunctionCalls.length).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });

    it('should handle COUNT query returning numeric string', async () => {
      // Mock table exists, column exists, triggers exist (count as string)
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // Table exists
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // previous_hash column exists
        .mockResolvedValueOnce({ rows: [{ count: 2 }] }); // Both triggers exist (numeric)

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await auditLogger.initializeAuditLogsTable();

      // Should not create triggers when count is 2
      const createFunctionCalls = mockClient.query.mock.calls.filter(call =>
        call[0] && typeof call[0] === 'string' && call[0].includes('CREATE OR REPLACE FUNCTION prevent_audit_log')
      );
      expect(createFunctionCalls.length).toBe(0);
      
      consoleSpy.mockRestore();
    });
  });

  describe('verifyImmutabilityStatus', () => {
    it('should return active status when both triggers exist', async () => {
      const triggers = [
        {
          trigger_name: 'audit_logs_prevent_delete',
          event_manipulation: 'DELETE',
          action_timing: 'BEFORE',
          action_statement: 'EXECUTE FUNCTION prevent_audit_log_delete()'
        },
        {
          trigger_name: 'audit_logs_prevent_update',
          event_manipulation: 'UPDATE',
          action_timing: 'BEFORE',
          action_statement: 'EXECUTE FUNCTION prevent_audit_log_update()'
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: triggers });

      const result = await auditLogger.verifyImmutabilityStatus();

      expect(result.deleteProtection).toBe('ACTIVE');
      expect(result.updateProtection).toBe('ACTIVE');
      expect(result.isFullyProtected).toBe(true);
      expect(result.triggers).toHaveLength(2);
      expect(result.message).toContain('fully active');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return missing status when triggers do not exist', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // No triggers

      const result = await auditLogger.verifyImmutabilityStatus();

      expect(result.deleteProtection).toBe('MISSING');
      expect(result.updateProtection).toBe('MISSING');
      expect(result.isFullyProtected).toBe(false);
      expect(result.triggers).toEqual([]);
      expect(result.message).toContain('not fully active');
    });

    it('should return partial status when only one trigger exists', async () => {
      const triggers = [
        {
          trigger_name: 'audit_logs_prevent_delete',
          event_manipulation: 'DELETE',
          action_timing: 'BEFORE',
          action_statement: 'EXECUTE FUNCTION prevent_audit_log_delete()'
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: triggers });

      const result = await auditLogger.verifyImmutabilityStatus();

      expect(result.deleteProtection).toBe('ACTIVE');
      expect(result.updateProtection).toBe('MISSING');
      expect(result.isFullyProtected).toBe(false);
      expect(result.message).toContain('not fully active');
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockClient.query.mockRejectedValueOnce(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await auditLogger.verifyImmutabilityStatus();

      expect(result.deleteProtection).toBe('UNKNOWN');
      expect(result.updateProtection).toBe('UNKNOWN');
      expect(result.isFullyProtected).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(result.message).toBe('Failed to verify immutability status');
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Failed to verify immutability status:',
        error
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle query returning unexpected trigger names', async () => {
      const triggers = [
        {
          trigger_name: 'some_other_trigger',
          event_manipulation: 'DELETE',
          action_timing: 'BEFORE',
          action_statement: 'EXECUTE FUNCTION some_function()'
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: triggers });

      const result = await auditLogger.verifyImmutabilityStatus();

      expect(result.deleteProtection).toBe('MISSING');
      expect(result.updateProtection).toBe('MISSING');
      expect(result.isFullyProtected).toBe(false);
    });

    it('should handle empty triggers array', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await auditLogger.verifyImmutabilityStatus();

      expect(result.deleteProtection).toBe('MISSING');
      expect(result.updateProtection).toBe('MISSING');
      expect(result.isFullyProtected).toBe(false);
      expect(result.triggers).toEqual([]);
    });

    it('should handle triggers with only delete protection', async () => {
      const triggers = [
        {
          trigger_name: 'audit_logs_prevent_delete',
          event_manipulation: 'DELETE',
          action_timing: 'BEFORE',
          action_statement: 'EXECUTE FUNCTION prevent_audit_log_delete()'
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: triggers });

      const result = await auditLogger.verifyImmutabilityStatus();

      expect(result.deleteProtection).toBe('ACTIVE');
      expect(result.updateProtection).toBe('MISSING');
      expect(result.isFullyProtected).toBe(false);
    });

    it('should handle triggers with only update protection', async () => {
      const triggers = [
        {
          trigger_name: 'audit_logs_prevent_update',
          event_manipulation: 'UPDATE',
          action_timing: 'BEFORE',
          action_statement: 'EXECUTE FUNCTION prevent_audit_log_update()'
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: triggers });

      const result = await auditLogger.verifyImmutabilityStatus();

      expect(result.deleteProtection).toBe('MISSING');
      expect(result.updateProtection).toBe('ACTIVE');
      expect(result.isFullyProtected).toBe(false);
    });
  });
});
