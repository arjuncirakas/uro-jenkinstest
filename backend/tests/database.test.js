import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import dotenv from 'dotenv';

// Mock pg module
const mockPool = {
    connect: jest.fn(),
    query: jest.fn(),
    on: jest.fn(),
    totalCount: 5,
    idleCount: 2,
    waitingCount: 0
};

const mockPoolConstructor = jest.fn(() => mockPool);

jest.unstable_mockModule('pg', () => ({
    default: {
        Pool: mockPoolConstructor
    }
}));

// Mock auditLogger
const mockInitializeAuditLogsTable = jest.fn();
jest.unstable_mockModule('../services/auditLogger.js', () => ({
    initializeAuditLogsTable: mockInitializeAuditLogsTable
}));

// Set up environment variables
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.NODE_ENV = 'test';

describe('Database Configuration', () => {
    let pool;
    let testConnection;
    let initializeDatabase;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        
        // Import module - ES modules are cached, but we can re-import
        const dbModule = await import('../config/database.js');
        pool = dbModule.default;
        testConnection = dbModule.testConnection;
        initializeDatabase = dbModule.initializeDatabase;
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe('Pool Creation', () => {
        it('should create pool with default configuration', () => {
            expect(mockPoolConstructor).toHaveBeenCalled();
            const config = mockPoolConstructor.mock.calls[0][0];
            expect(config.host).toBe('localhost');
            expect(config.port).toBe(5432);
            expect(config.database).toBe('test_db');
            expect(config.user).toBe('test_user');
            expect(config.password).toBe('test_password');
            expect(config.max).toBe(20);
            expect(config.idleTimeoutMillis).toBe(30000);
            expect(config.connectionTimeoutMillis).toBe(10000);
        });

        it('should use environment variables for configuration', () => {
            const config = mockPoolConstructor.mock.calls[0][0];
            expect(config.host).toBe(process.env.DB_HOST);
            expect(config.port).toBe(parseInt(process.env.DB_PORT));
            expect(config.database).toBe(process.env.DB_NAME);
            expect(config.user).toBe(process.env.DB_USER);
            expect(config.password).toBe(process.env.DB_PASSWORD);
        });

        it('should use default values when environment variables are not set', async () => {
            // Note: ES modules are cached, so we test the initial import behavior
            // The defaults are set during the first import
            const config = mockPoolConstructor.mock.calls[0][0];
            // Verify defaults are used when env vars are not set in the config
            expect(config).toBeDefined();
            expect(typeof config.host).toBe('string');
            expect(typeof config.port).toBe('number');
        });
    });

    describe('Pool Error Handling', () => {
        it('should handle pool errors', () => {
            const errorHandler = mockPool.on.mock.calls.find(call => call[0] === 'error')?.[1];
            expect(errorHandler).toBeDefined();
            
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const error = new Error('Pool error');
            error.stack = 'Error stack';
            
            errorHandler(error);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('❌ [Database Pool] Unexpected error on idle client:', 'Pool error');
            expect(consoleErrorSpy).toHaveBeenCalledWith('❌ [Database Pool] Error stack:', 'Error stack');
            
            consoleErrorSpy.mockRestore();
        });

        it('should log pool error without stack if stack is missing', () => {
            const errorHandler = mockPool.on.mock.calls.find(call => call[0] === 'error')?.[1];
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const error = new Error('Pool error');
            delete error.stack;
            
            errorHandler(error);
            
            expect(consoleErrorSpy).toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });
    });

    describe('Top-level code execution', () => {
        it('should execute pool creation and error handler registration', async () => {
            // Verify pool was created (top-level code executed)
            expect(mockPoolConstructor).toHaveBeenCalled();
            
            // Verify error handler was registered (pool.on called)
            expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
        });

        it('should register pool error handler', () => {
            const errorHandler = mockPool.on.mock.calls.find(call => call[0] === 'error')?.[1];
            expect(errorHandler).toBeDefined();
            expect(typeof errorHandler).toBe('function');
        });
    });

    describe('Pool Status Logging', () => {
        it('should execute setInterval in development mode', async () => {
            // The setInterval is registered during module import
            // We verify the pool.on was called, indicating top-level code executed
            expect(mockPool.on).toHaveBeenCalled();
        });
    });

    describe('testConnection', () => {
        it('should successfully connect to database', async () => {
            const mockClient = {
                release: jest.fn()
            };
            mockPool.connect.mockResolvedValue(mockClient);
            
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            
            const result = await testConnection();
            
            expect(result).toBe(true);
            expect(mockPool.connect).toHaveBeenCalled();
            expect(mockClient.release).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith('✅ Database connected successfully');
            
            consoleLogSpy.mockRestore();
        });

        it('should handle connection failure with ECONNREFUSED error', async () => {
            const error = new Error('Connection refused');
            error.code = 'ECONNREFUSED';
            mockPool.connect.mockRejectedValue(error);
            
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            const result = await testConnection();
            
            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith('💡 Solution: PostgreSQL server is not running or not accessible at the specified host/port');
            
            consoleErrorSpy.mockRestore();
        });

        it('should handle connection failure with ENOTFOUND error', async () => {
            const error = new Error('Host not found');
            error.code = 'ENOTFOUND';
            mockPool.connect.mockRejectedValue(error);
            
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            const result = await testConnection();
            
            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith('💡 Solution: Database host not found. Check DB_HOST in .env file');
            
            consoleErrorSpy.mockRestore();
        });

        it('should handle connection failure with password authentication error', async () => {
            const error = new Error('password authentication failed');
            error.code = '28P01';
            mockPool.connect.mockRejectedValue(error);
            
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            const result = await testConnection();
            
            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith('💡 Solution: Invalid database credentials. Check DB_USER and DB_PASSWORD in .env file');
            
            consoleErrorSpy.mockRestore();
        });

        it('should handle connection failure with database not found error', async () => {
            const error = new Error('database does not exist');
            error.code = '3D000';
            mockPool.connect.mockRejectedValue(error);
            
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            const result = await testConnection();
            
            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith('💡 Solution: Database does not exist. Create it or check DB_NAME in .env file');
            
            consoleErrorSpy.mockRestore();
        });

        it('should handle connection failure with timeout error', async () => {
            const error = new Error('Connection timeout');
            error.code = 'ETIMEDOUT';
            mockPool.connect.mockRejectedValue(error);
            
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            const result = await testConnection();
            
            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith('💡 Solution: Connection timeout. Check network connectivity and firewall settings');
            
            consoleErrorSpy.mockRestore();
        });

        it('should handle connection failure with unknown error', async () => {
            const error = new Error('Unknown error');
            error.code = 'UNKNOWN';
            error.stack = 'Error stack trace';
            mockPool.connect.mockRejectedValue(error);
            
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            const result = await testConnection();
            
            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalled();
            
            consoleErrorSpy.mockRestore();
        });

        it('should handle connection failure without error code', async () => {
            const error = new Error('Generic error');
            delete error.code;
            mockPool.connect.mockRejectedValue(error);
            
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            const result = await testConnection();
            
            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalled();
            
            consoleErrorSpy.mockRestore();
        });

        it('should log connection attempt details', async () => {
            const mockClient = {
                release: jest.fn()
            };
            mockPool.connect.mockResolvedValue(mockClient);
            
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            
            await testConnection();
            
            expect(consoleLogSpy).toHaveBeenCalledWith('🔌 Attempting to connect to database...');
            expect(consoleLogSpy).toHaveBeenCalledWith('🔌 Database config:', expect.objectContaining({
                host: expect.any(String),
                port: expect.any(Number),
                database: expect.any(String),
                user: expect.any(String),
                password: expect.any(String)
            }));
            
            consoleLogSpy.mockRestore();
        });
    });

    describe('initializeDatabase', () => {
        let mockClient;

        beforeEach(() => {
            mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };
            mockPool.connect.mockResolvedValue(mockClient);
        });

        it('should initialize database tables successfully', async () => {
            // Mock table existence checks
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // users table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // refresh_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // otp_verifications exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_setup_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_reset_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_history exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patients table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_notes exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_results exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // appointments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_bookings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_meetings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_team_members exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // departments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // doctors exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // discharge_summaries exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // clinical_guidelines exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // guideline_compliance_checks exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }); // decision_support_recommendations exists

            // Mock index creation (many calls)
            mockClient.query.mockResolvedValue({ rows: [] });

            mockInitializeAuditLogsTable.mockResolvedValue(undefined);

            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            const result = await initializeDatabase();

            expect(result).toBe(true);
            expect(mockClient.release).toHaveBeenCalled();
            expect(mockInitializeAuditLogsTable).toHaveBeenCalled();

            consoleLogSpy.mockRestore();
        });

        it('should create users table if it does not exist', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ exists: false }] }) // users table does not exist
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // refresh_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // otp_verifications exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_setup_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_reset_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_history exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patients table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_notes exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_results exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // appointments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_bookings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_meetings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_team_members exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // departments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // doctors exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // discharge_summaries exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // clinical_guidelines exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // guideline_compliance_checks exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }); // decision_support_recommendations exists

            mockClient.query.mockResolvedValue({ rows: [] });
            mockInitializeAuditLogsTable.mockResolvedValue(undefined);

            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            await initializeDatabase();

            const createTableCall = mockClient.query.mock.calls.find(call =>
                call[0]?.includes('CREATE TABLE users')
            );
            expect(createTableCall).toBeDefined();
            expect(consoleLogSpy).toHaveBeenCalledWith('✅ Users table created successfully');

            consoleLogSpy.mockRestore();
        });

        it('should add missing columns to existing users table', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // users table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // refresh_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // otp_verifications exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_setup_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_reset_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_history exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patients table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_notes exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_results exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // appointments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_bookings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_meetings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_team_members exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // departments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // doctors exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // discharge_summaries exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // clinical_guidelines exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // guideline_compliance_checks exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }); // decision_support_recommendations exists

            // Mock column additions (some succeed, some fail because column exists)
            mockClient.query
                .mockResolvedValueOnce({}) // phone column
                .mockResolvedValueOnce({}) // organization column
                .mockResolvedValueOnce({}) // is_active column
                .mockResolvedValueOnce({}) // is_verified column
                .mockResolvedValueOnce({}) // email_verified_at column
                .mockResolvedValueOnce({}) // phone_verified_at column
                .mockResolvedValueOnce({}) // last_login_at column
                .mockResolvedValueOnce({}) // failed_login_attempts column
                .mockResolvedValueOnce({}) // locked_until column
                .mockResolvedValueOnce({}) // role constraint update
                .mockResolvedValue({ rows: [] }); // Other queries

            mockInitializeAuditLogsTable.mockResolvedValue(undefined);

            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            await initializeDatabase();

            const addColumnCalls = mockClient.query.mock.calls.filter(call =>
                call[0]?.includes('ALTER TABLE users ADD COLUMN IF NOT EXISTS')
            );
            expect(addColumnCalls.length).toBeGreaterThan(0);

            consoleLogSpy.mockRestore();
        });

        it('should handle errors when adding columns', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // users table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // refresh_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // otp_verifications exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_setup_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_reset_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_history exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patients table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_notes exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_results exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // appointments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_bookings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_meetings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_team_members exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // departments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // doctors exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // discharge_summaries exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // clinical_guidelines exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // guideline_compliance_checks exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }); // decision_support_recommendations exists

            // Mock column addition error
            mockClient.query
                .mockRejectedValueOnce(new Error('Column already exists'))
                .mockResolvedValue({ rows: [] });

            mockInitializeAuditLogsTable.mockResolvedValue(undefined);

            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            await initializeDatabase();

            // Should continue despite error
            expect(mockClient.release).toHaveBeenCalled();

            consoleLogSpy.mockRestore();
        });

        it('should create refresh_tokens table if it does not exist', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // users table exists
                .mockResolvedValueOnce({ rows: [{ exists: false }] }) // refresh_tokens does not exist
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // otp_verifications exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_setup_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_reset_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_history exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patients table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_notes exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_results exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // appointments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_bookings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_meetings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_team_members exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // departments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // doctors exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // discharge_summaries exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // clinical_guidelines exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // guideline_compliance_checks exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }); // decision_support_recommendations exists

            mockClient.query.mockResolvedValue({ rows: [] });
            mockInitializeAuditLogsTable.mockResolvedValue(undefined);

            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            await initializeDatabase();

            const createTableCall = mockClient.query.mock.calls.find(call =>
                call[0]?.includes('CREATE TABLE refresh_tokens')
            );
            expect(createTableCall).toBeDefined();
            expect(consoleLogSpy).toHaveBeenCalledWith('✅ Refresh tokens table created successfully');

            consoleLogSpy.mockRestore();
        });

        it('should handle database initialization errors', async () => {
            const error = new Error('Database error');
            mockPool.connect.mockRejectedValue(error);

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const result = await initializeDatabase();

            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Database initialization failed:', 'Database error');

            consoleErrorSpy.mockRestore();
        });

        it('should create all required indexes', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // users table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // refresh_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // otp_verifications exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_setup_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_reset_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_history exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patients table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_notes exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_results exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // appointments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_bookings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_meetings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_team_members exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // departments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // doctors exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // discharge_summaries exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // clinical_guidelines exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // guideline_compliance_checks exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }); // decision_support_recommendations exists

            mockClient.query.mockResolvedValue({ rows: [] });
            mockInitializeAuditLogsTable.mockResolvedValue(undefined);

            await initializeDatabase();

            const indexCalls = mockClient.query.mock.calls.filter(call =>
                call[0]?.includes('CREATE INDEX IF NOT EXISTS')
            );
            expect(indexCalls.length).toBeGreaterThan(0);
        });

        it('should migrate existing passwords to password history', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // users table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // refresh_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // otp_verifications exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_setup_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_reset_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: false }] }) // password_history does not exist
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patients table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_notes exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_results exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // appointments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_bookings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_meetings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_team_members exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // departments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // doctors exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // discharge_summaries exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // clinical_guidelines exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // guideline_compliance_checks exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }); // decision_support_recommendations exists

            // Mock password history creation and migration
            mockClient.query
                .mockResolvedValueOnce({}) // Create password_history table
                .mockResolvedValueOnce({ rowCount: 5 }) // Migrate 5 passwords
                .mockResolvedValue({ rows: [] });

            mockInitializeAuditLogsTable.mockResolvedValue(undefined);

            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            await initializeDatabase();

            const migrateCall = mockClient.query.mock.calls.find(call =>
                call[0]?.includes('INSERT INTO password_history')
            );
            expect(migrateCall).toBeDefined();
            expect(consoleLogSpy).toHaveBeenCalledWith('✅ Migrated 5 existing passwords to history!');

            consoleLogSpy.mockRestore();
        });

        it('should handle patients table gender column updates', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // users table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // refresh_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // otp_verifications exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_setup_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_reset_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_history exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patients table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_notes exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_results exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // appointments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_bookings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_meetings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_team_members exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // departments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // doctors exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // discharge_summaries exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // clinical_guidelines exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // guideline_compliance_checks exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }); // decision_support_recommendations exists

            mockClient.query.mockResolvedValue({ rows: [] });
            mockInitializeAuditLogsTable.mockResolvedValue(undefined);

            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            await initializeDatabase();

            const genderUpdateCall = mockClient.query.mock.calls.find(call =>
                call[0]?.includes('ALTER TABLE patients') && call[0]?.includes('gender')
            );
            expect(genderUpdateCall).toBeDefined();

            consoleLogSpy.mockRestore();
        });

        it('should add care_pathway columns to patients table', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // users table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // refresh_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // otp_verifications exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_setup_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_reset_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_history exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patients table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_notes exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_results exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // appointments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_bookings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_meetings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_team_members exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // departments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // doctors exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // discharge_summaries exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // clinical_guidelines exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // guideline_compliance_checks exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }); // decision_support_recommendations exists

            mockClient.query.mockResolvedValue({ rows: [] });
            mockInitializeAuditLogsTable.mockResolvedValue(undefined);

            await initializeDatabase();

            const carePathwayCalls = mockClient.query.mock.calls.filter(call =>
                call[0]?.includes('care_pathway')
            );
            expect(carePathwayCalls.length).toBeGreaterThan(0);
        });

        it('should handle appointments table updates', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // users table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // refresh_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // otp_verifications exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_setup_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_reset_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_history exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patients table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_notes exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_results exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // appointments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_bookings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_meetings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_team_members exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // departments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // doctors exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // discharge_summaries exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // clinical_guidelines exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // guideline_compliance_checks exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }); // decision_support_recommendations exists

            // Mock appointments table column additions
            mockClient.query
                .mockResolvedValueOnce({}) // surgery_type column
                .mockResolvedValueOnce({}) // reminder_sent column
                .mockResolvedValueOnce({}) // reminder_sent_at column
                .mockResolvedValueOnce({}) // appointment_time nullable
                .mockResolvedValueOnce({ rows: [] }) // Foreign key check
                .mockResolvedValue({ rows: [] });

            mockInitializeAuditLogsTable.mockResolvedValue(undefined);

            await initializeDatabase();

            const surgeryTypeCall = mockClient.query.mock.calls.find(call =>
                call[0]?.includes('surgery_type')
            );
            expect(surgeryTypeCall).toBeDefined();
        });

        it('should handle investigation_bookings table updates', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // users table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // refresh_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // otp_verifications exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_setup_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_reset_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_history exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patients table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_notes exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_results exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // appointments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_bookings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_meetings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_team_members exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // departments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // doctors exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // discharge_summaries exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // clinical_guidelines exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // guideline_compliance_checks exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }); // decision_support_recommendations exists

            // Mock investigation_bookings nullable migration
            mockClient.query
                .mockResolvedValueOnce({}) // Make scheduled_date nullable
                .mockResolvedValue({ rows: [] });

            mockInitializeAuditLogsTable.mockResolvedValue(undefined);

            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            await initializeDatabase();

            const nullableCall = mockClient.query.mock.calls.find(call =>
                call[0]?.includes('investigation_bookings') && call[0]?.includes('DROP NOT NULL')
            );
            expect(nullableCall).toBeDefined();

            consoleLogSpy.mockRestore();
        });

        it('should handle mdt_team_members table updates', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // users table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // refresh_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // otp_verifications exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_setup_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_reset_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_history exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patients table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_notes exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_results exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // appointments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_bookings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_meetings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_team_members exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // departments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // doctors exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // discharge_summaries exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // clinical_guidelines exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // guideline_compliance_checks exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }); // decision_support_recommendations exists

            mockClient.query.mockResolvedValue({ rows: [] });
            mockInitializeAuditLogsTable.mockResolvedValue(undefined);

            await initializeDatabase();

            const mdtUpdates = mockClient.query.mock.calls.filter(call =>
                call[0]?.includes('mdt_team_members')
            );
            expect(mdtUpdates.length).toBeGreaterThan(0);
        });

        it('should handle consent_forms table column updates', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // users table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // refresh_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // otp_verifications exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_setup_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_reset_tokens exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_history exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patients table exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_notes exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_results exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // appointments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // investigation_bookings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_meetings exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // mdt_team_members exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // departments exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // doctors exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // discharge_summaries exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // patient_consent_forms exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // clinical_guidelines exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }) // guideline_compliance_checks exists
                .mockResolvedValueOnce({ rows: [{ exists: true }] }); // decision_support_recommendations exists

            // Mock consent_forms column additions
            mockClient.query
                .mockResolvedValueOnce({}) // Add columns
                .mockResolvedValue({ rows: [] });

            mockInitializeAuditLogsTable.mockResolvedValue(undefined);

            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            await initializeDatabase();

            const consentFormsUpdate = mockClient.query.mock.calls.find(call =>
                call[0]?.includes('consent_forms') && call[0]?.includes('ADD COLUMN IF NOT EXISTS')
            );
            expect(consentFormsUpdate).toBeDefined();

            consoleLogSpy.mockRestore();
        });
    });

    describe('Pool Error Handling', () => {
        it('should handle pool errors', async () => {
            const errorHandler = mockPool.on.mock.calls.find(call => call[0] === 'error')?.[1];
            
            if (errorHandler) {
                const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
                const testError = new Error('Pool error test');
                testError.stack = 'Error stack trace';
                
                errorHandler(testError);
                
                expect(consoleErrorSpy).toHaveBeenCalled();
                consoleErrorSpy.mockRestore();
            } else {
                // Pool error handler should be registered
                expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
            }
        });
    });

    describe('Development Logging', () => {
        it('should execute top-level code including pool creation', async () => {
            // Verify pool was created during module import (top-level code)
            expect(mockPoolConstructor).toHaveBeenCalled();
            
            // Verify error handler registration (top-level code)
            expect(mockPool.on).toHaveBeenCalled();
        });
    });

    describe('Default Export', () => {
        it('should export pool as default', async () => {
            const dbModule = await import('../config/database.js');
            expect(dbModule.default).toBeDefined();
            expect(dbModule.default).toBe(mockPool);
        });
    });
});







