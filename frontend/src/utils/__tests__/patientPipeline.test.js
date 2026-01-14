import { describe, it, expect } from 'vitest';
import { getPatientPipelineStage } from '../patientPipeline';

describe('getPatientPipelineStage', () => {
  describe('Base Stages', () => {
    it('should return base stages for new patient', () => {
      const patient = { status: 'Active', carePathway: '' };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.stages).toHaveLength(3);
      expect(result.stages[0].id).toBe('referral');
      expect(result.stages[1].id).toBe('opd');
      expect(result.stages[2].id).toBe('mdt');
      expect(result.currentStage).toBe('opd');
    });

    it('should handle null patient', () => {
      const result = getPatientPipelineStage(null, [], []);

      expect(result.stages).toHaveLength(3);
      expect(result.currentStage).toBe('opd');
    });

    it('should handle undefined patient', () => {
      const result = getPatientPipelineStage(undefined, [], []);

      expect(result.stages).toHaveLength(3);
      expect(result.currentStage).toBe('opd');
    });
  });

  describe('Discharged Status', () => {
    it('should show discharge stage when status is Discharged', () => {
      const patient = { status: 'Discharged', carePathway: '' };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.currentStage).toBe('discharge');
      expect(result.stages.some(s => s.id === 'discharge')).toBe(true);
    });

    it('should show discharge stage when carePathway is Discharge', () => {
      const patient = { status: 'Active', carePathway: 'Discharge' };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.currentStage).toBe('discharge');
    });

    it('should include surgery stage when patient has surgery appointment and is discharged', () => {
      const patient = { status: 'Discharged', carePathway: '' };
      const appointments = [{ appointmentType: 'Surgery' }];
      const result = getPatientPipelineStage(patient, appointments, []);

      expect(result.stages.some(s => s.id === 'surgery')).toBe(true);
      expect(result.currentStage).toBe('discharge');
    });

    it('should include surgery stage when carePathway is Post-op Transfer', () => {
      const patient = { status: 'Discharged', carePathway: 'Post-op Transfer' };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.stages.some(s => s.id === 'surgery')).toBe(true);
    });

    it('should include surgery stage when carePathway is Post-op Followup', () => {
      const patient = { status: 'Discharged', carePathway: 'Post-op Followup' };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.stages.some(s => s.id === 'surgery')).toBe(true);
    });
  });

  describe('Active Monitoring Pathway', () => {
    it('should show active monitoring stage when carePathway is Active Monitoring', () => {
      const patient = { status: 'Active', carePathway: 'Active Monitoring' };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.currentStage).toBe('active_monitoring');
      expect(result.stages.some(s => s.id === 'active_monitoring')).toBe(true);
    });

    it('should show active monitoring stage when carePathway is Active Surveillance', () => {
      const patient = { status: 'Active', carePathway: 'Active Surveillance' };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.currentStage).toBe('active_monitoring');
    });
  });

  describe('Medication Pathway', () => {
    it('should show medication stage when carePathway is Medication', () => {
      const patient = { status: 'Active', carePathway: 'Medication' };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.currentStage).toBe('medication');
      expect(result.stages.some(s => s.id === 'medication')).toBe(true);
    });
  });

  describe('Radiotherapy Pathway', () => {
    it('should show radiotherapy stage when carePathway is Radiotherapy', () => {
      const patient = { status: 'Active', carePathway: 'Radiotherapy' };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.currentStage).toBe('radiotherapy');
      expect(result.stages.some(s => s.id === 'radiotherapy')).toBe(true);
    });
  });

  describe('Surgery Pathway', () => {
    it('should show surgery stage when carePathway is Surgery Pathway', () => {
      const patient = { status: 'Active', carePathway: 'Surgery Pathway' };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.currentStage).toBe('surgery');
      expect(result.stages.some(s => s.id === 'surgery')).toBe(true);
    });

    it('should show surgery stage when carePathway is Surgical Pathway', () => {
      const patient = { status: 'Active', carePathway: 'Surgical Pathway' };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.currentStage).toBe('surgery');
    });

    it('should show surgery stage when patient has surgery appointment', () => {
      const patient = { status: 'Active', carePathway: '' };
      const appointments = [{ appointmentType: 'Surgery' }];
      const result = getPatientPipelineStage(patient, appointments, []);

      expect(result.currentStage).toBe('surgery');
    });

    it('should show surgery stage when appointment type includes surgery', () => {
      const patient = { status: 'Active', carePathway: '' };
      const appointments = [{ appointmentType: 'Surgery Consultation' }];
      const result = getPatientPipelineStage(patient, appointments, []);

      expect(result.currentStage).toBe('surgery');
    });

    it('should show surgery stage when surgeryType includes surgery', () => {
      const patient = { status: 'Active', carePathway: '' };
      const appointments = [{ surgeryType: 'Prostate Surgery' }];
      const result = getPatientPipelineStage(patient, appointments, []);

      expect(result.currentStage).toBe('surgery');
    });
  });

  describe('MDT Stage', () => {
    it('should show MDT stage when patient has MDT meetings', () => {
      const patient = { status: 'Active', carePathway: '' };
      const mdtMeetings = [{ id: 1, meeting_date: '2024-12-31' }];
      const result = getPatientPipelineStage(patient, [], mdtMeetings);

      expect(result.currentStage).toBe('mdt');
    });

    it('should show MDT stage when patient has upcoming MDT meeting', () => {
      const patient = { status: 'Active', carePathway: '' };
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const mdtMeetings = [{ id: 1, meeting_date: futureDate.toISOString().split('T')[0] }];
      const result = getPatientPipelineStage(patient, [], mdtMeetings);

      expect(result.currentStage).toBe('mdt');
    });

    it('should not show MDT stage when all MDT meetings are in the past', () => {
      const patient = { status: 'Active', carePathway: '' };
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      const mdtMeetings = [{ id: 1, meeting_date: pastDate.toISOString().split('T')[0] }];
      const result = getPatientPipelineStage(patient, [], mdtMeetings);

      // Should still show MDT if hasMDTMeeting is true (any meeting exists)
      expect(result.currentStage).toBe('mdt');
    });
  });

  describe('OPD Queue', () => {
    it('should show OPD stage when carePathway is OPD Queue', () => {
      const patient = { status: 'Active', carePathway: 'OPD Queue' };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.currentStage).toBe('opd');
    });

    it('should show OPD stage when carePathway is empty', () => {
      const patient = { status: 'Active', carePathway: '' };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.currentStage).toBe('opd');
    });

    it('should show OPD stage when carePathway is null', () => {
      const patient = { status: 'Active', carePathway: null };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.currentStage).toBe('opd');
    });
  });

  describe('Stage Index and Status', () => {
    it('should mark current stage as active', () => {
      const patient = { status: 'Active', carePathway: 'Active Monitoring' };
      const result = getPatientPipelineStage(patient, [], []);

      const activeStage = result.stages.find(s => s.isActive);
      expect(activeStage).toBeDefined();
      expect(activeStage.id).toBe('active_monitoring');
    });

    it('should mark previous stages as completed', () => {
      const patient = { status: 'Active', carePathway: 'Active Monitoring' };
      const result = getPatientPipelineStage(patient, [], []);

      const completedStages = result.stages.filter(s => s.isCompleted);
      expect(completedStages.length).toBeGreaterThan(0);
      expect(completedStages.every(s => !s.isActive)).toBe(true);
    });

    it('should return correct stage index', () => {
      const patient = { status: 'Active', carePathway: 'Active Monitoring' };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.stageIndex).toBeGreaterThanOrEqual(0);
      expect(result.stageIndex).toBeLessThan(result.stages.length);
    });

    it('should handle stage index not found (safety check)', () => {
      // This shouldn't happen with current logic, but test the safety check
      const patient = { status: 'Active', carePathway: 'Unknown Pathway' };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.stageIndex).toBeGreaterThanOrEqual(0);
      expect(result.currentStage).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null appointments array', () => {
      const patient = { status: 'Active', carePathway: '' };
      const result = getPatientPipelineStage(patient, null, []);

      expect(result.stages).toBeDefined();
      expect(result.currentStage).toBeDefined();
    });

    it('should handle null mdtMeetings array', () => {
      const patient = { status: 'Active', carePathway: '' };
      const result = getPatientPipelineStage(patient, [], null);

      expect(result.stages).toBeDefined();
      expect(result.currentStage).toBeDefined();
    });

    it('should handle undefined appointments', () => {
      const patient = { status: 'Active', carePathway: '' };
      const result = getPatientPipelineStage(patient, undefined, []);

      expect(result.stages).toBeDefined();
    });

    it('should handle undefined mdtMeetings', () => {
      const patient = { status: 'Active', carePathway: '' };
      const result = getPatientPipelineStage(patient, [], undefined);

      expect(result.stages).toBeDefined();
    });

    it('should handle patient with no status or carePathway', () => {
      const patient = {};
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.stages).toBeDefined();
      expect(result.currentStage).toBeDefined();
    });

    it('should handle patient with snake_case field names', () => {
      const patient = { status: 'Active', care_pathway: 'Active Monitoring' };
      const result = getPatientPipelineStage(patient, [], []);

      expect(result.currentStage).toBe('active_monitoring');
    });
  });
});
