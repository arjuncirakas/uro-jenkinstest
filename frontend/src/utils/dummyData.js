// Dummy data for the application

export const patientsData = [
  {
    id: 1,
    name: 'Ethan Carter',
    patientId: '123456',
    mrn: '789012',
    age: 62,
    gender: 'Male',
    phone: '(555) 123-4567',
    email: 'ethan.carter@example.com',
    pathwayStatus: 'Active',
    statusColor: 'teal',
    priority: 'High',
    priorityColor: 'red',
    lastInteraction: '2024-03-15 10:30 AM',
    lastAppointment: '2024-09-10',
    category: 'surgery-pathway',
    urologistId: 1,
    pathway: {
      type: 'Surgical',
      status: 'On Track',
      nextAction: 'Follow-up PSA due 2024-10-15',
    },
    vitals: {
      latestPSA: '4.5 ng/mL',
      psaDate: '2024-07-15',
      prostateVolume: '45 mL',
      volumeDate: '2024-08-05',
    },
    recentNotes: [
      {
        title: 'Post-Op Check',
        date: '2024-09-10',
        content: 'Patient recovering well from the procedure. Vitals are stable. Minimal pain reported. Incision site clean and dry.'
      },
      {
        title: 'Follow-up appointment',
        date: '2024-08-15',
        content: 'Discussed PSA results. Patient remains asymptomatic. Continue active monitoring.'
      },
      {
        title: 'Initial Consultation',
        date: '2024-07-20',
        content: 'Patient presented with urinary symptoms. Examination and initial PSA ordered.'
      }
    ],
    tasks: [
      { id: 1, text: 'Review latest blood results', completed: false },
      { id: 2, text: "Follow up on patient's call regarding medication side effects", completed: false },
      { id: 3, text: 'Prepare referral letter to Dr. Smith', completed: true }
    ]
  },
  {
    id: 2,
    name: 'Olivia Bennett',
    patientId: '654321',
    mrn: '210987',
    age: 58,
    gender: 'Female',
    phone: '(555) 234-5678',
    email: 'olivia.bennett@example.com',
    pathwayStatus: 'Completed',
    statusColor: 'gray',
    priority: 'Low',
    priorityColor: 'green',
    lastInteraction: '2024-03-14 02:45 PM',
    lastAppointment: '2024-09-05',
    category: 'post-op-followup',
    urologistId: 1,
    pathway: {
      type: 'Postop Followup',
      status: 'Completed',
      nextAction: 'Annual check-up scheduled for 2025-01-15',
    },
    vitals: {
      latestPSA: '2.1 ng/mL',
      psaDate: '2024-08-20',
      prostateVolume: '-',
      volumeDate: '-',
    },
    recentNotes: [
      {
        title: 'Treatment Completion',
        date: '2024-09-05',
        content: 'Successfully completed treatment protocol. Patient showing excellent recovery. All post-treatment markers within normal range.'
      },
      {
        title: 'Mid-Treatment Review',
        date: '2024-07-10',
        content: 'Patient tolerating treatment well. Minor side effects managed effectively with medication adjustments.'
      },
      {
        title: 'Treatment Initiation',
        date: '2024-06-01',
        content: 'Started treatment protocol. Discussed potential side effects and management strategies with patient and family.'
      }
    ],
    tasks: [
      { id: 1, text: 'Send discharge summary to GP', completed: true },
      { id: 2, text: 'Schedule annual follow-up', completed: false }
    ]
  },
  {
    id: 3,
    name: 'Noah Parker',
    patientId: '987654',
    mrn: '456789',
    age: 55,
    gender: 'Male',
    phone: '(555) 345-6789',
    email: 'noah.parker@example.com',
    pathwayStatus: 'Pending',
    statusColor: 'yellow',
    priority: 'Urgent',
    priorityColor: 'purple',
    lastInteraction: '2024-03-13 09:15 AM',
    lastAppointment: '2024-08-25',
    category: 'new',
    urologistId: 1,
    pathway: {
      type: 'Investigation',
      status: 'Awaiting Results',
      nextAction: 'Biopsy results expected by 2024-10-20',
    },
    vitals: {
      latestPSA: '6.8 ng/mL',
      psaDate: '2024-08-01',
      prostateVolume: '52 mL',
      volumeDate: '2024-08-10',
    },
    recentNotes: [
      {
        title: 'Biopsy Procedure',
        date: '2024-08-25',
        content: 'Transrectal ultrasound-guided biopsy performed. 12 core samples taken. Procedure tolerated well. Patient advised on post-procedure care.'
      },
      {
        title: 'Pre-Biopsy Consultation',
        date: '2024-08-18',
        content: 'Discussed elevated PSA findings. Explained biopsy procedure, risks, and benefits. Patient consented to procedure.'
      },
      {
        title: 'Referral from GP',
        date: '2024-07-28',
        content: 'New referral. Elevated PSA detected in routine screening. Patient reports mild LUTS. No family history of prostate cancer.'
      }
    ],
    tasks: [
      { id: 1, text: 'Chase pathology for biopsy results', completed: false },
      { id: 2, text: 'Schedule results discussion appointment', completed: false },
      { id: 3, text: 'Prepare management plan based on results', completed: false }
    ]
  },
  {
    id: 4,
    name: 'Ava Reynolds',
    patientId: '456123',
    mrn: '321654',
    age: 67,
    gender: 'Female',
    phone: '(555) 456-7890',
    email: 'ava.reynolds@example.com',
    pathwayStatus: 'Active',
    statusColor: 'teal',
    priority: 'Medium',
    priorityColor: 'yellow',
    lastInteraction: '2024-03-12 04:00 PM',
    lastAppointment: '2024-09-08',
    category: 'new',
    urologistId: 1,
    pathway: {
      type: 'Investigation',
      status: 'Active',
      nextAction: 'Cystoscopy scheduled for 2024-11-01',
    },
    vitals: {
      latestPSA: '-',
      psaDate: '-',
      prostateVolume: '-',
      volumeDate: '-',
    },
    recentNotes: [
      {
        title: '3-Month Cystoscopy',
        date: '2024-09-08',
        content: 'Surveillance cystoscopy performed. No evidence of recurrence. Bladder mucosa appears healthy. Continue surveillance protocol.'
      },
      {
        title: 'Post-TURBT Follow-up',
        date: '2024-06-15',
        content: 'Patient recovering well from TURBT. Pathology confirmed Ta low-grade urothelial carcinoma. Commenced on surveillance protocol.'
      },
      {
        title: 'TURBT Procedure',
        date: '2024-05-20',
        content: 'Transurethral resection of bladder tumor performed. Single lesion resected from lateral wall. Hemostasis achieved.'
      }
    ],
    tasks: [
      { id: 1, text: 'Book next surveillance cystoscopy', completed: true },
      { id: 2, text: 'Send surveillance schedule to patient', completed: false },
      { id: 3, text: 'Update patient on latest findings', completed: true }
    ]
  },
  {
    id: 5,
    name: 'Liam Foster',
    patientId: '321987',
    mrn: '654789',
    age: 71,
    gender: 'Male',
    phone: '(555) 567-8901',
    email: 'liam.foster@example.com',
    pathwayStatus: 'Completed',
    statusColor: 'gray',
    priority: 'Medium',
    priorityColor: 'yellow',
    lastInteraction: '2024-03-11 11:20 AM',
    lastAppointment: '2024-08-30',
    category: 'post-op-followup',
    urologistId: 1,
    pathway: {
      type: 'Postop Followup',
      status: 'Discharged',
      nextAction: '6-month post-op review scheduled for 2025-02-28',
    },
    vitals: {
      latestPSA: '0.1 ng/mL',
      psaDate: '2024-08-25',
      prostateVolume: '-',
      volumeDate: '-',
    },
    recentNotes: [
      {
        title: 'Final Post-Op Check',
        date: '2024-08-30',
        content: 'Excellent recovery from radical prostatectomy. PSA undetectable. Continence improving. Patient very satisfied with outcome.'
      },
      {
        title: '6-Week Post-Op',
        date: '2024-07-18',
        content: 'Wound healing well. Some stress incontinence, improving with pelvic floor exercises. PSA <0.1. Pathology: pT2c, clear margins.'
      },
      {
        title: 'Radical Prostatectomy',
        date: '2024-06-05',
        content: 'Robot-assisted laparoscopic radical prostatectomy performed successfully. Nerve-sparing technique attempted bilaterally. No intraoperative complications.'
      }
    ],
    tasks: [
      { id: 1, text: 'Send final discharge summary', completed: true },
      { id: 2, text: 'Book 6-month follow-up', completed: true }
    ]
  },
  {
    id: 6,
    name: 'Sophia Martinez',
    patientId: '789123',
    mrn: '987654',
    age: 45,
    gender: 'Female',
    phone: '(555) 678-9012',
    email: 'sophia.martinez@example.com',
    pathwayStatus: 'Active',
    statusColor: 'teal',
    priority: 'Medium',
    priorityColor: 'yellow',
    lastInteraction: '2024-03-10 03:30 PM',
    lastAppointment: '2024-09-12',
    category: 'new',
    urologistId: 2,
    pathway: {
      type: 'Investigation',
      status: 'Active',
      nextAction: 'Cystoscopy scheduled for 2024-11-15',
    },
    vitals: {
      latestPSA: '-',
      psaDate: '-',
      prostateVolume: '-',
      volumeDate: '-',
    },
    recentNotes: [
      {
        title: 'Initial Consultation',
        date: '2024-09-12',
        content: 'New patient with hematuria. Urine cytology and cystoscopy ordered.'
      }
    ],
    tasks: [
      { id: 1, text: 'Schedule cystoscopy', completed: false },
      { id: 2, text: 'Review urine cytology results', completed: false }
    ]
  },
  {
    id: 7,
    name: 'James Wilson',
    patientId: '456789',
    mrn: '123456',
    age: 68,
    gender: 'Male',
    phone: '(555) 789-0123',
    email: 'james.wilson@example.com',
    pathwayStatus: 'Active',
    statusColor: 'teal',
    priority: 'High',
    priorityColor: 'red',
    lastInteraction: '2024-03-09 11:45 AM',
    lastAppointment: '2024-09-14',
    category: 'surgery-pathway',
    urologistId: 2,
    pathway: {
      type: 'Surgical',
      status: 'On Track',
      nextAction: 'Pre-operative assessment due 2024-10-20',
    },
    vitals: {
      latestPSA: '8.2 ng/mL',
      psaDate: '2024-08-30',
      prostateVolume: '65 mL',
      volumeDate: '2024-09-05',
    },
    recentNotes: [
      {
        title: 'Surgical Planning',
        date: '2024-09-14',
        content: 'Discussed radical prostatectomy options. Patient opted for robotic approach. Pre-op assessment scheduled.'
      }
    ],
    tasks: [
      { id: 1, text: 'Complete pre-operative assessment', completed: false },
      { id: 2, text: 'Schedule surgery date', completed: false }
    ]
  },
  {
    id: 8,
    name: 'Emma Thompson',
    patientId: '321654',
    mrn: '456123',
    age: 52,
    gender: 'Female',
    phone: '(555) 890-1234',
    email: 'emma.thompson@example.com',
    pathwayStatus: 'Completed',
    statusColor: 'gray',
    priority: 'Low',
    priorityColor: 'green',
    lastInteraction: '2024-03-08 02:15 PM',
    lastAppointment: '2024-09-16',
    category: 'post-op-followup',
    urologistId: 1,
    pathway: {
      type: 'Postop Followup',
      status: 'Completed',
      nextAction: 'Annual follow-up scheduled for 2025-03-16',
    },
    vitals: {
      latestPSA: '-',
      psaDate: '-',
      prostateVolume: '-',
      volumeDate: '-',
    },
    recentNotes: [
      {
        title: 'Final Follow-up',
        date: '2024-09-16',
        content: 'Excellent recovery from TURBT. No recurrence detected. Discharged to annual follow-up.'
      }
    ],
    tasks: [
      { id: 1, text: 'Send discharge summary to GP', completed: true },
      { id: 2, text: 'Schedule annual follow-up', completed: true }
    ]
  }
];

