import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies
const mockPool = {
    connect: jest.fn()
};

const mockEmailService = {
    sendPasswordEmail: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
    default: mockPool
}));

jest.unstable_mockModule('../services/emailService.js', () => ({
    sendPasswordEmail: mockEmailService.sendPasswordEmail
}));

const mockValidationResult = jest.fn(() => ({
    isEmpty: () => true,
    array: () => []
}));

jest.unstable_mockModule('express-validator', () => ({
    validationResult: mockValidationResult
}));

describe('GP Controller', () => {
    let gpController;
    let mockClient;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        mockPool.connect.mockResolvedValue(mockClient);

        gpController = await import('../controllers/gpController.js');
    });

    describe('getAllGPs', () => {
        it('should return all active GPs', async () => {
            const req = { query: { is_active: 'true' } };
            const res = {
                json: jest.fn()
            };

            const mockGPs = [
                {
                    id: 1,
                    email: 'gp1@example.com',
                    first_name: 'John',
                    last_name: 'Doe',
                    phone: '1234567890',
                    organization: 'Test Org',
                    role: 'gp',
                    is_active: true,
                    is_verified: true,
                    created_at: new Date(),
                    last_login_at: new Date()
                }
            ];

            mockClient.query.mockResolvedValue({ rows: mockGPs });

            await gpController.getAllGPs(req, res);

            expect(mockClient.query).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.arrayContaining([
                    expect.objectContaining({
                        id: 1,
                        email: 'gp1@example.com'
                    })
                ])
            }));
        });

        it('should return inactive GPs when is_active is false', async () => {
            const req = { query: { is_active: 'false' } };
            const res = {
                json: jest.fn()
            };

            const mockGPs = [
                {
                    id: 2,
                    email: 'gp2@example.com',
                    first_name: 'Jane',
                    last_name: 'Smith',
                    phone: '0987654321',
                    organization: 'Test Org 2',
                    role: 'gp',
                    is_active: false,
                    is_verified: true,
                    created_at: new Date(),
                    last_login_at: new Date()
                }
            ];

            mockClient.query.mockResolvedValue({ rows: mockGPs });

            await gpController.getAllGPs(req, res);

            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE role = \'gp\' AND is_active = $1'),
                [false]
            );
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.arrayContaining([
                    expect.objectContaining({
                        id: 2,
                        email: 'gp2@example.com'
                    })
                ])
            }));
        });

        it('should default to active GPs when is_active is not provided', async () => {
            const req = { query: {} };
            const res = {
                json: jest.fn()
            };

            const mockGPs = [
                {
                    id: 1,
                    email: 'gp1@example.com',
                    first_name: 'John',
                    last_name: 'Doe',
                    phone: '1234567890',
                    organization: 'Test Org',
                    role: 'gp',
                    is_active: true,
                    is_verified: true,
                    created_at: new Date(),
                    last_login_at: new Date()
                }
            ];

            mockClient.query.mockResolvedValue({ rows: mockGPs });

            await gpController.getAllGPs(req, res);

            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE role = \'gp\' AND is_active = $1'),
                [true]
            );
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle errors', async () => {
            const req = { query: {} };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            mockClient.query.mockRejectedValue(new Error('DB Error'));

            await gpController.getAllGPs(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to fetch GPs'
            });
        });
    });

    describe('getGPById', () => {
        it('should return GP details when found', async () => {
            const req = { params: { id: 1 } };
            const res = {
                json: jest.fn()
            };

            const mockGP = { id: 1, first_name: 'John' };
            mockClient.query.mockResolvedValue({ rows: [mockGP] });

            await gpController.getGPById(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockGP
            });
        });

        it('should return 404 when GP not found', async () => {
            const req = { params: { id: 999 } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            mockClient.query.mockResolvedValue({ rows: [] });

            await gpController.getGPById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'GP not found'
            });
        });

        it('should handle database errors', async () => {
            const req = { params: { id: 1 } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            mockClient.query.mockRejectedValue(new Error('DB Error'));

            await gpController.getGPById(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to fetch GP'
            });
        });
    });

    describe('createGP', () => {
        it('should create a new GP successfully', async () => {
            const req = {
                body: {
                    first_name: 'Jane',
                    last_name: 'Doe',
                    email: 'jane@example.com',
                    phone: '0987654321',
                    organization: 'New Org'
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            // Mock user existence check (empty)
            // Mock phone existence check (empty)
            // Mock insert
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // Start transaction
                .mockResolvedValueOnce({ rows: [] }) // Email check
                .mockResolvedValueOnce({ rows: [] }) // Phone check
                .mockResolvedValueOnce({
                    rows: [{
                        id: 2,
                        email: 'jane@example.com',
                        first_name: 'Jane',
                        last_name: 'Doe',
                        role: 'gp'
                    }]
                }) // Insert
                .mockResolvedValueOnce({ rows: [] }); // Commit

            mockEmailService.sendPasswordEmail.mockResolvedValue({ success: true, messageId: '123' });

            await gpController.createGP(req, res);

            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    emailSent: true
                })
            }));
        });

        it('should return 409 if user with email already exists', async () => {
            const req = {
                body: {
                    first_name: 'Jane',
                    last_name: 'Doe',
                    email: 'existing@example.com',
                    phone: '0987654321',
                    organization: 'New Org'
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Email check (found)

            await gpController.createGP(req, res);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'User with this email already exists'
            }));
        });

        it('should return 409 if phone number already exists', async () => {
            const req = {
                body: {
                    first_name: 'Jane',
                    last_name: 'Doe',
                    email: 'jane@example.com',
                    phone: 'existing_phone',
                    organization: 'New Org'
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // Email check
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Phone check (found)

            await gpController.createGP(req, res);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Phone number is already in use'
            }));
        });

        it('should handle validation errors', async () => {
            mockValidationResult.mockReturnValueOnce({
                isEmpty: () => false,
                array: () => [{ path: 'email', msg: 'Invalid email' }]
            });

            const req = {
                body: {
                    first_name: 'Jane',
                    last_name: 'Doe',
                    email: 'invalid-email',
                    phone: '0987654321'
                }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }); // BEGIN

            await gpController.createGP(req, res);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: 'Validation failed'
            }));
        });

        it('should handle email sending failure', async () => {
            const req = {
                body: {
                    first_name: 'Jane',
                    last_name: 'Doe',
                    email: 'jane@example.com',
                    phone: '0987654321',
                    organization: 'New Org'
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // Email check
                .mockResolvedValueOnce({ rows: [] }) // Phone check
                .mockResolvedValueOnce({
                    rows: [{
                        id: 2,
                        email: 'jane@example.com',
                        first_name: 'Jane',
                        last_name: 'Doe',
                        role: 'gp'
                    }]
                }) // Insert
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            mockEmailService.sendPasswordEmail.mockResolvedValue({ 
                success: false, 
                error: 'Email service unavailable' 
            });

            await gpController.createGP(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    emailSent: false,
                    emailError: 'Email service unavailable',
                    tempPassword: expect.any(String)
                })
            }));
        });

        it('should handle database error code 23505 (unique constraint)', async () => {
            const req = {
                body: {
                    first_name: 'Jane',
                    last_name: 'Doe',
                    email: 'jane@example.com',
                    phone: '0987654321'
                }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            const dbError = new Error('Duplicate key');
            dbError.code = '23505';

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // Email check
                .mockResolvedValueOnce({ rows: [] }) // Phone check
                .mockRejectedValueOnce(dbError); // Insert fails with unique constraint

            await gpController.createGP(req, res);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: 'GP with this email or phone already exists'
            }));
        });

        it('should handle database error during creation', async () => {
            const req = { body: {} };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            // First call (BEGIN) returns success
            // Second call (validation or whatever) fails
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockRejectedValueOnce(new Error('DB Error')) // Insert/Check fails
                .mockResolvedValueOnce({ rows: [] }); // ROLLBACK succeeds

            await gpController.createGP(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });

    });

    describe('updateGP', () => {
        it('should update GP successfully', async () => {
            const req = {
                params: { id: 1 },
                body: {
                    first_name: 'Updated',
                    last_name: 'Name',
                    email: 'updated@example.com'
                }
            };
            const res = {
                json: jest.fn()
            };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ email: 'old@example.com', is_active: true }] }) // Get existing
                .mockResolvedValueOnce({ rows: [] }) // Check email unique
                .mockResolvedValueOnce({
                    rows: [{
                        id: 1,
                        first_name: 'Updated',
                        email: 'updated@example.com'
                    }]
                }) // Update
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            await gpController.updateGP(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'GP updated successfully',
                data: expect.any(Object)
            });
        });

        it('should return 409 if new email already exists', async () => {
            const req = {
                params: { id: 1 },
                body: { email: 'existing@example.com' }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ email: 'old@example.com', is_active: true }] }) // Get existing
                .mockResolvedValueOnce({ rows: [{ id: 2 }] }); // Check new email (found)

            await gpController.updateGP(req, res);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'User with this email already exists'
            }));
        });

        it('should return 409 if new phone already exists', async () => {
            const req = {
                params: { id: 1 },
                body: { phone: 'new_phone' }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            // Mock existing GP has different phone
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ email: 'same@example.com', is_active: true }] }) // Get existing
                // No email check since it's implied same or not provided
                .mockResolvedValueOnce({ rows: [{ id: 2 }] }); // Check phone (found)

            await gpController.updateGP(req, res);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Phone number is already in use'
            }));
        });

        it('should return 404 when GP not found', async () => {
            const req = {
                params: { id: 999 },
                body: { first_name: 'Updated' }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [] }); // Get existing (not found)

            await gpController.updateGP(req, res);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: 'GP not found'
            }));
        });

        it('should handle validation errors', async () => {
            mockValidationResult.mockReturnValueOnce({
                isEmpty: () => false,
                array: () => [{ path: 'email', msg: 'Invalid email' }]
            });

            const req = {
                params: { id: 1 },
                body: { email: 'invalid-email' }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }); // BEGIN

            await gpController.updateGP(req, res);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: 'Validation failed'
            }));
        });

        it('should update GP without changing email', async () => {
            const req = {
                params: { id: 1 },
                body: {
                    first_name: 'Updated',
                    last_name: 'Name'
                    // No email provided, so it should keep the same
                }
            };
            const res = {
                json: jest.fn()
            };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ email: 'old@example.com', is_active: true }] }) // Get existing
                .mockResolvedValueOnce({
                    rows: [{
                        id: 1,
                        first_name: 'Updated',
                        last_name: 'Name',
                        email: 'old@example.com'
                    }]
                }) // Update
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            await gpController.updateGP(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'GP updated successfully'
            }));
        });

        it('should update GP with is_active change', async () => {
            const req = {
                params: { id: 1 },
                body: {
                    first_name: 'Updated',
                    is_active: false
                }
            };
            const res = {
                json: jest.fn()
            };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ email: 'old@example.com', is_active: true }] }) // Get existing
                .mockResolvedValueOnce({
                    rows: [{
                        id: 1,
                        first_name: 'Updated',
                        email: 'old@example.com',
                        is_active: false
                    }]
                }) // Update
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            await gpController.updateGP(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'GP updated successfully'
            }));
        });

        it('should handle database error code 23505 (unique constraint)', async () => {
            const req = {
                params: { id: 1 },
                body: {
                    first_name: 'Updated',
                    email: 'existing@example.com'
                }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            const dbError = new Error('Duplicate key');
            dbError.code = '23505';

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ email: 'old@example.com', is_active: true }] }) // Get existing
                .mockResolvedValueOnce({ rows: [] }) // Check email unique
                .mockRejectedValueOnce(dbError); // Update fails with unique constraint

            await gpController.updateGP(req, res);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: 'GP with this email or phone already exists'
            }));
        });

        it('should handle database errors', async () => {
            const req = {
                params: { id: 1 },
                body: { first_name: 'Updated' }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ email: 'old@example.com', is_active: true }] }) // Get existing
                .mockRejectedValueOnce(new Error('DB Error')); // Update fails

            await gpController.updateGP(req, res);

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: 'Failed to update GP'
            }));
        });
    });


    describe('deleteGP', () => {
        it('should soft delete GP', async () => {
            const req = { params: { id: 1 } };
            const res = {
                json: jest.fn()
            };

            mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] });

            await gpController.deleteGP(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'GP deleted successfully'
            });
        });

        it('should return 404 when GP not found', async () => {
            const req = { params: { id: 999 } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            mockClient.query.mockResolvedValue({ rows: [] });

            await gpController.deleteGP(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'GP not found'
            });
        });

        it('should handle database errors', async () => {
            const req = { params: { id: 1 } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            mockClient.query.mockRejectedValue(new Error('DB Error'));

            await gpController.deleteGP(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to delete GP'
            });
        });
    });
});
