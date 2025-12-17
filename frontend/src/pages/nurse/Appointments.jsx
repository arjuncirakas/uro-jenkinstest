import React, { useState, useEffect } from 'react';
import NurseHeader from '../../components/layout/NurseHeader';
import Calendar from '../../components/Calendar';
import { bookingService } from '../../services/bookingService';

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(null);

  // Fetch appointments data
  const fetchAppointments = async () => {
    setLoadingAppointments(true);
    setAppointmentsError(null);
    
    try {
      const result = await bookingService.getAllAppointments();
      
      if (result.success) {
        // Create a new array reference to ensure React detects the change
        const newAppointments = result.data.appointments || [];
        console.log('Nurse Appointments - Fetched appointments:', newAppointments.length);
        setAppointments(newAppointments);
      } else {
        setAppointmentsError(result.error || 'Failed to fetch appointments');
        console.error('Error fetching appointments:', result.error);
      }
    } catch (error) {
      setAppointmentsError('Failed to fetch appointments');
      console.error('Error fetching appointments:', error);
    } finally {
      setLoadingAppointments(false);
    }
  };

  // Load appointments on component mount
  useEffect(() => {
    fetchAppointments();
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <NurseHeader 
          title="Appointments"
          subtitle="Schedule and manage patient appointments"
          hideSearch={true}
        />

        {/* Calendar Section */}
        <div className="mt-6">
          <Calendar 
            appointments={appointments}
            loadingAppointments={loadingAppointments}
            appointmentsError={appointmentsError}
            onRefresh={fetchAppointments}
          />
        </div>
      </div>
    </div>
  );
};

export default Appointments;