// Helper function to get patient by ID
export const getPatientById = (id) => {
  return patientsData.find(patient => patient.id === id);
};

// Helper function to get all patients
export const getAllPatients = () => {
  return patientsData;
};

// Helper function to get patients by category
export const getPatientsByCategory = (category) => {
  if (!category || category === 'all') {
    return patientsData;
  }
  return patientsData.filter(patient => patient.category === category);
};

// Dummy appointment data
export const appointmentsData = [
  {
    id: 1,
    patientId: 1,
    patientName: 'Ethan Carter',
    date: '2025-10-11',
    time: '09:00',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 30,
    status: 'confirmed',
    notes: 'Follow-up PSA review',
    phone: '(555) 123-4567',
    email: 'ethan.carter@example.com',
    urologistId: 1
  },
  {
    id: 2,
    patientId: 1,
    patientName: 'Ethan Carter',
    date: '2025-10-11',
    time: '10:30',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 30,
    status: 'confirmed',
    notes: 'Consultation for treatment options',
    phone: '(555) 123-4567',
    email: 'ethan.carter@example.com',
    urologistId: 1
  },
  {
    id: 3,
    patientId: 2,
    patientName: 'Olivia Bennett',
    date: '2025-10-18',
    time: '09:00',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 45,
    status: 'confirmed',
    notes: 'Annual check-up',
    phone: '(555) 234-5678',
    email: 'olivia.bennett@example.com',
    urologistId: 1
  },
  {
    id: 4,
    patientId: 3,
    patientName: 'Noah Parker',
    date: '2025-10-18',
    time: '10:30',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 60,
    status: 'confirmed',
    notes: 'Biopsy results discussion',
    phone: '(555) 345-6789',
    email: 'noah.parker@example.com'
  },
  {
    id: 5,
    patientId: 4,
    patientName: 'Ava Reynolds',
    date: '2025-10-18',
    time: '14:00',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 30,
    status: 'confirmed',
    notes: 'Cystoscopy procedure',
    phone: '(555) 456-7890',
    email: 'ava.reynolds@example.com'
  },
  {
    id: 6,
    patientId: 5,
    patientName: 'Liam Foster',
    date: '2025-10-18',
    time: '15:30',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 30,
    status: 'confirmed',
    notes: 'Post-surgical follow-up',
    phone: '(555) 567-8901',
    email: 'liam.foster@example.com',
    urologistId: 1
  },
  {
    id: 7,
    patientId: 1,
    patientName: 'Ethan Carter',
    date: '2025-10-25',
    time: '09:30',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 45,
    status: 'pending',
    notes: 'PSA blood test',
    phone: '(555) 123-4567',
    email: 'ethan.carter@example.com'
  },
  {
    id: 8,
    patientId: 2,
    patientName: 'Olivia Bennett',
    date: '2025-10-25',
    time: '11:00',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 30,
    status: 'confirmed',
    notes: 'Treatment review',
    phone: '(555) 234-5678',
    email: 'olivia.bennett@example.com',
    urologistId: 1
  },
  {
    id: 9,
    patientId: 3,
    patientName: 'Noah Parker',
    date: '2025-10-28',
    time: '14:30',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 45,
    status: 'confirmed',
    notes: 'Treatment planning consultation',
    phone: '(555) 345-6789',
    email: 'noah.parker@example.com',
    urologistId: 1
  },
  {
    id: 10,
    patientId: 4,
    patientName: 'Ava Reynolds',
    date: '2025-10-30',
    time: '10:00',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 60,
    status: 'pending',
    notes: 'Surveillance cystoscopy',
    phone: '(555) 456-7890',
    email: 'ava.reynolds@example.com'
  },
  {
    id: 11,
    patientId: 5,
    patientName: 'Liam Foster',
    date: '2025-11-01',
    time: '09:00',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 30,
    status: 'confirmed',
    notes: '6-month follow-up',
    phone: '(555) 567-8901',
    email: 'liam.foster@example.com',
    urologistId: 1
  },
  {
    id: 12,
    patientId: 1,
    patientName: 'Ethan Carter',
    date: '2025-11-05',
    time: '15:00',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 30,
    status: 'confirmed',
    notes: 'Active monitoring review',
    phone: '(555) 123-4567',
    email: 'ethan.carter@example.com',
    urologistId: 1
  },
  {
    id: 13,
    patientId: 2,
    patientName: 'Olivia Bennett',
    date: '2025-10-03',
    time: '14:00',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 45,
    status: 'confirmed',
    notes: 'Follow-up cystoscopy',
    phone: '(555) 234-5678',
    email: 'olivia.bennett@example.com'
  },
  {
    id: 14,
    patientId: 3,
    patientName: 'Noah Parker',
    date: '2025-10-07',
    time: '10:00',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 30,
    status: 'confirmed',
    notes: 'Treatment consultation',
    phone: '(555) 345-6789',
    email: 'noah.parker@example.com',
    urologistId: 1
  },
  {
    id: 15,
    patientId: 4,
    patientName: 'Ava Reynolds',
    date: '2025-10-12',
    time: '11:30',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 30,
    status: 'confirmed',
    notes: 'Post-procedure check',
    phone: '(555) 456-7890',
    email: 'ava.reynolds@example.com',
    urologistId: 1
  },
  {
    id: 16,
    patientId: 5,
    patientName: 'Liam Foster',
    date: '2025-10-15',
    time: '09:30',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 60,
    status: 'confirmed',
    notes: 'PSA monitoring',
    phone: '(555) 567-8901',
    email: 'liam.foster@example.com'
  },
  {
    id: 17,
    patientId: 1,
    patientName: 'Ethan Carter',
    date: '2025-10-22',
    time: '13:00',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 45,
    status: 'confirmed',
    notes: 'Treatment review',
    phone: '(555) 123-4567',
    email: 'ethan.carter@example.com',
    urologistId: 1
  },
  {
    id: 18,
    patientId: 2,
    patientName: 'Olivia Bennett',
    date: '2025-10-29',
    time: '16:00',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 30,
    status: 'confirmed',
    notes: 'Surveillance appointment',
    phone: '(555) 234-5678',
    email: 'olivia.bennett@example.com'
  },
  {
    id: 19,
    patientId: 3,
    patientName: 'Noah Parker',
    date: '2025-10-01',
    time: '08:30',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 30,
    status: 'confirmed',
    notes: 'Initial consultation',
    phone: '(555) 345-6789',
    email: 'noah.parker@example.com',
    urologistId: 1
  },
  {
    id: 20,
    patientId: 4,
    patientName: 'Ava Reynolds',
    date: '2025-10-02',
    time: '15:30',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 45,
    status: 'confirmed',
    notes: 'Diagnostic imaging',
    phone: '(555) 456-7890',
    email: 'ava.reynolds@example.com'
  },
  {
    id: 21,
    patientId: 5,
    patientName: 'Liam Foster',
    date: '2025-10-04',
    time: '11:00',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 30,
    status: 'confirmed',
    notes: 'Follow-up consultation',
    phone: '(555) 567-8901',
    email: 'liam.foster@example.com',
    urologistId: 1
  },
  {
    id: 22,
    patientId: 1,
    patientName: 'Ethan Carter',
    date: '2025-10-05',
    time: '14:15',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 60,
    status: 'confirmed',
    notes: 'Biopsy procedure',
    phone: '(555) 123-4567',
    email: 'ethan.carter@example.com'
  },
  {
    id: 23,
    patientId: 2,
    patientName: 'Olivia Bennett',
    date: '2025-10-08',
    time: '09:45',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 45,
    status: 'confirmed',
    notes: 'Treatment planning',
    phone: '(555) 234-5678',
    email: 'olivia.bennett@example.com',
    urologistId: 1
  },
  {
    id: 24,
    patientId: 3,
    patientName: 'Noah Parker',
    date: '2025-10-09',
    time: '13:30',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 30,
    status: 'confirmed',
    notes: 'Lab results review',
    phone: '(555) 345-6789',
    email: 'noah.parker@example.com'
  },
  {
    id: 25,
    patientId: 4,
    patientName: 'Ava Reynolds',
    date: '2025-10-14',
    time: '10:15',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 30,
    status: 'confirmed',
    notes: 'Post-treatment check',
    phone: '(555) 456-7890',
    email: 'ava.reynolds@example.com',
    urologistId: 1
  },
  {
    id: 26,
    patientId: 5,
    patientName: 'Liam Foster',
    date: '2025-10-16',
    time: '16:45',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 45,
    status: 'confirmed',
    notes: 'Monitoring scan',
    phone: '(555) 567-8901',
    email: 'liam.foster@example.com'
  },
  {
    id: 27,
    patientId: 1,
    patientName: 'Ethan Carter',
    date: '2025-10-19',
    time: '08:00',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 30,
    status: 'confirmed',
    notes: 'Early morning consultation',
    phone: '(555) 123-4567',
    email: 'ethan.carter@example.com',
    urologistId: 1
  },
  {
    id: 28,
    patientId: 2,
    patientName: 'Olivia Bennett',
    date: '2025-10-21',
    time: '12:30',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 60,
    status: 'confirmed',
    notes: 'Comprehensive evaluation',
    phone: '(555) 234-5678',
    email: 'olivia.bennett@example.com'
  },
  {
    id: 29,
    patientId: 3,
    patientName: 'Noah Parker',
    date: '2025-10-23',
    time: '15:00',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 45,
    status: 'confirmed',
    notes: 'Treatment discussion',
    phone: '(555) 345-6789',
    email: 'noah.parker@example.com',
    urologistId: 1
  },
  {
    id: 30,
    patientId: 4,
    patientName: 'Ava Reynolds',
    date: '2025-10-24',
    time: '11:45',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 30,
    status: 'confirmed',
    notes: 'Follow-up procedure',
    phone: '(555) 456-7890',
    email: 'ava.reynolds@example.com'
  },
  {
    id: 31,
    patientId: 5,
    patientName: 'Liam Foster',
    date: '2025-10-26',
    time: '09:15',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 30,
    status: 'confirmed',
    notes: 'Recovery assessment',
    phone: '(555) 567-8901',
    email: 'liam.foster@example.com',
    urologistId: 1
  },
  {
    id: 32,
    patientId: 1,
    patientName: 'Ethan Carter',
    date: '2025-10-27',
    time: '14:30',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 45,
    status: 'confirmed',
    notes: 'Diagnostic review',
    phone: '(555) 123-4567',
    email: 'ethan.carter@example.com'
  },
  {
    id: 33,
    patientId: 2,
    patientName: 'Olivia Bennett',
    date: '2025-10-31',
    time: '10:30',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 30,
    status: 'confirmed',
    notes: 'Monthly check-up',
    phone: '(555) 234-5678',
    email: 'olivia.bennett@example.com',
    urologistId: 1
  },
  {
    id: 34,
    patientId: 6,
    patientName: 'Sophia Martinez',
    date: '2025-10-13',
    time: '14:30',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 45,
    status: 'confirmed',
    notes: 'Cystoscopy procedure',
    phone: '(555) 678-9012',
    email: 'sophia.martinez@example.com'
  },
  {
    id: 35,
    patientId: 6,
    patientName: 'Sophia Martinez',
    date: '2025-10-20',
    time: '10:00',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 30,
    status: 'confirmed',
    notes: 'Follow-up consultation',
    phone: '(555) 678-9012',
    email: 'sophia.martinez@example.com',
    urologistId: 2
  },
  {
    id: 36,
    patientId: 7,
    patientName: 'James Wilson',
    date: '2025-10-17',
    time: '09:30',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 45,
    status: 'confirmed',
    notes: 'Pre-operative consultation',
    phone: '(555) 789-0123',
    email: 'james.wilson@example.com',
    urologistId: 2
  },
  {
    id: 37,
    patientId: 7,
    patientName: 'James Wilson',
    date: '2025-10-24',
    time: '11:15',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 60,
    status: 'confirmed',
    notes: 'Pre-operative assessment',
    phone: '(555) 789-0123',
    email: 'james.wilson@example.com'
  },
  {
    id: 38,
    patientId: 8,
    patientName: 'Emma Thompson',
    date: '2025-10-06',
    time: '15:45',
    type: 'Urologist',
    typeColor: 'teal',
    duration: 30,
    status: 'confirmed',
    notes: 'Annual follow-up',
    phone: '(555) 890-1234',
    email: 'emma.thompson@example.com',
    urologistId: 1
  },
  {
    id: 39,
    patientId: 8,
    patientName: 'Emma Thompson',
    date: '2025-10-13',
    time: '16:30',
    type: 'Investigation',
    typeColor: 'purple',
    duration: 30,
    status: 'confirmed',
    notes: 'Surveillance cystoscopy',
    phone: '(555) 890-1234',
    email: 'emma.thompson@example.com'
  },
  // Missed appointments (past dates with no-show status)
  {
    id: 40,
    patientId: 1,
    patientName: 'Ethan Carter',
    date: '2025-10-15',
    time: '09:00',
    type: 'Urologist',
    typeColor: 'red',
    duration: 30,
    status: 'missed',
    notes: 'Follow-up PSA review - No show',
    phone: '(555) 123-4567',
    email: 'ethan.carter@example.com',
    urologistId: 1,
    missedDate: '2025-10-15',
    reminderSent: false
  },
  {
    id: 41,
    patientId: 2,
    patientName: 'Olivia Bennett',
    date: '2025-10-12',
    time: '14:00',
    type: 'Investigation',
    typeColor: 'red',
    duration: 45,
    status: 'missed',
    notes: 'Annual cystoscopy - No show',
    phone: '(555) 234-5678',
    email: 'olivia.bennett@example.com',
    missedDate: '2025-10-12',
    reminderSent: true
  },
  {
    id: 42,
    patientId: 3,
    patientName: 'Noah Parker',
    date: '2025-10-18',
    time: '10:30',
    type: 'Urologist',
    typeColor: 'red',
    duration: 45,
    status: 'missed',
    notes: 'Biopsy results discussion - No show',
    phone: '(555) 345-6789',
    email: 'noah.parker@example.com',
    urologistId: 1,
    missedDate: '2025-10-18',
    reminderSent: false
  },
  {
    id: 43,
    patientId: 4,
    patientName: 'Ava Reynolds',
    date: '2025-10-20',
    time: '11:00',
    type: 'Investigation',
    typeColor: 'red',
    duration: 60,
    status: 'missed',
    notes: 'Cystoscopy procedure - No show',
    phone: '(555) 456-7890',
    email: 'ava.reynolds@example.com',
    missedDate: '2025-10-20',
    reminderSent: false
  },
  {
    id: 44,
    patientId: 5,
    patientName: 'Liam Foster',
    date: '2025-10-22',
    time: '15:30',
    type: 'Urologist',
    typeColor: 'red',
    duration: 30,
    status: 'missed',
    notes: 'Post-surgical follow-up - No show',
    phone: '(555) 567-8901',
    email: 'liam.foster@example.com',
    urologistId: 1,
    missedDate: '2025-10-22',
    reminderSent: true
  },
  {
    id: 45,
    patientId: 6,
    patientName: 'Sophia Martinez',
    date: '2025-10-25',
    time: '14:30',
    type: 'Investigation',
    typeColor: 'red',
    duration: 45,
    status: 'missed',
    notes: 'Cystoscopy procedure - No show',
    phone: '(555) 678-9012',
    email: 'sophia.martinez@example.com',
    missedDate: '2025-10-25',
    reminderSent: false
  },
  {
    id: 46,
    patientId: 7,
    patientName: 'James Wilson',
    date: '2025-10-28',
    time: '09:30',
    type: 'Urologist',
    typeColor: 'red',
    duration: 45,
    status: 'missed',
    notes: 'Pre-operative consultation - No show',
    phone: '(555) 789-0123',
    email: 'james.wilson@example.com',
    urologistId: 2,
    missedDate: '2025-10-28',
    reminderSent: true
  },
  {
    id: 47,
    patientId: 8,
    patientName: 'Emma Thompson',
    date: '2025-10-30',
    time: '11:15',
    type: 'Investigation',
    typeColor: 'red',
    duration: 30,
    status: 'missed',
    notes: 'Surveillance cystoscopy - No show',
    phone: '(555) 890-1234',
    email: 'emma.thompson@example.com',
    missedDate: '2025-10-30',
    reminderSent: false
  },
  {
    id: 48,
    patientId: 1,
    patientName: 'Ethan Carter',
    date: '2025-10-02',
    time: '15:00',
    type: 'Urologist',
    typeColor: 'red',
    duration: 30,
    status: 'missed',
    notes: 'Active monitoring review - No show',
    phone: '(555) 123-4567',
    email: 'ethan.carter@example.com',
    urologistId: 1,
    missedDate: '2025-10-02',
    reminderSent: false
  },
  {
    id: 49,
    patientId: 2,
    patientName: 'Olivia Bennett',
    date: '2025-10-05',
    time: '10:00',
    type: 'Investigation',
    typeColor: 'red',
    duration: 45,
    status: 'missed',
    notes: 'Follow-up cystoscopy - No show',
    phone: '(555) 234-5678',
    email: 'olivia.bennett@example.com',
    missedDate: '2025-10-05',
    reminderSent: true
  },
  {
    id: 50,
    patientId: 3,
    patientName: 'Noah Parker',
    date: '2025-10-08',
    time: '14:00',
    type: 'Urologist',
    typeColor: 'red',
    duration: 45,
    status: 'missed',
    notes: 'Treatment consultation - No show',
    phone: '(555) 345-6789',
    email: 'noah.parker@example.com',
    urologistId: 1,
    missedDate: '2025-10-08',
    reminderSent: false
  },
  {
    id: 51,
    patientId: 4,
    patientName: 'Ava Reynolds',
    date: '2025-10-12',
    time: '16:30',
    type: 'Investigation',
    typeColor: 'red',
    duration: 60,
    status: 'missed',
    notes: 'Diagnostic imaging - No show',
    phone: '(555) 456-7890',
    email: 'ava.reynolds@example.com',
    missedDate: '2025-10-12',
    reminderSent: false
  },
  {
    id: 52,
    patientId: 5,
    patientName: 'Liam Foster',
    date: '2025-10-15',
    time: '08:30',
    type: 'Urologist',
    typeColor: 'red',
    duration: 30,
    status: 'missed',
    notes: '6-month follow-up - No show',
    phone: '(555) 567-8901',
    email: 'liam.foster@example.com',
    urologistId: 1,
    missedDate: '2025-10-15',
    reminderSent: true
  },
  {
    id: 53,
    patientId: 6,
    patientName: 'Sophia Martinez',
    date: '2025-10-18',
    time: '13:45',
    type: 'Investigation',
    typeColor: 'red',
    duration: 45,
    status: 'missed',
    notes: 'Cystoscopy procedure - No show',
    phone: '(555) 678-9012',
    email: 'sophia.martinez@example.com',
    missedDate: '2025-10-18',
    reminderSent: false
  },
  {
    id: 54,
    patientId: 7,
    patientName: 'James Wilson',
    date: '2025-10-22',
    time: '11:00',
    type: 'Urologist',
    typeColor: 'red',
    duration: 45,
    status: 'missed',
    notes: 'Surgical planning - No show',
    phone: '(555) 789-0123',
    email: 'james.wilson@example.com',
    urologistId: 2,
    missedDate: '2025-10-22',
    reminderSent: false
  },
  {
    id: 55,
    patientId: 1,
    patientName: 'Ethan Carter',
    date: '2025-10-25',
    time: '14:30',
    type: 'Investigation',
    typeColor: 'red',
    duration: 60,
    status: 'missed',
    notes: 'PSA blood test - No show',
    phone: '(555) 123-4567',
    email: 'ethan.carter@example.com',
    missedDate: '2025-10-25',
    reminderSent: true
  },
  {
    id: 56,
    patientId: 2,
    patientName: 'Olivia Bennett',
    date: '2025-10-28',
    time: '09:15',
    type: 'Urologist',
    typeColor: 'red',
    duration: 30,
    status: 'missed',
    notes: 'Treatment review - No show',
    phone: '(555) 234-5678',
    email: 'olivia.bennett@example.com',
    urologistId: 1,
    missedDate: '2025-10-28',
    reminderSent: false
  },
  {
    id: 57,
    patientId: 3,
    patientName: 'Noah Parker',
    date: '2025-10-02',
    time: '16:00',
    type: 'Investigation',
    typeColor: 'red',
    duration: 45,
    status: 'missed',
    notes: 'Biopsy procedure - No show',
    phone: '(555) 345-6789',
    email: 'noah.parker@example.com',
    missedDate: '2025-10-02',
    reminderSent: false
  },
  {
    id: 58,
    patientId: 4,
    patientName: 'Ava Reynolds',
    date: '2025-10-05',
    time: '10:45',
    type: 'Urologist',
    typeColor: 'red',
    duration: 30,
    status: 'missed',
    notes: 'Post-treatment check - No show',
    phone: '(555) 456-7890',
    email: 'ava.reynolds@example.com',
    urologistId: 1,
    missedDate: '2025-10-05',
    reminderSent: true
  },
  {
    id: 59,
    patientId: 5,
    patientName: 'Liam Foster',
    date: '2025-10-08',
    time: '13:30',
    type: 'Investigation',
    typeColor: 'red',
    duration: 60,
    status: 'missed',
    notes: 'Monitoring scan - No show',
    phone: '(555) 567-8901',
    email: 'liam.foster@example.com',
    missedDate: '2025-10-08',
    reminderSent: false
  },
  {
    id: 60,
    patientId: 6,
    patientName: 'Sophia Martinez',
    date: '2025-10-12',
    time: '08:00',
    type: 'Urologist',
    typeColor: 'red',
    duration: 45,
    status: 'missed',
    notes: 'Follow-up consultation - No show',
    phone: '(555) 678-9012',
    email: 'sophia.martinez@example.com',
    urologistId: 2,
    missedDate: '2025-10-12',
    reminderSent: false
  },
  {
    id: 61,
    patientId: 7,
    patientName: 'James Wilson',
    date: '2025-10-15',
    time: '15:15',
    type: 'Investigation',
    typeColor: 'red',
    duration: 30,
    status: 'missed',
    notes: 'Pre-operative assessment - No show',
    phone: '(555) 789-0123',
    email: 'james.wilson@example.com',
    missedDate: '2025-10-15',
    reminderSent: true
  },
  {
    id: 62,
    patientId: 8,
    patientName: 'Emma Thompson',
    date: '2025-10-18',
    time: '11:30',
    type: 'Urologist',
    typeColor: 'red',
    duration: 30,
    status: 'missed',
    notes: 'Annual follow-up - No show',
    phone: '(555) 890-1234',
    email: 'emma.thompson@example.com',
    urologistId: 1,
    missedDate: '2025-10-18',
    reminderSent: false
  },
  {
    id: 63,
    patientId: 1,
    patientName: 'Ethan Carter',
    date: '2025-10-20',
    time: '12:45',
    type: 'Urologist',
    typeColor: 'red',
    duration: 45,
    status: 'missed',
    notes: 'Treatment discussion - No show',
    phone: '(555) 123-4567',
    email: 'ethan.carter@example.com',
    urologistId: 1,
    missedDate: '2025-10-20',
    reminderSent: false
  },
  {
    id: 64,
    patientId: 2,
    patientName: 'Olivia Bennett',
    date: '2025-10-22',
    time: '09:30',
    type: 'Investigation',
    typeColor: 'red',
    duration: 45,
    status: 'missed',
    notes: 'Comprehensive evaluation - No show',
    phone: '(555) 234-5678',
    email: 'olivia.bennett@example.com',
    missedDate: '2025-10-22',
    reminderSent: true
  },
  {
    id: 65,
    patientId: 3,
    patientName: 'Noah Parker',
    date: '2025-10-25',
    time: '14:00',
    type: 'Urologist',
    typeColor: 'red',
    duration: 30,
    status: 'missed',
    notes: 'Initial consultation - No show',
    phone: '(555) 345-6789',
    email: 'noah.parker@example.com',
    urologistId: 1,
    missedDate: '2025-10-25',
    reminderSent: false
  },
  {
    id: 66,
    patientId: 4,
    patientName: 'Ava Reynolds',
    date: '2025-10-28',
    time: '16:30',
    type: 'Investigation',
    typeColor: 'red',
    duration: 60,
    status: 'missed',
    notes: 'Follow-up procedure - No show',
    phone: '(555) 456-7890',
    email: 'ava.reynolds@example.com',
    missedDate: '2025-10-28',
    reminderSent: false
  },
  {
    id: 67,
    patientId: 5,
    patientName: 'Liam Foster',
    date: '2025-10-30',
    time: '10:15',
    type: 'Urologist',
    typeColor: 'red',
    duration: 30,
    status: 'missed',
    notes: 'Recovery assessment - No show',
    phone: '(555) 567-8901',
    email: 'liam.foster@example.com',
    urologistId: 1,
    missedDate: '2025-10-30',
    reminderSent: true
  },
  {
    id: 68,
    patientId: 6,
    patientName: 'Sophia Martinez',
    date: '2025-10-03',
    time: '13:00',
    type: 'Investigation',
    typeColor: 'red',
    duration: 45,
    status: 'missed',
    notes: 'Diagnostic review - No show',
    phone: '(555) 678-9012',
    email: 'sophia.martinez@example.com',
    missedDate: '2025-10-03',
    reminderSent: false
  },
  {
    id: 69,
    patientId: 7,
    patientName: 'James Wilson',
    date: '2025-10-06',
    time: '11:45',
    type: 'Urologist',
    typeColor: 'red',
    duration: 45,
    status: 'missed',
    notes: 'Monthly check-up - No show',
    phone: '(555) 789-0123',
    email: 'james.wilson@example.com',
    urologistId: 2,
    missedDate: '2025-10-06',
    reminderSent: false
  },
  {
    id: 70,
    patientId: 8,
    patientName: 'Emma Thompson',
    date: '2025-10-10',
    time: '15:30',
    type: 'Investigation',
    typeColor: 'red',
    duration: 30,
    status: 'missed',
    notes: 'Surveillance appointment - No show',
    phone: '(555) 890-1234',
    email: 'emma.thompson@example.com',
    missedDate: '2025-10-10',
    reminderSent: true
  }
];

