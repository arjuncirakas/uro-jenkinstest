import React, { useState, useEffect, useCallback } from 'react';
import { FiEye, FiPlus } from 'react-icons/fi';
import NurseHeader from '../../components/layout/NurseHeader';
import NursePatientDetailsModal from '../../components/NursePatientDetailsModal';
import AddInvestigationResultModal from '../../components/AddInvestigationResultModal';
import PDFViewerModal from '../../components/PDFViewerModal';
import { investigationService } from '../../services/investigationService';
import { patientService } from '../../services/patientService';

const InvestigationManagement = () => {
  // State for search and modals
  const [searchQuery, setSearchQuery] = useState('');
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // State for investigations data
  const [investigations, setInvestigations] = useState([]);
  const [loadingInvestigations, setLoadingInvestigations] = useState(false);
  const [investigationsError, setInvestigationsError] = useState(null);

  // State for test result management
  const [selectedInvestigationRequest, setSelectedInvestigationRequest] = useState(null);
  const [selectedPatientForUpload, setSelectedPatientForUpload] = useState(null);
  const [selectedExistingResult, setSelectedExistingResult] = useState(null);
  const [isAddResultModalOpen, setIsAddResultModalOpen] = useState(false);
  const [investigationRequests, setInvestigationRequests] = useState({}); // Map of patientId -> { mri: requestId, biopsy: requestId, trus: requestId }
  const [testResults, setTestResults] = useState({}); // Map of patientId -> { mri: result, biopsy: result, trus: result }
  const [loadingRequests, setLoadingRequests] = useState({});

  // PDF viewer modal state
  const [isPDFViewerModalOpen, setIsPDFViewerModalOpen] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState(null);
  const [pdfViewerFileName, setPdfViewerFileName] = useState(null);
  const [pdfViewerBlobUrl, setPdfViewerBlobUrl] = useState(null);

  // Fetch investigations data
  const fetchInvestigations = async () => {
    setLoadingInvestigations(true);
    setInvestigationsError(null);
    
    try {
      const result = await investigationService.getAllInvestigations();
      console.log('🔍 InvestigationManagement: getAllInvestigations result:', result);
      
      if (result.success) {
        const investigationsData = result.data?.investigations || result.data || [];
        console.log('✅ InvestigationManagement: Setting investigations:', investigationsData);
        setInvestigations(investigationsData);
      } else {
        setInvestigationsError(result.error || 'Failed to fetch investigations');
        console.error('❌ Error fetching investigations:', result.error);
      }
    } catch (error) {
      setInvestigationsError('Failed to fetch investigations');
      console.error('❌ Exception fetching investigations:', error);
    } finally {
      setLoadingInvestigations(false);
    }
  };

  // Load investigations on component mount
  useEffect(() => {
    fetchInvestigations();
  }, []);

  // Listen for PDF viewer events
  useEffect(() => {
    const handleOpenPDFViewer = (event) => {
      const { pdfUrl, fileName, blobUrl } = event.detail;
      setPdfViewerUrl(pdfUrl);
      setPdfViewerFileName(fileName);
      setPdfViewerBlobUrl(blobUrl);
      setIsPDFViewerModalOpen(true);
    };

    window.addEventListener('openPDFViewer', handleOpenPDFViewer);

    return () => {
      window.removeEventListener('openPDFViewer', handleOpenPDFViewer);
    };
  }, []);

  // Handle closing PDF viewer modal and cleanup
  const handleClosePDFViewer = () => {
    setIsPDFViewerModalOpen(false);
    // Clean up blob URL if it exists
    if (pdfViewerBlobUrl) {
      URL.revokeObjectURL(pdfViewerBlobUrl);
      setPdfViewerBlobUrl(null);
    }
    // Clear state after a delay to allow modal to close smoothly
    setTimeout(() => {
      setPdfViewerUrl(null);
      setPdfViewerFileName(null);
    }, 300);
  };


  // Fetch investigation requests for a patient
  const fetchInvestigationRequests = async (patientId) => {
    if (loadingRequests[patientId]) return;
    
    setLoadingRequests(prev => ({ ...prev, [patientId]: true }));
    
    try {
      const result = await investigationService.getInvestigationRequests(patientId);
      if (result.success && result.data) {
        const requests = Array.isArray(result.data) ? result.data : (result.data.requests || []);
        
        // Find MRI, BIOPSY, and TRUS requests
        const requestMap = {};
        requests.forEach(req => {
          const name = (req.investigationName || req.investigation_name || '').toUpperCase();
          if (name === 'MRI') requestMap.mri = req.id;
          else if (name === 'BIOPSY') requestMap.biopsy = req.id;
          else if (name === 'TRUS') requestMap.trus = req.id;
        });
        
        setInvestigationRequests(prev => ({
          ...prev,
          [patientId]: requestMap
        }));
      }
    } catch (error) {
      console.error('Error fetching investigation requests:', error);
    } finally {
      setLoadingRequests(prev => ({ ...prev, [patientId]: false }));
    }
  };

  // Fetch test results for a patient
  const fetchTestResults = async (patientId) => {
    try {
      const result = await investigationService.getInvestigationResults(patientId);
      if (result.success) {
        const results = Array.isArray(result.data) 
          ? result.data 
          : (result.data.results || result.data.investigations || []);
        
        // Find MRI, BIOPSY, and TRUS results - only match exact test names
        // This ensures custom tests like "MRI PELVIS" don't match the standard "MRI" column
        const resultMap = {};
        results.forEach(res => {
          const name = (res.testName || res.test_name || res.testType || res.test_type || '').toUpperCase().trim();
          // Only match exact test names to avoid matching custom tests like "MRI PELVIS"
          if (name === 'MRI') {
            resultMap.mri = res;
          } else if (name === 'BIOPSY') {
            resultMap.biopsy = res;
          } else if (name === 'TRUS') {
            resultMap.trus = res;
          }
        });
        
        setTestResults(prev => ({
          ...prev,
          [patientId]: resultMap
        }));
      }
    } catch (error) {
      console.error('Error fetching test results:', error);
    }
  };

  // Listen for investigation status updates
  useEffect(() => {
    const handleInvestigationStatusUpdate = (event) => {
      console.log('Investigation status updated event received:', event.detail);
      // Refresh investigations to reflect updated status
      fetchInvestigations();
    };

    window.addEventListener('investigationStatusUpdated', handleInvestigationStatusUpdate);
    
    return () => {
      window.removeEventListener('investigationStatusUpdated', handleInvestigationStatusUpdate);
    };
  }, []);

  // Listen for test result added events to refresh data
  useEffect(() => {
    const handleTestResultAdded = async (event) => {
      console.log('Test result added event received:', event.detail);
      const { patientId } = event.detail || {};
      
      // Show brief loading indicator and refresh investigations data
      setLoadingInvestigations(true);
      await fetchInvestigations();
      
      // Also refresh test results for the specific patient if patientId is provided
      if (patientId) {
        await fetchTestResults(patientId);
      }
    };

    window.addEventListener('testResultAdded', handleTestResultAdded);
    
    return () => {
      window.removeEventListener('testResultAdded', handleTestResultAdded);
    };
  }, []);

  // Ensure main test requests (MRI, TRUS, Biopsy) exist for a patient
  const ensureMainTestRequests = useCallback(async (patientId) => {
    if (!patientId) return;

    try {
      // Fetch existing investigation requests for this patient
      const requestsResult = await investigationService.getInvestigationRequests(patientId);
      const existingRequests = requestsResult.success 
        ? (Array.isArray(requestsResult.data) 
            ? requestsResult.data 
            : (requestsResult.data?.requests || []))
        : [];

      const mainTests = ['MRI', 'TRUS', 'Biopsy'];
      const testsToCreate = [];

      // Check which tests need to be created
      for (const testName of mainTests) {
        const testNameUpper = testName.toUpperCase();
        const existingRequest = existingRequests.find(req => {
          const reqName = (req.investigationName || req.investigation_name || '').toUpperCase();
          return reqName === testNameUpper || reqName.includes(testNameUpper) || testNameUpper.includes(reqName);
        });

        if (!existingRequest) {
          testsToCreate.push(testName);
        }
      }

      // Create missing investigation requests
      if (testsToCreate.length > 0) {
        console.log('🔍 InvestigationManagement: Auto-creating investigation requests for:', testsToCreate, 'for patient:', patientId);

        for (const testName of testsToCreate) {
          try {
            const result = await investigationService.createInvestigationRequest(patientId, {
              investigationType: 'clinical_investigation',
              testNames: [testName],
              priority: 'routine',
              notes: 'Automatically created when investigation appointment was booked',
              scheduledDate: null, // Don't set a date - this makes it a request, not an appointment
              scheduledTime: null
            });

            if (result.success) {
              console.log(`✅ Auto-created investigation request for ${testName}`);
            } else {
              console.error(`❌ Failed to auto-create investigation request for ${testName}:`, result.error);
            }
          } catch (error) {
            console.error(`❌ Exception auto-creating investigation request for ${testName}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error ensuring main test requests:', error);
    }
  }, []);

  // Listen for investigation booked events to refresh data
  useEffect(() => {
    const handleInvestigationBooked = async (event) => {
      console.log('Investigation booked event received:', event.detail);
      const { patientId } = event.detail || {};
      
      // Automatically create investigation requests for MRI, TRUS, and Biopsy if they don't exist
      if (patientId) {
        await ensureMainTestRequests(patientId);
      }
      
      // Show brief loading indicator and refresh investigations data
      setLoadingInvestigations(true);
      fetchInvestigations();
    };

    window.addEventListener('investigationBooked', handleInvestigationBooked);
    
    return () => {
      window.removeEventListener('investigationBooked', handleInvestigationBooked);
    };
  }, [ensureMainTestRequests]);

  // Listen for PSA update events to refresh investigations data
  useEffect(() => {
    const handlePSAUpdated = (event) => {
      console.log('PSA updated event received, refreshing investigations:', event.detail);
      // Show brief loading indicator and refresh investigations data
      setLoadingInvestigations(true);
      fetchInvestigations();
    };

    window.addEventListener('psaResultAdded', handlePSAUpdated);
    window.addEventListener('psaResultUpdated', handlePSAUpdated);
    
    return () => {
      window.removeEventListener('psaResultAdded', handlePSAUpdated);
      window.removeEventListener('psaResultUpdated', handlePSAUpdated);
    };
  }, []);

  // Listen for patient updated events to refresh investigations data
  useEffect(() => {
    const handlePatientUpdated = (event) => {
      console.log('Patient updated event received, refreshing investigations:', event.detail);
      // Refresh investigations to show updated patient information (e.g., name changes)
      fetchInvestigations();
    };

    window.addEventListener('patient:updated', handlePatientUpdated);
    
    return () => {
      window.removeEventListener('patient:updated', handlePatientUpdated);
    };
  }, []);

  // Get initials from name
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Format date for display (DD/MM/YYYY format)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      let date;
      if (typeof dateString === 'string') {
        // If it's already in YYYY-MM-DD format, parse it directly
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateString.split('-');
          date = new Date(year, month - 1, day);
        } else {
          date = new Date(dateString);
        }
      } else {
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return dateString;
      }
      
      // Format as DD/MM/YYYY
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Date formatting error:', error, 'Input:', dateString);
      return dateString;
    }
  };

  // Format time for display (HH:MM AM/PM format)
  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      // If timeString is already in HH:MM format, convert to 12-hour format
      if (timeString.match(/^\d{2}:\d{2}$/)) {
        const [hours, minutes] = timeString.split(':');
        const hour24 = parseInt(hours, 10);
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
        const ampm = hour24 >= 12 ? 'PM' : 'AM';
        return `${hour12}:${minutes} ${ampm}`;
      }
      return timeString;
    } catch (error) {
      console.error('Time formatting error:', error, 'Input:', timeString);
      return timeString;
    }
  };

  // Get PSA color based on threshold
  const getPSAColor = (psaValue) => {
    const psa = parseFloat(psaValue);
    if (isNaN(psa)) return { dotColor: 'bg-gray-400', textColor: 'text-gray-900' };
    
    if (psa > 4) {
      return { dotColor: 'bg-red-500', textColor: 'text-gray-900' };
    } else {
      return { dotColor: 'bg-green-500', textColor: 'text-gray-900' };
    }
  };

  // Get status icon for investigation procedures
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'not_required':
        return (
          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  // Get status text for tooltip
  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'not_required':
        return 'Not Required';
      default:
        return 'Not Completed';
    }
  };

  // Filter investigations based on search
  const filteredInvestigations = investigations.filter(investigation => {
    const matchesSearch = investigation.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         investigation.upi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         investigation.urologist.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Handle test status update
  const handleStatusUpdate = async (patientId, testType, newStatus) => {
    const requestMap = investigationRequests[patientId];
    if (!requestMap || !requestMap[testType]) {
      // Try to fetch requests first
      await fetchInvestigationRequests(patientId);
      // Wait a bit and try again
      setTimeout(async () => {
        const updatedMap = investigationRequests[patientId];
        if (updatedMap && updatedMap[testType]) {
          await updateStatus(updatedMap[testType], newStatus, patientId, testType);
        } else {
          console.error('Investigation request not found for', testType);
        }
      }, 500);
      return;
    }
    
    await updateStatus(requestMap[testType], newStatus, patientId, testType);
  };

  const updateStatus = async (requestId, newStatus, patientId, testType) => {
    try {
      const result = await investigationService.updateInvestigationRequestStatus(requestId, newStatus);
      if (result.success) {
        // Refresh investigations
        fetchInvestigations();
        
        // Trigger event
        window.dispatchEvent(new CustomEvent('investigationStatusUpdated', {
          detail: {
            patientId,
            testName: testType.toUpperCase(),
            status: newStatus
          }
        }));
      } else {
        console.error('Failed to update status:', result.error);
        alert('Failed to update status: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  // Handle upload result
  const handleUploadResult = async (patientId, testType) => {
    // Find the investigation object for this patient
    const investigation = investigations.find(inv => inv.id === patientId);
    if (!investigation) return;
    
    // Fetch requests if not already loaded
    if (!investigationRequests[patientId]) {
      await fetchInvestigationRequests(patientId);
    }
    
    // Fetch existing test results if not already loaded
    if (!testResults[patientId]) {
      await fetchTestResults(patientId);
    }
    
    const requestMap = investigationRequests[patientId] || {};
    const requestId = requestMap[testType];
    
    // Get existing test result for this test type
    const existingResult = testResults[patientId]?.[testType] || null;
    
    // Create a mock investigation request object
    const investigationRequest = {
      id: requestId,
      investigationName: testType.toUpperCase(),
      investigation_name: testType.toUpperCase(),
      testType: testType
    };
    
    // Create patient object for the modal
    const patientForModal = {
      id: investigation.id,
      name: investigation.patientName,
      fullName: investigation.patientName
    };
    
    setSelectedInvestigationRequest(investigationRequest);
    setSelectedPatientForUpload(patientForModal);
    setSelectedExistingResult(existingResult);
    setIsAddResultModalOpen(true);
  };

  // Handle view result
  const handleViewResult = (filePath) => {
    if (filePath) {
      investigationService.viewFile(filePath);
    }
  };

  // Handle result added successfully
  const handleResultAdded = (message, requestId) => {
    // Refresh investigations
    fetchInvestigations();
    
    // Refresh test results for the patient who just uploaded
    if (selectedPatientForUpload && selectedPatientForUpload.id) {
      fetchTestResults(selectedPatientForUpload.id);
    }
    
    // Trigger event
    window.dispatchEvent(new CustomEvent('testResultAdded', {
      detail: { requestId }
    }));
  };

  // Handle patient actions
  const handleViewEdit = async (patient) => {
    // Fetch full patient details to ensure all fields are available
    if (patient.id) {
      try {
        const result = await patientService.getPatientById(patient.id);
        if (result.success && result.data) {
          // Preserve investigation statuses (mri, trus, biopsy) and appointment date from investigation management
          setSelectedPatient({
            ...result.data,
            fullName: result.data.fullName || `${result.data.firstName || result.data.first_name || ''} ${result.data.lastName || result.data.last_name || ''}`.trim(),
            // Preserve investigation statuses from the investigation management data
            mri: patient.mri || result.data.mri,
            trus: patient.trus || result.data.trus,
            biopsy: patient.biopsy || result.data.biopsy,
            mriStatus: patient.mri || result.data.mri,
            trusStatus: patient.trus || result.data.trus,
            biopsyStatus: patient.biopsy || result.data.biopsy,
            // Preserve appointment date from investigation management
            appointmentDate: patient.appointmentDate || result.data.appointmentDate,
            appointmentTime: patient.appointmentTime || result.data.appointmentTime
          });
        } else {
          setSelectedPatient(patient);
        }
      } catch (error) {
        console.error('Error fetching patient details:', error);
        setSelectedPatient(patient);
      }
    } else {
      setSelectedPatient(patient);
    }
    setIsPatientDetailsModalOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <NurseHeader 
          title="Investigation Management"
          subtitle="Track and manage all patient investigations and their status"
          onSearch={setSearchQuery}
          searchPlaceholder="Search by name"
        />

        {/* Investigations Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                All Investigations ({filteredInvestigations.length})
              </h2>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-teal-100 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-600">Completed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-600">Not Required</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-600">Not Completed</span>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs w-[30%]">
                    PATIENT
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-600 text-xs w-[18%]">
                    APPOINTMENT
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-600 text-xs w-[18%]">
                    UROLOGIST
                  </th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600 text-xs w-[12%]">
                    <div className="flex justify-center items-center">MRI</div>
                  </th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600 text-xs w-[12%]">
                    <div className="flex justify-center items-center">BIOPSY</div>
                  </th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600 text-xs w-[12%]">
                    <div className="flex justify-center items-center">TRUS</div>
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-gray-600 text-xs w-[18%]">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingInvestigations ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                        <span className="text-gray-600 text-sm">Loading investigations...</span>
                      </div>
                    </td>
                  </tr>
                ) : investigationsError ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8">
                      <div className="text-red-600 text-sm mb-2">{investigationsError}</div>
                      <button
                        onClick={fetchInvestigations}
                        className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : filteredInvestigations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500 text-sm">
                      {investigations.length === 0 
                        ? 'No investigations found' 
                        : 'No investigations found matching your criteria'}
                      <div className="text-xs text-gray-400 mt-2">
                        Total investigations: {investigations.length} | Filtered: {filteredInvestigations.length}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInvestigations.map((investigation) => {
                    if (!investigation || !investigation.id) {
                      console.warn('⚠️ Invalid investigation data:', investigation);
                      return null;
                    }
                    return (
                    <tr key={investigation.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {getInitials(investigation.patientName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 text-sm">{investigation.patientName}</div>
                            <div className="text-xs text-gray-600">
                              UPI: {investigation.upi} • {investigation.age} • {investigation.gender}
                            </div>
                            <div className="flex items-center mt-0.5">
                              <div className={`w-1.5 h-1.5 ${getPSAColor(investigation.psa).dotColor} rounded-full mr-1 flex-shrink-0`}></div>
                              <span className={`text-xs ${getPSAColor(investigation.psa).textColor}`}>PSA: {investigation.psa}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-700 text-xs">
                        <div className="font-medium">{formatDate(investigation.appointmentDate)}</div>
                        <div className="text-xs text-gray-500">{formatTime(investigation.appointmentTime)}</div>
                      </td>
                      <td className="py-3 px-3 text-gray-700 text-xs">
                        <div className="truncate">{investigation.urologist}</div>
                      </td>
                      <td className="py-3 px-2">
                        <TestStatusCell
                          investigation={investigation}
                          testType="mri"
                          status={investigation.mri}
                          onFetchRequests={() => fetchInvestigationRequests(investigation.id)}
                          onFetchResults={() => fetchTestResults(investigation.id)}
                          onStatusUpdate={(newStatus) => handleStatusUpdate(investigation.id, 'mri', newStatus)}
                          onUploadResult={() => handleUploadResult(investigation.id, 'mri')}
                          onViewResult={(filePath) => handleViewResult(filePath)}
                          testResult={testResults[investigation.id]?.mri}
                          getStatusIcon={getStatusIcon}
                          getStatusText={getStatusText}
                        />
                      </td>
                      <td className="py-3 px-2">
                        <TestStatusCell
                          investigation={investigation}
                          testType="biopsy"
                          status={investigation.biopsy}
                          onFetchRequests={() => fetchInvestigationRequests(investigation.id)}
                          onFetchResults={() => fetchTestResults(investigation.id)}
                          onStatusUpdate={(newStatus) => handleStatusUpdate(investigation.id, 'biopsy', newStatus)}
                          onUploadResult={() => handleUploadResult(investigation.id, 'biopsy')}
                          onViewResult={(filePath) => handleViewResult(filePath)}
                          testResult={testResults[investigation.id]?.biopsy}
                          getStatusIcon={getStatusIcon}
                          getStatusText={getStatusText}
                        />
                      </td>
                      <td className="py-3 px-2">
                        <TestStatusCell
                          investigation={investigation}
                          testType="trus"
                          status={investigation.trus}
                          onFetchRequests={() => fetchInvestigationRequests(investigation.id)}
                          onFetchResults={() => fetchTestResults(investigation.id)}
                          onStatusUpdate={(newStatus) => handleStatusUpdate(investigation.id, 'trus', newStatus)}
                          onUploadResult={() => handleUploadResult(investigation.id, 'trus')}
                          onViewResult={(filePath) => handleViewResult(filePath)}
                          testResult={testResults[investigation.id]?.trus}
                          getStatusIcon={getStatusIcon}
                          getStatusText={getStatusText}
                        />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleViewEdit(investigation)}
                          className="px-3 py-1.5 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors flex items-center space-x-1 mx-auto whitespace-nowrap"
                        >
                          <FiEye className="w-3 h-3" />
                          <span>View/Edit</span>
                        </button>
                      </td>
                    </tr>
                    );
                  }).filter(Boolean)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Patient Details Modal */}
      <NursePatientDetailsModal 
        isOpen={isPatientDetailsModalOpen}
        onClose={() => setIsPatientDetailsModalOpen(false)}
        patient={selectedPatient}
        onPatientUpdated={(updatedPatient) => {
          // Refresh the investigations list to show updated patient information
          fetchInvestigations();
        }}
      />

      {/* Add Investigation Result Modal */}
      {selectedInvestigationRequest && selectedPatientForUpload && (
        <AddInvestigationResultModal
          isOpen={isAddResultModalOpen}
          onClose={() => {
            setIsAddResultModalOpen(false);
            setSelectedInvestigationRequest(null);
            setSelectedPatientForUpload(null);
            setSelectedExistingResult(null);
          }}
          investigationRequest={selectedInvestigationRequest}
          patient={selectedPatientForUpload}
          existingResult={selectedExistingResult}
          onSuccess={handleResultAdded}
          onStatusUpdate={(newStatus) => {
            if (selectedInvestigationRequest.testType && selectedPatientForUpload?.id) {
              handleStatusUpdate(selectedPatientForUpload.id, selectedInvestigationRequest.testType, newStatus);
            }
            setIsAddResultModalOpen(false);
            setSelectedInvestigationRequest(null);
            setSelectedPatientForUpload(null);
            setSelectedExistingResult(null);
          }}
        />
      )}

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={isPDFViewerModalOpen}
        onClose={handleClosePDFViewer}
        pdfUrl={pdfViewerUrl}
        fileName={pdfViewerFileName}
      />
    </div>
  );
};

// Test Status Cell Component
const TestStatusCell = ({
  investigation,
  testType,
  status,
  onFetchRequests,
  onFetchResults,
  onStatusUpdate,
  onUploadResult,
  onViewResult,
  testResult,
  getStatusIcon,
  getStatusText
}) => {
  // Only consider it a valid result if there's an actual file path, not just any result value
  const hasResult = testResult && (testResult.filePath || testResult.file_path);

  // If marked as not required, show status icon (but allow clicking to change status)
  const isNotRequired = status === 'not_required';

  // Determine what to show based on status
  // Priority: Use status from investigation data first, only use hasResult as fallback if status is truly null/undefined
  // Don't infer 'completed' from hasResult if status is explicitly set to something else
  const displayStatus = status !== null && status !== undefined 
    ? status 
    : (hasResult ? 'completed' : null);
  const statusIcon = getStatusIcon(displayStatus || 'pending');
  const statusText = getStatusText(displayStatus || 'pending');

  const handleIconClick = (e) => {
    e.stopPropagation();
    
    // Always open the modal when clicking on status icon
    // This allows viewing/editing existing results or uploading new ones
    onFetchRequests();
    onFetchResults();
    onUploadResult();
  };

  return (
    <div className="flex justify-center items-center">
      {/* Status Icon or Plus Icon - Clickable to open modal or view result */}
      <div className="flex items-center justify-center">
        {isNotRequired ? (
          <button
            onClick={handleIconClick}
            className="p-1 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
            title="Click to change status"
          >
            {getStatusIcon('not_required')}
          </button>
        ) : displayStatus === 'completed' || (displayStatus === null && hasResult) ? (
          // Show checkmark only if status is explicitly 'completed' OR if status is null and we have a valid result file
          <button
            onClick={handleIconClick}
            className="p-1 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
            title={hasResult ? "Click to view result" : "Click to manage result"}
          >
            {getStatusIcon('completed')}
          </button>
        ) : (
          // No status set, pending, or results_awaited - show plus icon
          <button
            onClick={handleIconClick}
            className="p-2 text-teal-600 hover:text-teal-800 transition-colors rounded-full hover:bg-teal-50"
            title="Click to upload result or set status"
          >
            <FiPlus className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default InvestigationManagement;
