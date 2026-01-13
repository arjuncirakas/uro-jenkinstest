import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  getTableClassification,
  setTableClassification,
  getAllClassifications,
  initializeDefaultClassifications,
  CLASSIFICATION_LEVELS
} from '../services/dataClassificationService.js';
import pool from '../config/database.js';

// Mock the database pool
jest.mock('../config/database.js', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn()
  };
  
  return {
    __esModule: true,
    default: {
      connect: jest.fn().mockResolvedValue(mockClient)
    }
  };
});

describe('Data Classification Service', () => {
  let mockClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('CLASSIFICATION_LEVELS', () => {
    it('should have all 5 classification levels defined', () => {
      expect(CLASSIFICATION_LEVELS.LEVEL_1).toBeDefined();
      expect(CLASSIFICATION_LEVELS.LEVEL_2).toBeDefined();
      expect(CLASSIFICATION_LEVELS.LEVEL_3).toBeDefined();
      expect(CLASSIFICATION_LEVELS.LEVEL_4).toBeDefined();
      expect(CLASSIFICATION_LEVELS.LEVEL_5).toBeDefined();
    });
    
    it('should have correct level values', () => {
      expect(CLASSIFICATION_LEVELS.LEVEL_1.level).toBe(1);
      expect(CLASSIFICATION_LEVELS.LEVEL_2.level).toBe(2);
      expect(CLASSIFICATION_LEVELS.LEVEL_3.level).toBe(3);
      expect(CLASSIFICATION_LEVELS.LEVEL_4.level).toBe(4);
      expect(CLASSIFICATION_LEVELS.LEVEL_5.level).toBe(5);
    });
  });
  
  describe('getTableClassification', () => {
    it('should return classification from database if exists', async () => {
      const mockClassification = {
        id: 1,
        table_name: 'patients',
        classification_level: 4,
        classification_label: 'Highly Sensitive',
        description: 'Medical data'
      };
      
      mockClient.query.mockResolvedValueOnce({
        rows: [mockClassification]
      });
      
      const result = await getTableClassification('patients');
      
      expect(mockClient.query).toHaveBeenCalledWith(
        `SELECT * FROM data_classification_metadata WHERE table_name = $1`,
        ['patients']
      );
      expect(result).toEqual(mockClassification);
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('should return default classification if not in database', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('patients');
      
      expect(result.classification_level).toBe(4);
      expect(result.classification_label).toBe('Highly Sensitive');
      expect(result.table_name).toBe('patients');
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('should return default classification on database error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await getTableClassification('patients');
      
      expect(result.classification_level).toBeDefined();
      expect(result.table_name).toBe('patients');
      expect(consoleSpy).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
    
    it('should return Level 5 for patient notes', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('patient_notes');
      
      expect(result.classification_level).toBe(5);
      expect(result.classification_label).toBe('Critical');
    });
    
    it('should return Level 4 for patient table', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('patients');
      
      expect(result.classification_level).toBe(4);
      expect(result.classification_label).toBe('Highly Sensitive');
    });
    
    it('should return Level 3 for appointments', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('appointments');
      
      expect(result.classification_level).toBe(3);
      expect(result.classification_label).toBe('Sensitive');
    });
    
    it('should return Level 2 for users', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('users');
      
      expect(result.classification_level).toBe(2);
      expect(result.classification_label).toBe('Internal');
    });
    
    it('should return Level 1 for audit logs', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('audit_logs');
      
      expect(result.classification_level).toBe(1);
      expect(result.classification_label).toBe('Non-Sensitive');
    });
    
    it('should return Level 3 as default for unknown tables', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('unknown_table');
      
      expect(result.classification_level).toBe(3);
      expect(result.classification_label).toBe('Sensitive');
    });

    it('should handle patient_notes as Level 5', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('patient_notes');
      
      expect(result.classification_level).toBe(5);
      expect(result.classification_label).toBe('Critical');
    });

    it('should handle patient_diagnosis as Level 5', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('patient_diagnosis');
      
      expect(result.classification_level).toBe(5);
      expect(result.classification_label).toBe('Critical');
    });

    it('should handle patient_treatment as Level 5', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('patient_treatment');
      
      expect(result.classification_level).toBe(5);
      expect(result.classification_label).toBe('Critical');
    });

    it('should handle patient_surgery as Level 5', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('patient_surgery');
      
      expect(result.classification_level).toBe(5);
      expect(result.classification_label).toBe('Critical');
    });

    it('should handle investigation_results as Level 4', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('investigation_results');
      
      expect(result.classification_level).toBe(4);
      expect(result.classification_label).toBe('Highly Sensitive');
    });

    it('should handle psa_results as Level 4', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('psa_results');
      
      expect(result.classification_level).toBe(4);
      expect(result.classification_label).toBe('Highly Sensitive');
    });

    it('should handle investigation_bookings as Level 3', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('investigation_bookings');
      
      expect(result.classification_level).toBe(3);
      expect(result.classification_label).toBe('Sensitive');
    });

    it('should handle consent_forms as Level 3', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('consent_forms');
      
      expect(result.classification_level).toBe(3);
      expect(result.classification_label).toBe('Sensitive');
    });

    it('should handle mdt_meetings as Level 3', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('mdt_meetings');
      
      expect(result.classification_level).toBe(3);
      expect(result.classification_label).toBe('Sensitive');
    });

    it('should handle doctors table as Level 2', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('doctors');
      
      expect(result.classification_level).toBe(2);
      expect(result.classification_label).toBe('Internal');
    });

    it('should handle departments table as Level 2', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('departments');
      
      expect(result.classification_level).toBe(2);
      expect(result.classification_label).toBe('Internal');
    });

    it('should handle password_history as Level 1', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('password_history');
      
      expect(result.classification_level).toBe(1);
      expect(result.classification_label).toBe('Non-Sensitive');
    });

    it('should handle otp_verifications as Level 1', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getTableClassification('otp_verifications');
      
      expect(result.classification_level).toBe(1);
      expect(result.classification_label).toBe('Non-Sensitive');
    });
  });
  
  describe('setTableClassification', () => {
    it('should set classification successfully', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await setTableClassification('patients', 4, 'Medical data');
      
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO data_classification_metadata'),
        expect.arrayContaining(['patients', 4, 'Highly Sensitive', 'Medical data'])
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('Level 4');
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('should throw error for invalid level (< 1)', async () => {
      await expect(setTableClassification('patients', 0)).rejects.toThrow('between 1 and 5');
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('should throw error for invalid level (> 5)', async () => {
      await expect(setTableClassification('patients', 6)).rejects.toThrow('between 1 and 5');
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(setTableClassification('patients', 4)).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
    
    it('should update existing classification', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      await setTableClassification('patients', 5, 'Updated description');
      
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.arrayContaining(['patients', 5, 'Critical', 'Updated description'])
      );
    });
  });
  
  describe('getAllClassifications', () => {
    it('should return all classifications', async () => {
      const mockClassifications = [
        { id: 1, table_name: 'patients', classification_level: 4 },
        { id: 2, table_name: 'users', classification_level: 2 }
      ];
      
      mockClient.query.mockResolvedValueOnce({
        rows: mockClassifications
      });
      
      const result = await getAllClassifications();
      
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM data_classification_metadata')
      );
      expect(result).toEqual(mockClassifications);
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(getAllClassifications()).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
    
    it('should return empty array when no classifications exist', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await getAllClassifications();
      
      expect(result).toEqual([]);
    });
  });
  
  describe('initializeDefaultClassifications', () => {
    it('should initialize classifications for all tables', async () => {
      const mockTables = [
        { tablename: 'patients' },
        { tablename: 'users' },
        { tablename: 'appointments' }
      ];
      
      mockClient.query
        .mockResolvedValueOnce({ rows: mockTables }) // Get all tables
        .mockResolvedValue({ rows: [] }); // Insert classifications
      
      const result = await initializeDefaultClassifications();
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('3 tables');
      expect(result.classifications).toHaveLength(3);
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(initializeDefaultClassifications()).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
    
    it('should handle empty table list', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await initializeDefaultClassifications();
      
      expect(result.success).toBe(true);
      expect(result.classifications).toHaveLength(0);
    });
  });
});