// Helper function to get appointments by date
export const getAppointmentsByDate = (date, appointments = null) => {
  const data = appointments || appointmentsData;
  return data.filter(appointment => appointment.date === date);
};

// Helper function to get appointment by ID
export const getAppointmentById = (id) => {
  return appointmentsData.find(appointment => appointment.id === id);
};

// Helper function to get all appointments
export const getAllAppointments = () => {
  return appointmentsData;
};

// Helper function to get appointments by urologist
export const getAppointmentsByUrologist = (urologistId) => {
  return appointmentsData.filter(appointment => appointment.urologistId === urologistId);
};

// Helper function to get all appointments for patients assigned to a urologist
export const getAppointmentsForUrologistPatients = (urologistId) => {
  // First, get all patients assigned to this urologist
  const urologistPatientIds = patientsData
    .filter(patient => patient.urologistId === urologistId)
    .map(patient => patient.id);
  
  // Then get all appointments for those patients (both Urologist and Investigation types)
  return appointmentsData.filter(appointment => 
    urologistPatientIds.includes(appointment.patientId)
  );
};

// Helper function to get appointments by date and urologist
export const getAppointmentsByDateAndUrologist = (date, urologistId) => {
  return appointmentsData.filter(appointment => 
    appointment.date === date && appointment.urologistId === urologistId
  );
};

