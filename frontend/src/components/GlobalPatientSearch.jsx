import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiUser } from 'react-icons/fi';
import { IoClose } from 'react-icons/io5';
import { patientService } from '../services/patientService';

const GlobalPatientSearch = ({ placeholder = "Search patients by name, UPI, or status", onPatientSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const debounceTimer = useRef(null);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await patientService.searchPatients(searchQuery, 10);
        if (result.success) {
          setSuggestions(result.data || []);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error searching patients:', error);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectPatient(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Handle patient selection
  const handleSelectPatient = (patient) => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    if (onPatientSelect) {
      onPatientSelect(patient);
    }
  };

  // Clear search
  const handleClear = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Get pathway badge color
  const getPathwayColor = (pathway) => {
    const colors = {
      'New Patient': 'bg-blue-100 text-blue-700',
      'Investigation Pathway': 'bg-purple-100 text-purple-700',
      'Surgery Pathway': 'bg-orange-100 text-orange-700',
      'Post-op Transfer': 'bg-pink-100 text-pink-700',
      'Post-op Followup': 'bg-pink-100 text-pink-700',
      'Active Monitoring': 'bg-green-100 text-green-700',
      'Discharge': 'bg-gray-100 text-gray-700'
    };
    return colors[pathway] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="relative flex-1" ref={searchRef}>
      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
      <input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
      />
      {searchQuery && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
        >
          <IoClose className="text-lg" />
        </button>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {loading ? (
            <div className="px-4 py-3 text-center text-gray-500 text-sm">
              Searching...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-3 text-center text-gray-500 text-sm">
              No patients found
            </div>
          ) : (
            <ul>
              {suggestions.map((patient, index) => (
                <li
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient)}
                  className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-teal-50 transition-colors ${
                    index === selectedIndex ? 'bg-teal-50 border-l-4 border-l-teal-600' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <FiUser className="text-teal-600 text-lg" />
                    </div>
                    
                    {/* Patient Info */}
                    <div className="flex-1 min-w-0">
                      {/* Name and Pathway Badge */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {patient.name}
                        </span>
                        {patient.carePathway && (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center justify-center ${getPathwayColor(patient.carePathway)}`}>
                            {patient.carePathway}
                          </span>
                        )}
                      </div>
                      
                      {/* UPI Line */}
                      <div className="mb-1">
                        <span className="text-xs text-gray-600">
                          UPI: <span className="font-semibold text-gray-900">{patient.upi}</span>
                        </span>
                      </div>
                      
                      {/* Patient Details */}
                      <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                        <span>Age: <span className="font-medium text-gray-900">{patient.age}</span></span>
                        <span className="text-gray-400">•</span>
                        <span className="font-medium text-gray-900">{patient.gender}</span>
                        {patient.assignedUrologist && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="font-medium text-gray-900">{patient.assignedUrologist}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalPatientSearch;

