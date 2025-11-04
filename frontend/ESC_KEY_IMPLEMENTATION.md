# Escape Key Implementation for Modals

## Overview
All modal windows in the application now support closing with the Escape key, with an option to save if any data has been edited.

## Implementation Details

### Custom Hook: `useEscapeKey`
Location: `src/utils/useEscapeKey.js`

**Features:**
- Detects Escape key press
- Shows confirmation dialog if there are unsaved changes
- Optionally saves changes before closing
- Cleans up event listeners on unmount

**Parameters:**
- `onClose`: Function to close the modal
- `isOpen`: Boolean indicating if modal is open
- `hasUnsavedChanges`: Boolean indicating if there are unsaved changes (optional, default: false)
- `onSave`: Function to save changes before closing (optional, default: null)

### Completed Modals

1. ✅ **SuccessModal** (`src/components/SuccessModal.jsx`)
   - Simple modal - no form data to save
   - Escape key closes immediately

2. ✅ **UpdateAppointmentModal** (`src/components/UpdateAppointmentModal.jsx`)
   - Tracks unsaved changes in appointment fields
   - Shows confirmation dialog on Escape
   - Option to save changes before closing

3. ✅ **AddPatientModal** (`src/components/AddPatientModal.jsx`)
   - Detects any form field changes
   - Shows confirmation dialog on Escape
   - Option to save patient data before closing

### Modals Still To Update

The following modals need to be updated with Escape key support:

1. **AppointmentDetailsModal** (`src/components/AppointmentDetailsModal.jsx`)
2. **BookInvestigationModal** (`src/components/BookInvestigationModal.jsx`)
3. **NoShowPatientModal** (`src/components/NoShowPatientModal.jsx`)
4. **RescheduleConfirmationModal** (`src/components/RescheduleConfirmationModal.jsx`)
5. **AddScheduleModal** (`src/components/AddScheduleModal.jsx`)
6. **AddInvestigationModal** (`src/components/AddInvestigationModal.jsx`)
7. **NotificationModal** (`src/components/NotificationModal.jsx`)
8. **PatientsDueForReviewModal** (`src/components/PatientsDueForReviewModal.jsx`)
9. **MDTScheduleDetailsModal** (`src/components/MDTScheduleDetailsModal.jsx`)
10. **MDTSchedulingModal** (`src/components/MDTSchedulingModal.jsx`)
11. **MDTNotesModal** (`src/components/MDTNotesModal.jsx`)
12. **Calendar** (`src/components/Calendar.jsx`)
13. **GPPatientDetailsModal** (`src/components/GPPatientDetailsModal.jsx`)
14. **NursePatientDetailsModal** (`src/components/NursePatientDetailsModal.jsx`)
15. **UrologistPatientDetailsModal** (`src/components/UrologistPatientDetailsModal.jsx`)

## How to Add Escape Key Support to a Modal

### Step 1: Import the Hook
```jsx
import { useEscapeKey } from '../utils/useEscapeKey';
```

### Step 2: Determine Unsaved Changes
```jsx
// For forms with multiple fields
const hasUnsavedChanges = Object.values(formData).some(value => 
  typeof value === 'string' ? value.trim() !== '' : value !== ''
);

// For simpler forms, compare against initial values
const hasUnsavedChanges = 
  formField !== initialValue ||
  anotherField !== initialValue;
```

### Step 3: Add the Hook
```jsx
useEscapeKey(handleClose, isOpen, hasUnsavedChanges, handleSubmit);
```

### Step 4: Ensure handleSubmit Accepts Optional Event
```jsx
const handleSubmit = (e) => {
  if (e) e.preventDefault(); // Allow calling without event from Escape key
  // ... rest of submit logic
};
```

## Example Implementation

```jsx
import React, { useState } from 'react';
import { useEscapeKey } from '../utils/useEscapeKey';

const MyModal = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const initialData = { name: '', email: '' };

  // Check for unsaved changes
  const hasUnsavedChanges = 
    name !== initialData.name || email !== initialData.email;

  // Handle Escape key
  useEscapeKey(onClose, isOpen, hasUnsavedChanges, handleSave);

  const handleSave = (e) => {
    if (e) e.preventDefault();
    // Save logic here
    onSave({ name, email });
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      {/* Modal content */}
    </div>
  );
};
```

## Benefits

1. **Better UX**: Standard keyboard shortcut support
2. **Data Protection**: Prevents accidental data loss
3. **Accessibility**: Keyboard navigation support
4. **Consistency**: All modals behave the same way

