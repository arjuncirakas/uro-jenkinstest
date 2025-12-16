/**
 * Determine patient's current stage in the clinical pathway
 * Stages: Referrals → OPD → MDT → Surgery → Discharge
 * 
 * @param {Object} patient - Patient object with pathway and status information
 * @param {Array} appointments - Array of patient appointments
 * @param {Array} mdtMeetings - Array of MDT meetings for patient
 * @returns {Object} - { currentStage: string, stageIndex: number, stages: Array }
 */
export const getPatientPipelineStage = (patient, appointments = [], mdtMeetings = []) => {
  // Base stages that everyone goes through
  const baseStages = [
    { id: 'referral', name: 'Referral', icon: 'referral', color: 'blue' },
    { id: 'opd', name: 'OPD Queue', icon: 'opd', color: 'indigo' },
    { id: 'mdt', name: 'MDT', icon: 'mdt', color: 'purple' }
  ];

  const carePathway = patient?.carePathway || patient?.care_pathway || '';
  const status = patient?.status || '';

  // Ensure appointments and mdtMeetings are always arrays
  const appointmentsArray = Array.isArray(appointments) ? appointments : [];
  const mdtMeetingsArray = Array.isArray(mdtMeetings) ? mdtMeetings : [];

  const hasSurgeryAppointment = appointmentsArray.some(apt => {
    const aptType = (apt.appointmentType || apt.type || apt.appointment_type || '').toLowerCase();
    const surgeryType = (apt.surgeryType || apt.surgery_type || '').toLowerCase();
    return aptType === 'surgery' || aptType.includes('surgery') || surgeryType.includes('surgery');
  });

  const hasMDTMeeting = mdtMeetingsArray.length > 0;
  const hasUpcomingMDT = mdtMeetingsArray.some(mdt => {
    const meetingDate = new Date(mdt.meetingDate || mdt.meeting_date);
    return meetingDate >= new Date();
  });

  let finalStages = [...baseStages];
  let currentStageId = 'referral';

  // Logic to determine path and append stages
  if (status === 'Discharged' || carePathway === 'Discharge') {
    // If discharged, we check if they had surgery to include that stage
    if (hasSurgeryAppointment || carePathway === 'Post-op Transfer' || carePathway === 'Post-op Followup') {
      finalStages.push({ id: 'surgery', name: 'Surgery', icon: 'surgery', color: 'orange' });
    }
    finalStages.push({ id: 'discharge', name: 'Discharge', icon: 'discharge', color: 'green' });
    currentStageId = 'discharge';
  } else if (carePathway === 'Active Monitoring' || carePathway === 'Active Surveillance') {
    finalStages.push({ id: 'active_monitoring', name: 'Active Monitoring', icon: 'monitoring', color: 'teal' });
    currentStageId = 'active_monitoring';
  } else if (carePathway === 'Medication') {
    finalStages.push({ id: 'medication', name: 'Medication', icon: 'medication', color: 'teal' });
    currentStageId = 'medication';
  } else if (carePathway === 'Radiotherapy') {
    finalStages.push({ id: 'radiotherapy', name: 'Radiotherapy', icon: 'medical', color: 'teal' });
    currentStageId = 'radiotherapy';
  } else if (carePathway === 'Surgery Pathway' || carePathway === 'Surgical Pathway' || hasSurgeryAppointment || carePathway === 'Post-op Transfer' || carePathway === 'Post-op Followup') {
    finalStages.push({ id: 'surgery', name: 'Surgery', icon: 'surgery', color: 'orange' });
    currentStageId = 'surgery';
  } else if (hasMDTMeeting || hasUpcomingMDT) {
    currentStageId = 'mdt';
  } else if (carePathway === 'OPD Queue' || !carePathway) {
    currentStageId = 'opd';
  } else {
    // Default fallback
    currentStageId = 'referral';
  }

  // Find the index of the current stage
  let stageIndex = finalStages.findIndex(s => s.id === currentStageId);

  // Safety check: if currentStageId is not found (shouldn't happen with logic above, but good to be safe)
  if (stageIndex === -1) {
    stageIndex = 0;
    currentStageId = 'referral';
  }

  // Return stages up to the current one (reached stages)
  const reachedStages = finalStages.slice(0, stageIndex + 1);

  return {
    currentStage: currentStageId,
    stageIndex,
    stages: reachedStages.map((stage, index) => ({
      ...stage,
      isActive: index === reachedStages.length - 1,
      isCompleted: index < reachedStages.length - 1,
      isPending: false
    }))
  };
};

