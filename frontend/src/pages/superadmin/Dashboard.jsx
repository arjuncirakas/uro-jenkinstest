import React, { useState } from 'react';
import { UserPlus, Stethoscope, Activity, Users } from 'lucide-react';
import AddNurseModal from '../../components/modals/AddNurseModal';
import AddGPModal from '../../components/modals/AddGPModal';
import AddUrologistModal from '../../components/modals/AddUrologistModal';

const Dashboard = () => {
  const [showNurseModal, setShowNurseModal] = useState(false);
  const [showGPModal, setShowGPModal] = useState(false);
  const [showUrologistModal, setShowUrologistModal] = useState(false);

  const handleNurseSuccess = () => {
    setShowNurseModal(false);
    // Optionally refresh data or show success message
  };

  const handleGPSuccess = () => {
    setShowGPModal(false);
    // Optionally refresh data or show success message
  };

  const handleUrologistSuccess = () => {
    setShowUrologistModal(false);
    // Optionally refresh data or show success message
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Superadmin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add new medical professionals to the system
        </p>
      </div>

      {/* Three Main Action Buttons */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* Nurses Button */}
        <button
          onClick={() => setShowNurseModal(true)}
          className="bg-white p-8 rounded-lg border-2 border-gray-200 hover:border-teal-500 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          <div className="flex flex-col items-center text-center">
            <div className="rounded-lg inline-flex p-4 bg-teal-50 mb-4">
              <Stethoscope className="h-12 w-12 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nurses
            </h3>
            <p className="text-sm text-gray-500">
              Add a new nurse to the users table
            </p>
          </div>
        </button>

        {/* GP's Button */}
        <button
          onClick={() => setShowGPModal(true)}
          className="bg-white p-8 rounded-lg border-2 border-gray-200 hover:border-teal-500 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          <div className="flex flex-col items-center text-center">
            <div className="rounded-lg inline-flex p-4 bg-teal-50 mb-4">
              <Activity className="h-12 w-12 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              GP's
            </h3>
            <p className="text-sm text-gray-500">
              Add a new General Practitioner to the users table
            </p>
          </div>
        </button>

        {/* Urologists Button */}
        <button
          onClick={() => setShowUrologistModal(true)}
          className="bg-white p-8 rounded-lg border-2 border-gray-200 hover:border-teal-500 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          <div className="flex flex-col items-center text-center">
            <div className="rounded-lg inline-flex p-4 bg-teal-50 mb-4">
              <Users className="h-12 w-12 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Urologists
            </h3>
            <p className="text-sm text-gray-500">
              Add a new urologist to the doctors table
            </p>
          </div>
        </button>
      </div>

      {/* Modalss */}
      <AddNurseModal
        isOpen={showNurseModal}
        onClose={() => setShowNurseModal(false)}
        onSuccess={handleNurseSuccess}
      />

      <AddGPModal
        isOpen={showGPModal}
        onClose={() => setShowGPModal(false)}
        onSuccess={handleGPSuccess}
      />

      <AddUrologistModal
        isOpen={showUrologistModal}
        onClose={() => setShowUrologistModal(false)}
        onSuccess={handleUrologistSuccess}
      />
    </div>
  );
};

export default Dashboard;
