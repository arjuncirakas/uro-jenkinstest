/**
 * Tests for fix-user-deletion-constraints script
 * Tests all functions to achieve full branch coverage
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  STATIC_QUERIES,
  CONSTRAINT_CONFIGS,
  createPool,
  getStaticQueries,
  fixConstraint,
  fixUserDeletionConstraints,
  runMigration,
} from '../scripts/fix-user-deletion-constraints.js';

// Mock pg module
jest.unstable_mockModule('pg', () => ({
  default: {
    Pool: jest.fn(),
  },
}));

describe('fix-user-deletion-constraints', () => {
  let consoleSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('STATIC_QUERIES', () => {
    it('should contain all 11 constraint configurations', () => {
      const queryKeys = Object.keys(STATIC_QUERIES);
      expect(queryKeys.length).toBe(11);
    });

    it('should have correct structure for each query set', () => {
      Object.entries(STATIC_QUERIES).forEach(([key, queries]) => {
        expect(queries).toHaveProperty('dropNotNull');
        expect(queries).toHaveProperty('dropConstraint');
        expect(queries).toHaveProperty('addConstraint');
        expect(typeof queries.dropNotNull).toBe('string');
        expect(typeof queries.dropConstraint).toBe('string');
        expect(typeof queries.addConstraint).toBe('string');
      });
    });

    it('should have correct SQL for patients.created_by', () => {
      const queries = STATIC_QUERIES['patients.created_by'];
      expect(queries.dropNotNull).toBe('ALTER TABLE "patients" ALTER COLUMN "created_by" DROP NOT NULL;');
      expect(queries.dropConstraint).toBe('ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "patients_created_by_fkey";');
      expect(queries.addConstraint).toContain('ADD CONSTRAINT "patients_created_by_fkey"');
      expect(queries.addConstraint).toContain('ON DELETE SET NULL');
    });

    it('should have all discharge_summaries queries', () => {
      expect(STATIC_QUERIES['discharge_summaries.consultant_id']).toBeDefined();
      expect(STATIC_QUERIES['discharge_summaries.created_by']).toBeDefined();
      expect(STATIC_QUERIES['discharge_summaries.updated_by']).toBeDefined();
    });

    it('should have queries reference users table', () => {
      Object.values(STATIC_QUERIES).forEach((queries) => {
        expect(queries.addConstraint).toContain('REFERENCES "users"("id")');
      });
    });
  });

  describe('CONSTRAINT_CONFIGS', () => {
    it('should contain expected constraint configurations', () => {
      expect(Array.isArray(CONSTRAINT_CONFIGS)).toBe(true);
      expect(CONSTRAINT_CONFIGS.length).toBe(11);
    });

    it('should have correct structure for each config', () => {
      CONSTRAINT_CONFIGS.forEach((config) => {
        expect(config).toHaveProperty('table');
        expect(config).toHaveProperty('column');
        expect(typeof config.table).toBe('string');
        expect(typeof config.column).toBe('string');
      });
    });

    it('should match keys in STATIC_QUERIES', () => {
      CONSTRAINT_CONFIGS.forEach((config) => {
        const key = config.table + '.' + config.column;
        expect(STATIC_QUERIES[key]).toBeDefined();
      });
    });

    it('should include patients table configuration', () => {
      const patientsConfig = CONSTRAINT_CONFIGS.find((c) => c.table === 'patients');
      expect(patientsConfig).toBeDefined();
      expect(patientsConfig.column).toBe('created_by');
    });

    it('should include all discharge_summaries columns', () => {
      const dischargeSummaryConfigs = CONSTRAINT_CONFIGS.filter(
        (c) => c.table === 'discharge_summaries'
      );
      expect(dischargeSummaryConfigs.length).toBe(3);
      const columns = dischargeSummaryConfigs.map((c) => c.column);
      expect(columns).toContain('consultant_id');
      expect(columns).toContain('created_by');
      expect(columns).toContain('updated_by');
    });
  });

  describe('getStaticQueries', () => {
    it('should return queries for valid table.column', () => {
      const queries = getStaticQueries('patients', 'created_by');
      expect(queries).toBeDefined();
      expect(queries.dropNotNull).toBe('ALTER TABLE "patients" ALTER COLUMN "created_by" DROP NOT NULL;');
    });

    it('should return queries for appointments.urologist_id', () => {
      const queries = getStaticQueries('appointments', 'urologist_id');
      expect(queries).toBeDefined();
      expect(queries.addConstraint).toContain('appointments_urologist_id_fkey');
    });

    it('should return null for invalid table', () => {
      const queries = getStaticQueries('invalid_table', 'created_by');
      expect(queries).toBeNull();
    });

    it('should return null for invalid column', () => {
      const queries = getStaticQueries('patients', 'invalid_column');
      expect(queries).toBeNull();
    });

    it('should return null for completely unknown combination', () => {
      const queries = getStaticQueries('unknown', 'unknown');
      expect(queries).toBeNull();
    });

    it('should work for all CONSTRAINT_CONFIGS', () => {
      CONSTRAINT_CONFIGS.forEach((config) => {
        const queries = getStaticQueries(config.table, config.column);
        expect(queries).not.toBeNull();
        expect(queries.dropNotNull).toBeDefined();
        expect(queries.dropConstraint).toBeDefined();
        expect(queries.addConstraint).toBeDefined();
      });
    });
  });

  describe('createPool', () => {
    it('should create pool with provided config', () => {
      const mockConfig = {
        host: 'test-host',
        port: 5433,
        database: 'test-db',
        user: 'test-user',
        password: 'test-pass',
      };
      
      const pool = createPool(mockConfig);
      expect(pool).toBeDefined();
    });

    it('should create pool with environment defaults when no config provided', () => {
      const pool = createPool();
      expect(pool).toBeDefined();
    });

    it('should create pool with null config (uses env defaults)', () => {
      const pool = createPool(null);
      expect(pool).toBeDefined();
    });
  });

  describe('fixConstraint', () => {
    it('should execute correct SQL queries for constraint fix', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
      };

      await fixConstraint(mockClient, 'patients', 'created_by');

      expect(mockClient.query).toHaveBeenCalledTimes(3);
      
      // Check queries are the static pre-built ones
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        'ALTER TABLE "patients" ALTER COLUMN "created_by" DROP NOT NULL;'
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        'ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "patients_created_by_fkey";'
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('ADD CONSTRAINT "patients_created_by_fkey"')
      );
    });

    it('should log progress messages', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
      };

      await fixConstraint(mockClient, 'appointments', 'urologist_id');

      expect(consoleSpy).toHaveBeenCalledWith('📋 Fixing appointments.urologist_id constraint...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Fixed appointments.urologist_id');
    });

    it('should propagate errors from query execution', async () => {
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      await expect(fixConstraint(mockClient, 'patients', 'created_by')).rejects.toThrow(
        'Database error'
      );
    });

    it('should handle different table and column combinations', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
      };

      await fixConstraint(mockClient, 'mdt_team_members', 'user_id');

      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        'ALTER TABLE "mdt_team_members" ALTER COLUMN "user_id" DROP NOT NULL;'
      );
    });

    it('should throw error for invalid table.column combination', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
      };

      await expect(fixConstraint(mockClient, 'invalid_table', 'created_by')).rejects.toThrow(
        'Invalid table.column combination: invalid_table.created_by'
      );
    });

    it('should throw error for invalid column', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
      };

      await expect(fixConstraint(mockClient, 'patients', 'invalid_column')).rejects.toThrow(
        'Invalid table.column combination: patients.invalid_column'
      );
    });

    it('should work for all valid constraint configs', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
      };

      for (const config of CONSTRAINT_CONFIGS) {
        mockClient.query.mockClear();
        await fixConstraint(mockClient, config.table, config.column);
        expect(mockClient.query).toHaveBeenCalledTimes(3);
      }
    });
  });

  describe('fixUserDeletionConstraints', () => {
    it('should successfully fix all constraints', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        end: jest.fn().mockResolvedValue(undefined),
      };

      await fixUserDeletionConstraints(mockPool);

      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalledTimes(1);
      expect(mockPool.end).toHaveBeenCalledTimes(1);
    });

    it('should fix all constraint configurations', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        end: jest.fn().mockResolvedValue(undefined),
      };

      await fixUserDeletionConstraints(mockPool);

      // BEGIN + 3 queries per constraint (11 constraints) + COMMIT = 1 + 33 + 1 = 35
      expect(mockClient.query).toHaveBeenCalledTimes(35);
    });

    it('should rollback on error and rethrow', async () => {
      const mockError = new Error('Constraint violation');
      mockError.stack = 'Error stack trace';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockRejectedValueOnce(mockError), // First constraint query fails
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        end: jest.fn().mockResolvedValue(undefined),
      };

      await expect(fixUserDeletionConstraints(mockPool)).rejects.toThrow('Constraint violation');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ Migration failed:', 'Constraint violation');
      expect(mockClient.release).toHaveBeenCalledTimes(1);
      expect(mockPool.end).toHaveBeenCalledTimes(1);
    });

    it('should release client and end pool even on error', async () => {
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Database connection lost')),
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        end: jest.fn().mockResolvedValue(undefined),
      };

      await expect(fixUserDeletionConstraints(mockPool)).rejects.toThrow();

      expect(mockClient.release).toHaveBeenCalledTimes(1);
      expect(mockPool.end).toHaveBeenCalledTimes(1);
    });

    it('should log success messages on completion', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        end: jest.fn().mockResolvedValue(undefined),
      };

      await fixUserDeletionConstraints(mockPool);

      expect(consoleSpy).toHaveBeenCalledWith(
        '🔄 Starting migration to fix user deletion constraints...\n'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '\n✅ All foreign key constraints fixed successfully!'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '✅ Users can now be deleted without affecting patient records'
      );
    });

    it('should handle pool connection error', async () => {
      const mockPool = {
        connect: jest.fn().mockRejectedValue(new Error('Connection refused')),
        end: jest.fn().mockResolvedValue(undefined),
      };

      await expect(fixUserDeletionConstraints(mockPool)).rejects.toThrow('Connection refused');
    });

    it('should log error stack trace on failure', async () => {
      const mockError = new Error('Test error');
      mockError.stack = 'Full stack trace here';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockRejectedValueOnce(mockError),
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        end: jest.fn().mockResolvedValue(undefined),
      };

      await expect(fixUserDeletionConstraints(mockPool)).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Stack trace:', 'Full stack trace here');
    });
  });

  describe('integration scenarios', () => {
    it('should process constraints in order', async () => {
      const queryOrder = [];
      const mockClient = {
        query: jest.fn().mockImplementation((sql) => {
          queryOrder.push(sql);
          return Promise.resolve({});
        }),
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        end: jest.fn().mockResolvedValue(undefined),
      };

      await fixUserDeletionConstraints(mockPool);

      expect(queryOrder[0]).toBe('BEGIN');
      expect(queryOrder[queryOrder.length - 1]).toBe('COMMIT');
    });

    it('should not commit if any constraint fails', async () => {
      let commitCalled = false;
      const mockClient = {
        query: jest.fn().mockImplementation((sql) => {
          if (sql === 'COMMIT') {
            commitCalled = true;
          }
          // Fail on the second constraint's first query
          if (sql.includes('patient_notes')) {
            return Promise.reject(new Error('Permission denied'));
          }
          return Promise.resolve({});
        }),
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        end: jest.fn().mockResolvedValue(undefined),
      };

      await expect(fixUserDeletionConstraints(mockPool)).rejects.toThrow();
      expect(commitCalled).toBe(false);
    });
  });

  describe('runMigration', () => {
    let processExitSpy;

    beforeEach(() => {
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    });

    afterEach(() => {
      processExitSpy.mockRestore();
    });

    it('should call process.exit(0) on successful migration', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        end: jest.fn().mockResolvedValue(undefined),
      };

      await runMigration(mockPool);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleSpy).toHaveBeenCalledWith('\n🎉 Migration completed successfully');
    });

    it('should call process.exit(1) on migration failure', async () => {
      const mockError = new Error('Database connection failed');
      const mockPool = {
        connect: jest.fn().mockRejectedValue(mockError),
        end: jest.fn().mockResolvedValue(undefined),
      };

      await runMigration(mockPool);

      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ Migration failed:', mockError);
    });

    it('should log error details when migration fails', async () => {
      const mockError = new Error('Constraint error');
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockRejectedValueOnce(mockError),
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        end: jest.fn().mockResolvedValue(undefined),
      };

      await runMigration(mockPool);

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