// Helper function to get missed appointments
export const getMissedAppointments = (urologistId = null) => {
  let missedAppointments = appointmentsData.filter(appointment => appointment.status === 'missed');
  
  if (urologistId) {
    // Filter for urologist's patients only
    const urologistPatientIds = patientsData
      .filter(patient => patient.urologistId === urologistId)
      .map(patient => patient.id);
    
    missedAppointments = missedAppointments.filter(appointment => 
      urologistPatientIds.includes(appointment.patientId)
    );
  }
  
  return missedAppointments.sort((a, b) => new Date(b.missedDate) - new Date(a.missedDate));
};

// Helper function to get missed appointments for all patients
export const getAllMissedAppointments = () => {
  return appointmentsData.filter(appointment => appointment.status === 'missed')
    .sort((a, b) => new Date(b.missedDate) - new Date(a.missedDate));
};

// Helper function to mark reminder as sent
export const markReminderSent = (appointmentId) => {
  const appointmentIndex = appointmentsData.findIndex(app => app.id === appointmentId);
  if (appointmentIndex !== -1) {
    appointmentsData[appointmentIndex].reminderSent = true;
    return appointmentsData[appointmentIndex];
  }
  return null;
};

// Helper function to update appointment date
export const updateAppointmentDate = (appointmentId, newDate, newTime) => {
  const appointmentIndex = appointmentsData.findIndex(app => app.id === appointmentId);
  if (appointmentIndex !== -1) {
    appointmentsData[appointmentIndex].date = newDate;
    appointmentsData[appointmentIndex].time = newTime;
    return appointmentsData[appointmentIndex];
  }
  return null;
};

