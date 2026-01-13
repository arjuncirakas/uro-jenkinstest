/**
 * Tests for notification templates
 * 100% coverage required
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('Notification Templates', () => {
  let notificationTemplates;

  beforeEach(async () => {
    notificationTemplates = await import('../services/notificationTemplates.js');
  });

  describe('renderGDPRSupervisoryTemplate', () => {
    it('should throw error when incident is missing', () => {
      expect(() => {
        notificationTemplates.renderGDPRSupervisoryTemplate(null, { name: 'Test', email: 'test@example.com' });
      }).toThrow('incident and recipient are required');
    });

    it('should throw error when recipient is missing', () => {
      expect(() => {
        notificationTemplates.renderGDPRSupervisoryTemplate({ id: 1 }, null);
      }).toThrow('incident and recipient are required');
    });

    it('should render GDPR template successfully', () => {
      const incident = {
        id: 1,
        incident_type: 'data_breach',
        severity: 'high',
        description: 'Test data breach',
        affected_users: [1, 2, 3],
        affected_data_types: ['PHI', 'PII'],
        detected_at: new Date('2024-01-15T10:00:00Z')
      };

      const recipient = {
        name: 'Supervisory Authority',
        email: 'authority@example.com'
      };

      const result = notificationTemplates.renderGDPRSupervisoryTemplate(incident, recipient);

      expect(result).toBeDefined();
      expect(result.subject).toContain('GDPR');
      expect(result.subject).toContain('Incident #1');
      expect(result.html).toContain('GDPR Data Breach Notification');
      expect(result.html).toContain('Test data breach');
      expect(result.html).toContain('PHI, PII');
      expect(result.html).toContain('3 individual(s)');
    });

    it('should handle missing optional fields', () => {
      const incident = {
        id: 2,
        incident_type: 'security_incident',
        severity: 'medium',
        description: 'Test',
        detected_at: new Date('2024-01-15T10:00:00Z')
      };

      const recipient = {
        name: 'Test Authority',
        email: 'test@example.com'
      };

      const result = notificationTemplates.renderGDPRSupervisoryTemplate(incident, recipient);

      expect(result.html).toContain('Not specified');
      expect(result.html).toContain('0 individual(s)');
    });

    it('should handle null affected_data_types', () => {
      const incident = {
        id: 3,
        incident_type: 'data_breach',
        severity: 'low',
        description: 'Test',
        affected_data_types: null,
        affected_users: null,
        detected_at: new Date()
      };

      const recipient = { name: 'Test', email: 'test@example.com' };

      const result = notificationTemplates.renderGDPRSupervisoryTemplate(incident, recipient);

      expect(result.html).toContain('Not specified');
    });
  });

  describe('renderHIPAAHHSTemplate', () => {
    it('should throw error when incident is missing', () => {
      expect(() => {
        notificationTemplates.renderHIPAAHHSTemplate(null, { name: 'Test', email: 'test@example.com' });
      }).toThrow('incident and recipient are required');
    });

    it('should throw error when recipient is missing', () => {
      expect(() => {
        notificationTemplates.renderHIPAAHHSTemplate({ id: 1 }, null);
      }).toThrow('incident and recipient are required');
    });

    it('should render HIPAA template successfully', () => {
      const incident = {
        id: 1,
        incident_type: 'data_breach',
        severity: 'critical',
        description: 'HIPAA breach description',
        affected_users: [1, 2],
        affected_data_types: ['PHI'],
        detected_at: new Date('2024-01-15T10:00:00Z')
      };

      const recipient = {
        name: 'HHS Office',
        email: 'hhs@example.com'
      };

      const result = notificationTemplates.renderHIPAAHHSTemplate(incident, recipient);

      expect(result).toBeDefined();
      expect(result.subject).toContain('HIPAA');
      expect(result.subject).toContain('Incident #1');
      expect(result.html).toContain('HIPAA Breach Notification');
      expect(result.html).toContain('HIPAA breach description');
      expect(result.html).toContain('PHI');
      expect(result.html).toContain('2 individual(s)');
    });

    it('should handle missing optional fields', () => {
      const incident = {
        id: 2,
        incident_type: 'unauthorized_access',
        severity: 'medium',
        description: 'Test',
        detected_at: new Date()
      };

      const recipient = { name: 'HHS', email: 'hhs@example.com' };

      const result = notificationTemplates.renderHIPAAHHSTemplate(incident, recipient);

      expect(result.html).toContain('Not specified');
      expect(result.html).toContain('0 individual(s)');
    });
  });

  describe('renderIndividualPatientTemplate', () => {
    it('should throw error when incident is missing', () => {
      expect(() => {
        notificationTemplates.renderIndividualPatientTemplate(null, { name: 'Patient', email: 'patient@example.com' });
      }).toThrow('incident and patient are required');
    });

    it('should throw error when patient is missing', () => {
      expect(() => {
        notificationTemplates.renderIndividualPatientTemplate({ id: 1 }, null);
      }).toThrow('incident and patient are required');
    });

    it('should render individual patient template successfully', () => {
      const incident = {
        id: 1,
        incident_type: 'data_breach',
        severity: 'high',
        description: 'Patient data breach occurred',
        affected_data_types: ['PHI', 'medical_records'],
        detected_at: new Date('2024-01-15T10:00:00Z')
      };

      const patient = {
        name: 'John Doe',
        email: 'john.doe@example.com'
      };

      const result = notificationTemplates.renderIndividualPatientTemplate(incident, patient);

      expect(result).toBeDefined();
      expect(result.subject).toContain('Data Security Incident');
      expect(result.html).toContain('Dear John Doe');
      expect(result.html).toContain('Patient data breach occurred');
      expect(result.html).toContain('PHI, medical_records');
    });

    it('should handle missing patient name', () => {
      const incident = {
        id: 2,
        incident_type: 'security_incident',
        severity: 'medium',
        description: 'Test',
        affected_data_types: ['PII'],
        detected_at: new Date()
      };

      const patient = {
        email: 'patient@example.com'
      };

      const result = notificationTemplates.renderIndividualPatientTemplate(incident, patient);

      expect(result.html).toContain('Dear Valued Patient');
    });

    it('should handle missing affected_data_types', () => {
      const incident = {
        id: 3,
        incident_type: 'data_breach',
        severity: 'low',
        description: 'Test',
        affected_data_types: null,
        detected_at: new Date()
      };

      const patient = { name: 'Test Patient', email: 'test@example.com' };

      const result = notificationTemplates.renderIndividualPatientTemplate(incident, patient);

      expect(result.html).toContain('your personal information');
    });
  });
});
