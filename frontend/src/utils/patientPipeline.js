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
  const stages = [
    { id: 'referral', name: 'Referral', icon: 'referral', color: 'blue' },
    { id: 'opd', name: 'OPD Queue', icon: 'opd', color: 'indigo' },
    { id: 'mdt', name: 'MDT', icon: 'mdt', color: 'purple' },
    { id: 'surgery', name: 'Surgery', icon: 'surgery', color: 'orange' },
    { id: 'discharge', name: 'Discharge', icon: 'discharge', color: 'green' }
  ];

  // Ensure appointments and mdtMeetings are always arrays
  const appointmentsArray = Array.isArray(appointments) ? appointments : [];
  const mdtMeetingsArray = Array.isArray(mdtMeetings) ? mdtMeetings : [];

  const carePathway = patient?.carePathway || patient?.care_pathway || '';
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

  let currentStage = 'referral';
  let stageIndex = 0;

  // Determine current stage based on care pathway and status
  // Priority order: Discharge > Post-op > Surgery > Monitoring/Medication > MDT > OPD > Referral

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
  } else if (carePathway === 'Active Monitoring' || carePathway === 'Medication' || carePathway === 'Radiotherapy') {
    // Ongoing care pathways - these come after MDT has been completed
    // Show MDT as completed (not active) to indicate they've progressed past MDT to ongoing care
    // We'll mark MDT as completed in the return logic below
    currentStage = 'mdt';
    stageIndex = 2; // Show up to MDT stage, but mark it as completed (not active)
  } else if (hasMDTMeeting || hasUpcomingMDT || carePathway === 'Active Surveillance') {
    // Patients with MDT meetings or in active surveillance
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
  const reachedStages = stages.slice(0, stageIndex + 1);

  // Special handling for ongoing care pathways (Medication, Active Monitoring, Radiotherapy)
  // These patients have progressed past MDT, so MDT should be shown as completed, not active
  const isOngoingCarePathway = carePathway === 'Active Monitoring' ||
    carePathway === 'Medication' ||
    carePathway === 'Radiotherapy';

  return {
    currentStage,
    stageIndex,
    stages: reachedStages.map((stage, index) => {
      // For ongoing care pathways, mark MDT as completed (not active) if it's the last stage
      const isLastStage = index === reachedStages.length - 1;
      const isMDTStage = stage.id === 'mdt';

      if (isOngoingCarePathway && isLastStage && isMDTStage) {
        // Mark MDT as completed for ongoing care patients (they've progressed past MDT)
        return {
          ...stage,
          isActive: false,
          isCompleted: true,
          isPending: false
        };
      }

      // Default logic: last stage is active, others are completed
      return {
        ...stage,
        isActive: isLastStage,
        isCompleted: !isLastStage,
        isPending: false
      };
    })
  };
};