// MDT Schedule Data
export const mdtScheduleData = [
  {
    id: 1,
    date: '2025-10-22',
    time: '13:00',
    department: 'Urology',
    location: 'Conference Room A',
    patientId: 1,
    patientName: 'Ethan Carter',
    attendees: [
      { name: 'Dr. Noah Davis', initials: 'ND', color: 'teal', role: 'Urologist' },
      { name: 'Dr. Chloe Miller', initials: 'CM', color: 'green', role: 'Oncologist' },
      { name: 'Dr. John Peterson', initials: 'JP', color: 'yellow', role: 'Radiologist' },
      { name: 'Dr. Sarah Williams', initials: 'SW', color: 'blue', role: 'Pathologist' },
      { name: 'Dr. Michael Brown', initials: 'MB', color: 'purple', role: 'Medical Oncologist' }
    ],
    status: 'upcoming',
    chair: 'Dr. Thompson',
    caseType: 'Prostate Cancer - Treatment Planning'
  },
  {
    id: 2,
    date: '2025-10-24',
    time: '14:00',
    department: 'Urology',
    location: 'Conference Room B',
    patientId: 3,
    patientName: 'Noah Parker',
    attendees: [
      { name: 'Dr. Emma Davis', initials: 'ED', color: 'pink', role: 'Urologist' },
      { name: 'Dr. Robert Chen', initials: 'RC', color: 'indigo', role: 'Oncologist' },
      { name: 'Dr. Lisa Anderson', initials: 'LA', color: 'orange', role: 'Radiologist' }
    ],
    status: 'upcoming',
    chair: 'Dr. Chen',
    caseType: 'Prostate Cancer - Biopsy Results Review'
  },
  {
    id: 3,
    date: '2025-10-25',
    time: '10:00',
    department: 'Urology',
    location: 'Virtual Meeting',
    patientId: 4,
    patientName: 'Ava Reynolds',
    attendees: [
      { name: 'Dr. Noah Davis', initials: 'ND', color: 'teal', role: 'Urologist' },
      { name: 'Dr. Tom Harrison', initials: 'TH', color: 'red', role: 'Oncologist' },
      { name: 'Dr. Anna Smith', initials: 'AS', color: 'green', role: 'Radiologist' }
    ],
    status: 'upcoming',
    chair: 'Dr. Harrison',
    caseType: 'Bladder Cancer - Surveillance Review'
  },
  {
    id: 4,
    date: '2025-10-29',
    time: '13:00',
    department: 'Urology',
    location: 'Conference Room A',
    patientId: 2,
    patientName: 'Olivia Bennett',
    attendees: [
      { name: 'Dr. Noah Davis', initials: 'ND', color: 'teal', role: 'Urologist' },
      { name: 'Dr. Chloe Miller', initials: 'CM', color: 'green', role: 'Oncologist' },
      { name: 'Dr. John Peterson', initials: 'JP', color: 'yellow', role: 'Radiologist' },
      { name: 'Dr. David Lee', initials: 'DL', color: 'blue', role: 'Pathologist' }
    ],
    status: 'upcoming',
    chair: 'Dr. Thompson',
    caseType: 'Prostate Cancer - Post-Treatment Follow-up'
  },
  {
    id: 5,
    date: '2025-10-15',
    time: '13:00',
    department: 'Urology',
    location: 'Conference Room A',
    patientId: 5,
    patientName: 'Liam Foster',
    attendees: [
      { name: 'Dr. Noah Davis', initials: 'ND', color: 'teal', role: 'Urologist' },
      { name: 'Dr. Chloe Miller', initials: 'CM', color: 'green', role: 'Oncologist' },
      { name: 'Dr. John Peterson', initials: 'JP', color: 'yellow', role: 'Radiologist' }
    ],
    status: 'completed',
    chair: 'Dr. Thompson',
    caseType: 'Prostate Cancer - Post-Surgical Review',
    outcome: 'Continue active surveillance, PSA monitoring every 3 months'
  },
  {
    id: 6,
    date: '2025-11-05',
    time: '13:00',
    department: 'Urology',
    location: 'Conference Room A',
    patientId: 1,
    patientName: 'Ethan Carter',
    attendees: [
      { name: 'Dr. Noah Davis', initials: 'ND', color: 'teal', role: 'Urologist' },
      { name: 'Dr. Chloe Miller', initials: 'CM', color: 'green', role: 'Oncologist' },
      { name: 'Dr. John Peterson', initials: 'JP', color: 'yellow', role: 'Radiologist' },
      { name: 'Dr. Sarah Williams', initials: 'SW', color: 'blue', role: 'Pathologist' }
    ],
    status: 'scheduled',
    chair: 'Dr. Thompson',
    caseType: 'Prostate Cancer - Treatment Response Review'
  }
];

