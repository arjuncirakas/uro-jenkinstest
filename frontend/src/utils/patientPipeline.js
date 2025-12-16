/**
 * Determine patient's current stage in the clinical pathway
 * Stages: Referrals → OPD → MDT → Surgery → Discharge
 * 
 * @param {Object} patient - Patient object with pathway and status information
 * @param {Array} appointments - Array of patient appointments
 * @param {Array} mdtMeetings - Array of MDT meetings for patient
 * @returns {Object} - { currentStage: string, stageIndex: number, stages: Array }
 */
/**
 * Determine patient's current stage in the clinical pathway
 * Stages: Referrals → OPD → MDT → Surgery/Medication/Monitoring → Discharge
 * 
 * @param {Object} patient - Patient object with pathway and status information
 * @param {Array} appointments - Array of patient appointments
 * @param {Array} mdtMeetings - Array of MDT meetings for patient
 * @returns {Object} - { currentStage: string, stageIndex: number, stages: Array }
 */
export const getPatientPipelineStage = (patient, appointments = [], mdtMeetings = []) => {
  // Ensure appointments and mdtMeetings are always arrays
  const appointmentsArray = Array.isArray(appointments) ? appointments : [];
  const mdtMeetingsArray = Array.isArray(mdtMeetings) ? mdtMeetings : [];

  const carePathway = patient?.carePathway || patient?.care_pathway || patient?.pathway || '';
  const status = patient?.status || '';
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

  // Define base stages
  const baseStages = [
    { id: 'referral', name: 'Referral', icon: 'referral', color: 'blue' },
    { id: 'opd', name: 'OPD Queue', icon: 'opd', color: 'indigo' },
    { id: 'mdt', name: 'MDT', icon: 'mdt', color: 'purple' },
  ];

  // Determine the treatment stage (4th stage) based on pathway
  let treatmentStage = { id: 'surgery', name: 'Surgery', icon: 'surgery', color: 'orange' };

  if (carePathway === 'Medication') {
    treatmentStage = { id: 'medication', name: 'Medication', icon: 'medication', color: 'orange' };
  } else if (carePathway === 'Active Monitoring' || carePathway === 'Active Surveillance') {
    treatmentStage = { id: 'monitoring', name: 'Active Monitoring', icon: 'monitoring', color: 'teal' };
  }

  const stages = [
    ...baseStages,
    treatmentStage,
    { id: 'discharge', name: 'Discharge', icon: 'discharge', color: 'green' }
  ];

  let currentStage = 'referral';
  let stageIndex = 0;

  // Determine current stage based on care pathway and status
  // Priority order: Discharge > Post-op > Surgery/Medication/Monitoring > MDT > OPD > Referral

  if (status === 'Discharged' || carePathway === 'Discharge') {
    // Discharged patients
    currentStage = 'discharge';
    stageIndex = 4;
  } else if (carePathway === 'Post-op Transfer' || carePathway === 'Post-op Followup') {
    // Post-operative patients - they've completed surgery, show surgery stage
    currentStage = 'surgery';
    stageIndex = 3;
  } else if (carePathway === 'Surgery Pathway' || carePathway === 'Surgical Pathway' || hasSurgeryAppointment) {
    // Patients scheduled for or in surgery pathway
    currentStage = 'surgery';
    stageIndex = 3;
  } else if (carePathway === 'Medication') {
    // Medication pathway
    currentStage = 'medication';
    stageIndex = 3;
  } else if (carePathway === 'Active Monitoring' || carePathway === 'Active Surveillance') {
    // Active Monitoring pathway
    currentStage = 'monitoring';
    stageIndex = 3;
  } else if (carePathway === 'Radiotherapy') {
    // Radiotherapy - treat as treatment stage (using surgery slot for now or could add specific)
    // For now mapping to surgery/treatment slot but keeping MDT logic if needed
    currentStage = 'surgery';
    stageIndex = 3;
  } else if (hasMDTMeeting || hasUpcomingMDT) {
    // Patients with MDT meetings
    currentStage = 'mdt';
    stageIndex = 2;
  } else if (carePathway === 'Investigation Pathway') {
    // Investigation pathway - typically after OPD, could be before or after MDT
    // If they have MDT, show MDT; otherwise show OPD
    if (hasMDTMeeting) {
      currentStage = 'mdt';
      stageIndex = 2;
    } else {
      currentStage = 'opd';
      stageIndex = 1;
    }
  } else if (carePathway === 'OPD Queue' || carePathway === '' || !carePathway) {
    // Patients in OPD queue or no pathway assigned
    currentStage = 'opd';
    stageIndex = 1;
  } else {
    // Default to referral if no clear pathway matches
    currentStage = 'referral';
    stageIndex = 0;
  }

  // Only return stages that have been reached (completed + current)
  // For discharge, we show the full pipeline
  // For others, we show up to the current stage + 1 (next step) if possible, or just current
  // Actually, usually pipelines show the full potential path or at least the path taken.
  // Let's show the full path constructed above.

  return {
    currentStage,
    stageIndex,
    stages: stages.map((stage, index) => {
      // Determine status of each stage
      const isCurrent = index === stageIndex;
      const isCompleted = index < stageIndex;
      const isPending = index > stageIndex;

      return {
        ...stage,
        isActive: isCurrent,
        isCompleted: isCompleted,
        isPending: isPending
      };
    })
  };
};

