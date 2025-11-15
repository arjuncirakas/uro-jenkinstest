import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import UrologistSidebar from '../components/layout/UrologistSidebar';
import AddPatientModal from '../components/AddPatientModal';
import SuccessModal from '../components/modals/SuccessModal';
import ErrorModal from '../components/modals/ErrorModal';
import { HiMenu, HiX } from 'react-icons/hi';

const UrologistLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleAddPatient = (newPatient) => {
    console.log('New patient added:', newPatient);
    
    // Set success details and show modal
    setSuccessDetails({
      name: `${newPatient.firstName} ${newPatient.lastName}`,
      upi: newPatient.upi,
      phone: newPatient.phone,
      email: newPatient.email
    });
    setIsSuccessModalOpen(true);
    
    // Dispatch custom event to notify other components (like Patients page) to refresh
    window.dispatchEvent(new CustomEvent('patient:added', {
      detail: { patient: newPatient }
    }));
  };

  const handleSuccessModalClose = () => {
    setIsSuccessModalOpen(false);
    setSuccessDetails(null);
  };

  const handleError = (errorData) => {
    console.log('Error occurred:', errorData);
    setErrorDetails(errorData);
    setIsErrorModalOpen(true);
  };

  const handleErrorModalClose = () => {
    setIsErrorModalOpen(false);
    setErrorDetails(null);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 lg:hidden bg-teal-600 text-white p-2 rounded-lg shadow-lg hover:bg-teal-700 transition-colors"
      >
        {isSidebarOpen ? <HiX className="text-2xl" /> : <HiMenu className="text-2xl" />}
      </button>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <UrologistSidebar 
        isOpen={isSidebarOpen} 
        onClose={toggleSidebar}
        onOpenAddPatient={() => setIsAddPatientOpen(true)}
      />
      
      <main className="flex-1 flex flex-col w-full lg:w-auto overflow-hidden">
        <Outlet />
      </main>

      {/* Add Patient Modal */}
      <AddPatientModal 
        isOpen={isAddPatientOpen}
        onClose={() => setIsAddPatientOpen(false)}
        onPatientAdded={handleAddPatient}
        onError={handleError}
        isUrologist={true}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={handleSuccessModalClose}
        title="Patient Added Successfully!"
        message="The patient has been successfully added to the system."
        details={successDetails}
        onConfirm={handleSuccessModalClose}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={isErrorModalOpen}
        onClose={handleErrorModalClose}
        title={errorDetails?.title || 'Error'}
        message={errorDetails?.message || 'An error occurred'}
        errors={errorDetails?.errors || []}
        onConfirm={handleErrorModalClose}
      />
    </div>
  );
};

export default UrologistLayout;