// Helper function to get MDT schedules by date range
export const getMdtSchedulesByDateRange = (startDate, endDate) => {
  return mdtScheduleData.filter(schedule => {
    const scheduleDate = new Date(schedule.date);
    return scheduleDate >= new Date(startDate) && scheduleDate <= new Date(endDate);
  });
};

// Helper function to get upcoming MDT schedules
export const getUpcomingMdtSchedules = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return mdtScheduleData.filter(schedule => {
    const scheduleDate = new Date(schedule.date);
    return scheduleDate >= today;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Helper function to get MDT schedule by ID
export const getMdtScheduleById = (id) => {
  return mdtScheduleData.find(schedule => schedule.id === id);
};

// Surgery Data
export const surgeryData = [
  {
    id: 1,
    patientId: 1,
    patientName: 'Ethan Carter',
    age: 62,
    procedure: 'Robot-assisted Laparoscopic Prostatectomy',
    scheduledDate: '2025-10-27',
    scheduledTime: '08:00',
    duration: 180, // 3 hours
    priority: 'High',
    priorityColor: 'red',
    status: 'Scheduled',
    statusColor: 'blue',
    surgeon: 'Dr. Thompson',
    anesthetist: 'Dr. Sarah Williams',
    operatingRoom: 'OR-1',
    notes: 'Pre-op assessment completed. Patient ready for surgery.',
    urologistId: 1
  },
  {
    id: 2,
    patientId: 5,
    patientName: 'Liam Foster',
    age: 71,
    procedure: 'Radical Prostatectomy',
    scheduledDate: '2025-10-28',
    scheduledTime: '09:30',
    duration: 120, // 2 hours
    priority: 'High',
    priorityColor: 'red',
    status: 'Scheduled',
    statusColor: 'blue',
    surgeon: 'Dr. Thompson',
    anesthetist: 'Dr. Michael Brown',
    operatingRoom: 'OR-2',
    notes: 'Final pre-op consultation completed.',
    urologistId: 1
  },
  {
    id: 3,
    patientId: 7,
    patientName: 'James Wilson',
    age: 68,
    procedure: 'Laparoscopic Partial Nephrectomy',
    scheduledDate: '2025-10-29',
    scheduledTime: '10:00',
    duration: 150, // 2.5 hours
    priority: 'Medium',
    priorityColor: 'yellow',
    status: 'Awaiting Pre-op',
    statusColor: 'yellow',
    surgeon: 'Dr. Thompson',
    anesthetist: 'Dr. Anna Smith',
    operatingRoom: 'OR-1',
    notes: 'Pre-operative assessment pending.',
    urologistId: 2
  },
  {
    id: 4,
    patientId: 3,
    patientName: 'Noah Parker',
    age: 55,
    procedure: 'Transurethral Resection of Prostate (TURP)',
    scheduledDate: '2025-10-30',
    scheduledTime: '14:00',
    duration: 90, // 1.5 hours
    priority: 'Medium',
    priorityColor: 'yellow',
    status: 'Scheduled',
    statusColor: 'blue',
    surgeon: 'Dr. Thompson',
    anesthetist: 'Dr. John Peterson',
    operatingRoom: 'OR-3',
    notes: 'Patient consented. Biopsy results reviewed.',
    urologistId: 1
  },
  {
    id: 5,
    patientId: 4,
    patientName: 'Ava Reynolds',
    age: 67,
    procedure: 'Cystoscopy with Biopsy',
    scheduledDate: '2025-10-31',
    scheduledTime: '11:00',
    duration: 60, // 1 hour
    priority: 'Low',
    priorityColor: 'green',
    status: 'Scheduled',
    statusColor: 'blue',
    surgeon: 'Dr. Thompson',
    anesthetist: 'Dr. Sarah Williams',
    operatingRoom: 'OR-4',
    notes: 'Surveillance cystoscopy as per protocol.',
    urologistId: 1
  },
  {
    id: 6,
    patientId: 6,
    patientName: 'Sophia Martinez',
    age: 45,
    procedure: 'Transurethral Resection of Bladder Tumor (TURBT)',
    scheduledDate: '2025-11-01',
    scheduledTime: '13:30',
    duration: 75, // 1.25 hours
    priority: 'Medium',
    priorityColor: 'yellow',
    status: 'Awaiting Pre-op',
    statusColor: 'yellow',
    surgeon: 'Dr. Thompson',
    anesthetist: 'Dr. Michael Brown',
    operatingRoom: 'OR-2',
    notes: 'Pre-operative workup in progress.',
    urologistId: 2
  },
  {
    id: 7,
    patientId: 1,
    patientName: 'Ethan Carter',
    age: 62,
    procedure: 'Follow-up Cystoscopy',
    scheduledDate: '2025-11-02',
    scheduledTime: '15:00',
    duration: 45, // 45 minutes
    priority: 'Low',
    priorityColor: 'green',
    status: 'Scheduled',
    statusColor: 'blue',
    surgeon: 'Dr. Thompson',
    anesthetist: 'Dr. Anna Smith',
    operatingRoom: 'OR-4',
    notes: 'Post-operative surveillance cystoscopy.',
    urologistId: 1
  },
  {
    id: 8,
    patientId: 2,
    patientName: 'Olivia Bennett',
    age: 58,
    procedure: 'Urethral Dilation',
    scheduledDate: '2025-11-03',
    scheduledTime: '09:00',
    duration: 30, // 30 minutes
    priority: 'Low',
    priorityColor: 'green',
    status: 'Scheduled',
    statusColor: 'blue',
    surgeon: 'Dr. Thompson',
    anesthetist: 'Dr. John Peterson',
    operatingRoom: 'OR-3',
    notes: 'Routine follow-up procedure.',
    urologistId: 1
  },
  {
    id: 9,
    patientId: 5,
    patientName: 'Liam Foster',
    age: 71,
    procedure: 'Urodynamic Study',
    scheduledDate: '2025-11-04',
    scheduledTime: '10:30',
    duration: 60, // 1 hour
    priority: 'Medium',
    priorityColor: 'yellow',
    status: 'Scheduled',
    statusColor: 'blue',
    surgeon: 'Dr. Thompson',
    anesthetist: 'Dr. Sarah Williams',
    operatingRoom: 'OR-4',
    notes: 'Post-prostatectomy urodynamic evaluation.',
    urologistId: 1
  },
  {
    id: 10,
    patientId: 3,
    patientName: 'Noah Parker',
    age: 55,
    procedure: 'Prostate Biopsy',
    scheduledDate: '2025-11-05',
    scheduledTime: '14:00',
    duration: 45, // 45 minutes
    priority: 'High',
    priorityColor: 'red',
    status: 'Scheduled',
    statusColor: 'blue',
    surgeon: 'Dr. Thompson',
    anesthetist: 'Dr. Michael Brown',
    operatingRoom: 'OR-1',
    notes: 'Transrectal ultrasound-guided biopsy.',
    urologistId: 1
  },
  // Additional surgeries for better testing
  {
    id: 11,
    patientId: 8,
    patientName: 'Emma Thompson',
    age: 52,
    procedure: 'Cystoscopy with Stent Removal',
    scheduledDate: '2025-10-27',
    scheduledTime: '14:30',
    duration: 30,
    priority: 'Low',
    priorityColor: 'green',
    status: 'Scheduled',
    statusColor: 'blue',
    surgeon: 'Dr. Thompson',
    anesthetist: 'Dr. John Peterson',
    operatingRoom: 'OR-3',
    notes: 'Routine stent removal procedure.',
    urologistId: 1
  },
  {
    id: 12,
    patientId: 1,
    patientName: 'Ethan Carter',
    age: 62,
    procedure: 'Prostate Biopsy',
    scheduledDate: '2025-10-28',
    scheduledTime: '11:00',
    duration: 60,
    priority: 'High',
    priorityColor: 'red',
    status: 'Scheduled',
    statusColor: 'blue',
    surgeon: 'Dr. Thompson',
    anesthetist: 'Dr. Sarah Williams',
    operatingRoom: 'OR-1',
    notes: 'Follow-up biopsy for monitoring.',
    urologistId: 1
  },
  {
    id: 13,
    patientId: 4,
    patientName: 'Ava Reynolds',
    age: 67,
    procedure: 'Urethral Stricture Repair',
    scheduledDate: '2025-10-29',
    scheduledTime: '09:00',
    duration: 120,
    priority: 'Medium',
    priorityColor: 'yellow',
    status: 'Awaiting Pre-op',
    statusColor: 'yellow',
    surgeon: 'Dr. Thompson',
    anesthetist: 'Dr. Michael Brown',
    operatingRoom: 'OR-2',
    notes: 'Pre-operative assessment required.',
    urologistId: 1
  },
  {
    id: 14,
    patientId: 6,
    patientName: 'Sophia Martinez',
    age: 45,
    procedure: 'Cystoscopy with Biopsy',
    scheduledDate: '2025-10-30',
    scheduledTime: '10:30',
    duration: 45,
    priority: 'Medium',
    priorityColor: 'yellow',
    status: 'Scheduled',
    statusColor: 'blue',
    surgeon: 'Dr. Thompson',
    anesthetist: 'Dr. Anna Smith',
    operatingRoom: 'OR-4',
    notes: 'Diagnostic cystoscopy with biopsy.',
    urologistId: 2
  },
  {
    id: 15,
    patientId: 2,
    patientName: 'Olivia Bennett',
    age: 58,
    procedure: 'Urodynamic Study',
    scheduledDate: '2025-10-31',
    scheduledTime: '13:00',
    duration: 90,
    priority: 'Low',
    priorityColor: 'green',
    status: 'Scheduled',
    statusColor: 'blue',
    surgeon: 'Dr. Thompson',
    anesthetist: 'Dr. John Peterson',
    operatingRoom: 'OR-3',
    notes: 'Comprehensive urodynamic evaluation.',
    urologistId: 1
  }
];

// Helper function to get surgeries by date range
export const getSurgeriesByDateRange = (startDate, endDate, urologistId = null) => {
  let surgeries = surgeryData.filter(surgery => {
    const surgeryDate = new Date(surgery.scheduledDate);
    return surgeryDate >= new Date(startDate) && surgeryDate <= new Date(endDate);
  });
  
  if (urologistId) {
    surgeries = surgeries.filter(surgery => surgery.urologistId === urologistId);
  }
  
  return surgeries.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
};

// Helper function to get today's surgeries
export const getTodaysSurgeries = (urologistId = null) => {
  const today = new Date().toISOString().split('T')[0];
  return getSurgeriesByDateRange(today, today, urologistId);
};

// Helper function to get this week's surgeries
export const getThisWeeksSurgeries = (urologistId = null) => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
  
  return getSurgeriesByDateRange(
    startOfWeek.toISOString().split('T')[0],
    endOfWeek.toISOString().split('T')[0],
    urologistId
  );
};

// Helper function to get this month's surgeries
export const getThisMonthsSurgeries = (urologistId = null) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  return getSurgeriesByDateRange(
    startOfMonth.toISOString().split('T')[0],
    endOfMonth.toISOString().split('T')[0],
    urologistId
  );
};

// Helper function to get surgery by ID
export const getSurgeryById = (id) => {
  return surgeryData.find(surgery => surgery.id === id);
};

