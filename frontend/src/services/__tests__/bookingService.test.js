import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bookingService } from '../bookingService.js';
import apiClient from '../../config/axios.js';

// Mock apiClient
vi.mock('../../config/axios.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}));

describe('bookingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('bookUrologistAppointment', () => {
    it('should book urologist appointment successfully', async () => {
      const patientId = 1;
      const appointmentData = {
        urologistId: 1,
        date: '2024-01-01',
        time: '10:00'
      };

      const mockResponse = {
        data: {
          data: { id: 1, patient_id: patientId, ...appointmentData }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await bookingService.bookUrologistAppointment(patientId, appointmentData);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/booking/patients/${patientId}/appointments`,
        appointmentData
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, patient_id: patientId, ...appointmentData });
    });

    it('should handle errors with response data', async () => {
      const patientId = 1;
      const appointmentData = { urologistId: 1 };
      const mockError = {
        response: {
          data: {
            message: 'Slot not available',
            errors: ['Time slot is already booked']
          },
          status: 400,
          headers: {}
        },
        message: 'Request failed'
      };

      apiClient.post.mockRejectedValue(mockError);

      const result = await bookingService.bookUrologistAppointment(patientId, appointmentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Slot not available');
      expect(result.details).toEqual(['Time slot is already booked']);
    });

    it('should handle errors without response', async () => {
      const patientId = 1;
      const appointmentData = { urologistId: 1 };
      const mockError = {
        message: 'Network error'
      };

      apiClient.post.mockRejectedValue(mockError);

      const result = await bookingService.bookUrologistAppointment(patientId, appointmentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('updateAppointment', () => {
    it('should update appointment successfully', async () => {
      const appointmentId = 1;
      const appointmentData = { date: '2024-01-02', time: '11:00' };

      const mockResponse = {
        data: {
          data: { id: appointmentId, ...appointmentData }
        }
      };

      apiClient.put.mockResolvedValue(mockResponse);

      const result = await bookingService.updateAppointment(appointmentId, appointmentData);

      expect(apiClient.put).toHaveBeenCalledWith(
        `/booking/appointments/${appointmentId}`,
        appointmentData
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const appointmentId = 1;
      const appointmentData = { date: '2024-01-02' };
      const mockError = {
        response: {
          data: {
            message: 'Appointment not found',
            errors: []
          }
        },
        message: 'Not found'
      };

      apiClient.put.mockRejectedValue(mockError);

      const result = await bookingService.updateAppointment(appointmentId, appointmentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Appointment not found');
    });
  });

  describe('bookInvestigation', () => {
    it('should book investigation successfully', async () => {
      const patientId = 1;
      const investigationData = {
        investigationType: 'PSA',
        date: '2024-01-01'
      };

      const mockResponse = {
        data: {
          data: { id: 1, patient_id: patientId, ...investigationData }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await bookingService.bookInvestigation(patientId, investigationData);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/booking/patients/${patientId}/investigations`,
        investigationData
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const patientId = 1;
      const investigationData = { investigationType: 'PSA' };
      const mockError = {
        response: {
          data: {
            message: 'Failed to book',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.post.mockRejectedValue(mockError);

      const result = await bookingService.bookInvestigation(patientId, investigationData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to book');
    });
  });

  describe('getPatientAppointments', () => {
    it('should get patient appointments without type', async () => {
      const patientId = 1;
      const mockResponse = {
        data: {
          data: [{ id: 1, patient_id: patientId }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getPatientAppointments(patientId);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/booking/patients/${patientId}/appointments`,
        { params: {} }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, patient_id: patientId }]);
    });

    it('should get patient appointments with type', async () => {
      const patientId = 1;
      const type = 'urologist';
      const mockResponse = {
        data: {
          data: [{ id: 1, type: 'urologist' }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getPatientAppointments(patientId, type);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/booking/patients/${patientId}/appointments`,
        { params: { type } }
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const patientId = 1;
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.get.mockRejectedValue(mockError);

      const result = await bookingService.getPatientAppointments(patientId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
    });
  });

  describe('getPatientInvestigationBookings', () => {
    it('should get patient investigation bookings without type', async () => {
      const patientId = 1;
      const mockResponse = {
        data: {
          data: [{ id: 1, type: 'PSA' }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getPatientInvestigationBookings(patientId);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/booking/patients/${patientId}/investigation-bookings`,
        { params: {} }
      );
      expect(result.success).toBe(true);
    });

    it('should get patient investigation bookings with type', async () => {
      const patientId = 1;
      const type = 'PSA';
      const mockResponse = {
        data: {
          data: [{ id: 1, type: 'PSA' }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getPatientInvestigationBookings(patientId, type);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/booking/patients/${patientId}/investigation-bookings`,
        { params: { type } }
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const patientId = 1;
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.get.mockRejectedValue(mockError);

      const result = await bookingService.getPatientInvestigationBookings(patientId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
    });
  });

  describe('getAvailableUrologists', () => {
    it('should get available urologists successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            urologists: [{ id: 1, name: 'Dr. Smith' }]
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getAvailableUrologists();

      expect(apiClient.get).toHaveBeenCalledWith('/booking/urologists');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, name: 'Dr. Smith' }]);
    });

    it('should return empty array when urologists is missing', async () => {
      const mockResponse = {
        data: {
          data: {}
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getAvailableUrologists();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.get.mockRejectedValue(mockError);

      const result = await bookingService.getAvailableUrologists();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
    });
  });

  describe('getAvailableGPs', () => {
    it('should get available GPs successfully with array data', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 1, name: 'Dr. GP' }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getAvailableGPs();

      expect(apiClient.get).toHaveBeenCalledWith('/gp?is_active=true');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, name: 'Dr. GP' }]);
    });

    it('should handle non-array data', async () => {
      const mockResponse = {
        data: {
          data: { id: 1, name: 'Dr. GP' }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getAvailableGPs();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle errors with error field', async () => {
      const mockError = {
        response: {
          data: {
            error: 'Failed to fetch',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.get.mockRejectedValue(mockError);

      const result = await bookingService.getAvailableGPs();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
    });

    it('should handle errors with message field', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.get.mockRejectedValue(mockError);

      const result = await bookingService.getAvailableGPs();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
    });

    it('should handle errors without response', async () => {
      const mockError = {
        message: 'Network error'
      };

      apiClient.get.mockRejectedValue(mockError);

      const result = await bookingService.getAvailableGPs();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getAvailableDoctors', () => {
    it('should get available doctors successfully', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 1, name: 'Dr. Doctor' }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getAvailableDoctors();

      expect(apiClient.get).toHaveBeenCalledWith('/booking/doctors');
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.get.mockRejectedValue(mockError);

      const result = await bookingService.getAvailableDoctors();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
    });
  });

  describe('getTodaysAppointments', () => {
    it('should get today\'s appointments without type', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 1, date: '2024-01-01' }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getTodaysAppointments();

      expect(apiClient.get).toHaveBeenCalledWith('/booking/appointments/today', { params: {} });
      expect(result.success).toBe(true);
    });

    it('should get today\'s appointments with type', async () => {
      const type = 'urologist';
      const mockResponse = {
        data: {
          data: [{ id: 1, type: 'urologist' }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getTodaysAppointments(type);

      expect(apiClient.get).toHaveBeenCalledWith('/booking/appointments/today', { params: { type } });
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.get.mockRejectedValue(mockError);

      const result = await bookingService.getTodaysAppointments();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
    });
  });

  describe('getNoShowPatients', () => {
    it('should get no-show patients without type', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 1, no_show: true }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getNoShowPatients();

      expect(apiClient.get).toHaveBeenCalledWith('/booking/no-show-patients', { params: {} });
      expect(result.success).toBe(true);
    });

    it('should get no-show patients with type', async () => {
      const type = 'urologist';
      const mockResponse = {
        data: {
          data: [{ id: 1, type: 'urologist' }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getNoShowPatients(type);

      expect(apiClient.get).toHaveBeenCalledWith('/booking/no-show-patients', { params: { type } });
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.get.mockRejectedValue(mockError);

      const result = await bookingService.getNoShowPatients();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
    });
  });

  describe('markAsNoShow', () => {
    it('should mark appointment as no-show successfully', async () => {
      const appointmentId = 1;
      const noShowData = { reason: 'Patient did not arrive' };

      const mockResponse = {
        data: {
          data: { id: appointmentId, no_show: true, ...noShowData }
        }
      };

      apiClient.put.mockResolvedValue(mockResponse);

      const result = await bookingService.markAsNoShow(appointmentId, noShowData);

      expect(apiClient.put).toHaveBeenCalledWith(
        `/booking/appointments/${appointmentId}/no-show`,
        noShowData
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const appointmentId = 1;
      const noShowData = { reason: 'Test' };
      const mockError = {
        response: {
          data: {
            message: 'Failed to mark',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.put.mockRejectedValue(mockError);

      const result = await bookingService.markAsNoShow(appointmentId, noShowData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to mark');
    });
  });

  describe('addNoShowNote', () => {
    it('should add no-show note successfully', async () => {
      const appointmentId = 1;
      const noteData = { note: 'Patient called to reschedule' };

      const mockResponse = {
        data: {
          data: { id: 1, appointment_id: appointmentId, ...noteData }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await bookingService.addNoShowNote(appointmentId, noteData);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/booking/appointments/${appointmentId}/notes`,
        noteData
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const appointmentId = 1;
      const noteData = { note: 'Test' };
      const mockError = {
        response: {
          data: {
            message: 'Failed to add note',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.post.mockRejectedValue(mockError);

      const result = await bookingService.addNoShowNote(appointmentId, noteData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add note');
    });
  });

  describe('getNoShowNotes', () => {
    it('should get no-show notes successfully', async () => {
      const appointmentId = 1;
      const type = 'urologist';
      const mockResponse = {
        data: {
          data: [{ id: 1, appointment_id: appointmentId, type }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getNoShowNotes(appointmentId, type);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/booking/appointments/${appointmentId}/notes?type=${type}`
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const appointmentId = 1;
      const type = 'urologist';
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.get.mockRejectedValue(mockError);

      const result = await bookingService.getNoShowNotes(appointmentId, type);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
    });
  });

  describe('removeNoShowNote', () => {
    it('should remove no-show note successfully', async () => {
      const noteId = 1;
      const mockResponse = {
        data: { id: noteId }
      };

      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await bookingService.removeNoShowNote(noteId);

      expect(apiClient.delete).toHaveBeenCalledWith(`/booking/notes/${noteId}`);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: noteId });
    });

    it('should handle errors', async () => {
      const noteId = 1;
      const mockError = {
        response: {
          data: {
            message: 'Failed to remove',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.delete.mockRejectedValue(mockError);

      const result = await bookingService.removeNoShowNote(noteId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to remove');
    });
  });

  describe('getAvailableTimeSlots', () => {
    it('should get available time slots successfully', async () => {
      const doctorId = 1;
      const date = '2024-01-01';
      const appointmentType = 'urologist';

      // Mock Date.getTimezoneOffset
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = vi.fn(() => -330); // IST offset

      const mockResponse = {
        data: {
          data: [{ time: '10:00', available: true }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getAvailableTimeSlots(doctorId, date, appointmentType);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/booking/doctors/${doctorId}/available-slots`,
        {
          params: {
            date,
            type: appointmentType,
            timezoneOffset: -330
          }
        }
      );
      expect(result.success).toBe(true);

      // Restore original
      Date.prototype.getTimezoneOffset = originalGetTimezoneOffset;
    });

    it('should handle errors', async () => {
      const doctorId = 1;
      const date = '2024-01-01';
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.get.mockRejectedValue(mockError);

      const result = await bookingService.getAvailableTimeSlots(doctorId, date);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
    });
  });

  describe('rescheduleNoShowAppointment', () => {
    it('should reschedule no-show appointment successfully', async () => {
      const appointmentId = 1;
      const rescheduleData = { date: '2024-01-02', time: '11:00' };

      const mockResponse = {
        data: {
          data: { id: appointmentId, ...rescheduleData }
        }
      };

      apiClient.put.mockResolvedValue(mockResponse);

      const result = await bookingService.rescheduleNoShowAppointment(appointmentId, rescheduleData);

      expect(apiClient.put).toHaveBeenCalledWith(
        `/booking/appointments/${appointmentId}/reschedule`,
        rescheduleData
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const appointmentId = 1;
      const rescheduleData = { date: '2024-01-02' };
      const mockError = {
        response: {
          data: {
            message: 'Failed to reschedule',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.put.mockRejectedValue(mockError);

      const result = await bookingService.rescheduleNoShowAppointment(appointmentId, rescheduleData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to reschedule');
    });
  });

  describe('getAllAppointments', () => {
    it('should get all appointments without filters', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 1 }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getAllAppointments();

      expect(apiClient.get).toHaveBeenCalledWith('/booking/appointments?');
      expect(result.success).toBe(true);
    });

    it('should get all appointments with all filters', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        urologistId: 1,
        search: 'John Doe'
      };

      const mockResponse = {
        data: {
          data: [{ id: 1, patient_name: 'John Doe' }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getAllAppointments(filters);

      expect(apiClient.get).toHaveBeenCalledWith(
        '/booking/appointments?startDate=2024-01-01&endDate=2024-01-31&urologistId=1&search=John+Doe'
      );
      expect(result.success).toBe(true);
    });

    it('should trim search query', async () => {
      const filters = {
        search: '  John Doe  '
      };

      const mockResponse = {
        data: {
          data: []
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getAllAppointments(filters);

      expect(apiClient.get).toHaveBeenCalledWith('/booking/appointments?search=John+Doe');
      expect(result.success).toBe(true);
    });

    it('should not include empty search in params', async () => {
      const filters = {
        search: '   '
      };

      const mockResponse = {
        data: {
          data: []
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getAllAppointments(filters);

      expect(apiClient.get).toHaveBeenCalledWith('/booking/appointments?');
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.get.mockRejectedValue(mockError);

      const result = await bookingService.getAllAppointments();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
    });
  });

  describe('updateAppointmentStatus', () => {
    it('should update appointment status successfully', async () => {
      const appointmentId = 1;
      const statusData = { reminderSent: true };

      const mockResponse = {
        data: {
          data: { id: appointmentId, ...statusData }
        }
      };

      apiClient.patch.mockResolvedValue(mockResponse);

      const result = await bookingService.updateAppointmentStatus(appointmentId, statusData);

      expect(apiClient.patch).toHaveBeenCalledWith(
        `/booking/appointments/${appointmentId}/status`,
        statusData
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const appointmentId = 1;
      const statusData = { reminderSent: true };
      const mockError = {
        response: {
          data: {
            message: 'Failed to update',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.patch.mockRejectedValue(mockError);

      const result = await bookingService.updateAppointmentStatus(appointmentId, statusData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update');
    });
  });

  describe('getUpcomingAppointments', () => {
    it('should get upcoming appointments without params', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 1, date: '2024-01-02' }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getUpcomingAppointments();

      expect(apiClient.get).toHaveBeenCalledWith('/booking/appointments/upcoming', { params: {} });
      expect(result.success).toBe(true);
    });

    it('should get upcoming appointments with params', async () => {
      const params = { limit: 10, page: 1 };
      const mockResponse = {
        data: {
          data: [{ id: 1 }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getUpcomingAppointments(params);

      expect(apiClient.get).toHaveBeenCalledWith('/booking/appointments/upcoming', { params });
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.get.mockRejectedValue(mockError);

      const result = await bookingService.getUpcomingAppointments();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
    });
  });

  describe('expirePatient', () => {
    it('should expire patient successfully', async () => {
      const patientId = 1;
      const expireData = { reason: 'Patient expired' };

      const mockResponse = {
        data: {
          data: { id: patientId, expired: true, ...expireData }
        }
      };

      apiClient.put.mockResolvedValue(mockResponse);

      const result = await bookingService.expirePatient(patientId, expireData);

      expect(apiClient.put).toHaveBeenCalledWith(`/patients/${patientId}/expire`, expireData);
      expect(result.success).toBe(true);
    });

    it('should expire patient without data', async () => {
      const patientId = 1;
      const mockResponse = {
        data: {
          data: { id: patientId, expired: true }
        }
      };

      apiClient.put.mockResolvedValue(mockResponse);

      const result = await bookingService.expirePatient(patientId);

      expect(apiClient.put).toHaveBeenCalledWith(`/patients/${patientId}/expire`, {});
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const patientId = 1;
      const expireData = { reason: 'Test' };
      const mockError = {
        response: {
          data: {
            message: 'Failed to expire',
            errors: []
          }
        },
        message: 'Error'
      };

      apiClient.put.mockRejectedValue(mockError);

      const result = await bookingService.expirePatient(patientId, expireData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to expire');
    });
  });
});


