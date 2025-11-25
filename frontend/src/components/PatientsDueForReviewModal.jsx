import React, { useEffect } from 'react';
import { IoClose, IoEye, IoCalendar } from 'react-icons/io5';

const PatientsDueForReviewModal = ({ isOpen, onClose, patients = [], loading = false, error = null, patientModalRef }) => {
  // Use the passed patients prop instead of hardcoded data
  const patientsDueForReview = patients;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'Low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };


  const getTypeColor = (type) => {
    switch (type) {
      case 'Post-Op Follow-up':
        return 'bg-purple-100 text-purple-700';
      case 'Surgery':
        return 'bg-orange-100 text-orange-700';
      case 'Investigation':
        return 'bg-blue-100 text-blue-700';
      case 'Follow-up':
        return 'bg-teal-100 text-teal-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    } catch (error) {
      return dateString;
    }
  };

  // Handle Escape key to close modal (read-only, no unsaved changes check)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        console.log('Escape key pressed in PatientsDueForReviewModal!');
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Patients Due for Review</h2>
            <p className="text-gray-600 mt-1">Upcoming Appointments ({patientsDueForReview.length} {patientsDueForReview.length === 1 ? 'patient' : 'patients'})</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <IoClose className="text-2xl text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6">

            {/* Patients Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                   <thead className="bg-gray-50 border-b border-gray-200">
                     <tr>
                       <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Patient Name</th>
                       <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Age</th>
                       <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Type</th>
                       <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Review Date</th>
                       <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Priority</th>
                       <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Actions</th>
                     </tr>
                   </thead>
                  <tbody>
                     {loading ? (
                       <tr>
                         <td colSpan="6" className="py-8 text-center text-gray-500">
                           Loading patients due for review...
                         </td>
                       </tr>
                     ) : error ? (
                       <tr>
                         <td colSpan="6" className="py-8 text-center text-red-500">
                           Error: {error}
                         </td>
                       </tr>
                     ) : patientsDueForReview.length === 0 ? (
                       <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-500">
                          No upcoming appointments
                        </td>
                       </tr>
                     ) : (
                       patientsDueForReview.map((patient) => (
                         <tr key={patient.id || patient.appointmentId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                           <td className="py-3 px-4 text-gray-900 font-medium">{patient.name || patient.patientName || 'Unknown Patient'}</td>
                           <td className="py-3 px-4 text-gray-700">{patient.age || 'N/A'}</td>
                           <td className="py-3 px-4">
                             <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(patient.type || 'Follow-up')}`} aria-label={`Type: ${patient.type || 'Follow-up'}`}>
                               {patient.type || 'Follow-up'}
                             </span>
                           </td>
                           <td className="py-3 px-4 text-gray-700">{formatDate(patient.date || patient.appointmentDate)}</td>
                           <td className="py-3 px-4">
                             <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(patient.priority || 'Medium')}`} aria-label={`Priority: ${patient.priority || 'Medium'}`}>
                               {patient.priority || 'Medium'}
                             </span>
                           </td>
                           <td className="py-3 px-4">
                             <button 
                               onClick={() => {
                                 if (patientModalRef?.current) {
                                   // Determine category based on type
                                   let category = 'new';
                                   const patientType = patient.type || 'Follow-up';
                                   if (patientType === 'Surgery') {
                                     category = 'surgery-pathway';
                                   } else if (patientType === 'Post-Op Follow-up') {
                                     category = 'post-op-followup';
                                   }
                                   const patientName = patient.name || patient.patientName || 'Unknown Patient';
                                   patientModalRef.current.openPatientDetails(patientName, { age: patient.age }, category);
                                   onClose();
                                 }
                               }}
                               className="group flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                               aria-label={`View details for ${patient.name || patient.patientName || 'patient'}`}
                             >
                               <IoEye className="text-sm" />
                               View
                             </button>
                           </td>
                         </tr>
                       ))
                     )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

         {/* Footer */}
         <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
           <button
             onClick={onClose}
             className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
           >
             Close
           </button>
         </div>
      </div>
    </div>
  );
};

export default PatientsDueForReviewModal;
