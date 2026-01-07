import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../../config/axios';
import { investigationService } from '../investigationService';

vi.mock('../../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('investigationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear URL.createObjectURL mock if needed
    global.URL.createObjectURL = vi.fn(() => 'blob:url');
    global.URL.revokeObjectURL = vi.fn();
    global.window.open = vi.fn();
    global.window.dispatchEvent = vi.fn();
  });

  describe('addPSAResult', () => {
    it('should add PSA result successfully', async () => {
      const mockResult = { id: 1 };
      apiClient.post.mockResolvedValueOnce({ data: { success: true, data: mockResult } });

      const result = await investigationService.addPSAResult(1, { psaValue: 5.5, testFile: new File([''], 'test.pdf') });

      expect(result.success).toBe(true);
      expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/psa-results'), expect.any(FormData), expect.any(Object));
    });

    it('should handle errors when adding PSA result', async () => {
      apiClient.post.mockRejectedValueOnce({ response: { data: { message: 'Error' } } });

      const result = await investigationService.addPSAResult(1, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error');
    });
  });

  describe('updatePSAResult', () => {
    it('should update PSA result successfully', async () => {
      apiClient.patch.mockResolvedValueOnce({ data: { success: true, data: {} } });
      const result = await investigationService.updatePSAResult(1, { psaValue: 6.0 });
      expect(result.success).toBe(true);
    });
  });

  describe('addOtherTestResult', () => {
    it('should add other test result successfully', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { success: true, data: {} } });
      const result = await investigationService.addOtherTestResult(1, { testName: 'MRI' });
      expect(result.success).toBe(true);
    });
  });

  describe('getInvestigationResults', () => {
    it('should get investigation results successfully', async () => {
      apiClient.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
      const result = await investigationService.getInvestigationResults(1);
      expect(result.success).toBe(true);
    });
  });

  describe('deleteInvestigationResult', () => {
    it('should delete investigation result successfully', async () => {
      apiClient.delete.mockResolvedValueOnce({ data: { success: true } });
      const result = await investigationService.deleteInvestigationResult(1);
      expect(result.success).toBe(true);
    });
  });

  describe('getAllInvestigations', () => {
    it('should get all investigations successfully', async () => {
      apiClient.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
      const result = await investigationService.getAllInvestigations({ status: 'pending' });
      expect(result.success).toBe(true);
    });
  });

  describe('createInvestigationRequest', () => {
    it('should create investigation request successfully', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { success: true, data: {} } });
      const result = await investigationService.createInvestigationRequest(1, { investigationType: 'MRI' });
      expect(result.success).toBe(true);
    });
  });

  describe('getInvestigationRequests', () => {
    it('should get investigation requests successfully', async () => {
      apiClient.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
      const result = await investigationService.getInvestigationRequests(1);
      expect(result.success).toBe(true);
    });
  });

  describe('updateInvestigationRequestStatus', () => {
    it('should update investigation request status successfully', async () => {
      apiClient.patch.mockResolvedValueOnce({ data: { success: true, data: {} } });
      const result = await investigationService.updateInvestigationRequestStatus(1, 'completed');
      expect(result.success).toBe(true);
    });
  });

  describe('deleteInvestigationRequest', () => {
    it('should delete investigation request successfully', async () => {
      apiClient.delete.mockResolvedValueOnce({ data: { success: true } });
      const result = await investigationService.deleteInvestigationRequest(1);
      expect(result.success).toBe(true);
    });
  });

  describe('parsePSAFile', () => {
    it('should parse PSA file successfully', async () => {
      const mockFile = new File([''], 'psa.pdf', { type: 'application/pdf' });
      apiClient.post.mockResolvedValueOnce({ data: { success: true, data: { psaEntries: [] } } });

      const result = await investigationService.parsePSAFile(mockFile);

      expect(result.success).toBe(true);
      expect(apiClient.post).toHaveBeenCalledWith('/parse-psa-file', expect.any(FormData), expect.any(Object));
    });

    it('should handle errors when parsing PSA file', async () => {
      const mockFile = new File([''], 'psa.pdf');
      apiClient.post.mockRejectedValueOnce({ response: { data: { message: 'Parse Error' } } });

      const result = await investigationService.parsePSAFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Parse Error');
    });
  });

  describe('addPSAResult', () => {
    it('should skip null and undefined values', async () => {
      const mockResult = { id: 1 };
      apiClient.post.mockResolvedValueOnce({ data: { success: true, data: mockResult } });

      const result = await investigationService.addPSAResult(1, { 
        psaValue: 5.5, 
        nullValue: null, 
        undefinedValue: undefined,
        testFile: new File([''], 'test.pdf')
      });

      expect(result.success).toBe(true);
    });

    it('should handle error without response', async () => {
      apiClient.post.mockRejectedValueOnce({ message: 'Network error' });

      const result = await investigationService.addPSAResult(1, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should include error details', async () => {
      apiClient.post.mockRejectedValueOnce({ 
        response: { data: { message: 'Error', errors: ['Error 1', 'Error 2'] } } 
      });

      const result = await investigationService.addPSAResult(1, {});

      expect(result.success).toBe(false);
      expect(result.details).toEqual(['Error 1', 'Error 2']);
    });
  });

  describe('updatePSAResult', () => {
    it('should skip null and undefined values', async () => {
      apiClient.patch.mockResolvedValueOnce({ data: { success: true, data: {} } });
      const result = await investigationService.updatePSAResult(1, { 
        psaValue: 6.0, 
        nullValue: null, 
        undefinedValue: undefined 
      });
      expect(result.success).toBe(true);
    });

    it('should handle error without response', async () => {
      apiClient.patch.mockRejectedValueOnce({ message: 'Network error' });
      const result = await investigationService.updatePSAResult(1, {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('addOtherTestResult', () => {
    it('should skip null and undefined values', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { success: true, data: {} } });
      const result = await investigationService.addOtherTestResult(1, { 
        testName: 'MRI', 
        nullValue: null, 
        undefinedValue: undefined 
      });
      expect(result.success).toBe(true);
    });

    it('should handle error without response', async () => {
      apiClient.post.mockRejectedValueOnce({ message: 'Network error' });
      const result = await investigationService.addOtherTestResult(1, {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getInvestigationResults', () => {
    it('should get investigation results with testType parameter', async () => {
      apiClient.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
      const result = await investigationService.getInvestigationResults(1, 'PSA');
      expect(result.success).toBe(true);
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/investigations'),
        { params: { testType: 'PSA' } }
      );
    });

    it('should handle error without response', async () => {
      apiClient.get.mockRejectedValueOnce({ message: 'Network error' });
      const result = await investigationService.getInvestigationResults(1);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('deleteInvestigationResult', () => {
    it('should handle error without response', async () => {
      apiClient.delete.mockRejectedValueOnce({ message: 'Network error' });
      const result = await investigationService.deleteInvestigationResult(1);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getAllInvestigations', () => {
    it('should get all investigations with testType filter', async () => {
      apiClient.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
      const result = await investigationService.getAllInvestigations({ testType: 'PSA' });
      expect(result.success).toBe(true);
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('testType=PSA'));
    });

    it('should get all investigations with status filter', async () => {
      apiClient.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
      const result = await investigationService.getAllInvestigations({ status: 'pending' });
      expect(result.success).toBe(true);
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('status=pending'));
    });

    it('should get all investigations with both filters', async () => {
      apiClient.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
      const result = await investigationService.getAllInvestigations({ testType: 'PSA', status: 'pending' });
      expect(result.success).toBe(true);
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('testType=PSA'));
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('status=pending'));
    });

    it('should handle error without response', async () => {
      apiClient.get.mockRejectedValueOnce({ message: 'Network error' });
      const result = await investigationService.getAllInvestigations();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('createInvestigationRequest', () => {
    it('should handle error without response', async () => {
      apiClient.post.mockRejectedValueOnce({ message: 'Network error' });
      const result = await investigationService.createInvestigationRequest(1, {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getInvestigationRequests', () => {
    it('should get investigation requests with status parameter', async () => {
      apiClient.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
      const result = await investigationService.getInvestigationRequests(1, 'pending');
      expect(result.success).toBe(true);
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/investigation-requests'),
        { params: { status: 'pending' } }
      );
    });

    it('should handle error without response', async () => {
      apiClient.get.mockRejectedValueOnce({ message: 'Network error' });
      const result = await investigationService.getInvestigationRequests(1);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('updateInvestigationRequestStatus', () => {
    it('should handle error without response', async () => {
      apiClient.patch.mockRejectedValueOnce({ message: 'Network error' });
      const result = await investigationService.updateInvestigationRequestStatus(1, 'completed');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('deleteInvestigationRequest', () => {
    it('should handle error without response', async () => {
      apiClient.delete.mockRejectedValueOnce({ message: 'Network error' });
      const result = await investigationService.deleteInvestigationRequest(1);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('parsePSAFile', () => {
    it('should handle error without response', async () => {
      const mockFile = new File([''], 'psa.pdf');
      apiClient.post.mockRejectedValueOnce({ message: 'Network error' });

      const result = await investigationService.parsePSAFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle response without psaEntries', async () => {
      const mockFile = new File([''], 'psa.pdf');
      apiClient.post.mockResolvedValueOnce({ data: { success: true, data: {} } });

      const result = await investigationService.parsePSAFile(mockFile);

      expect(result.success).toBe(true);
    });
  });

  describe('viewFile', () => {
    beforeEach(() => {
      vi.stubGlobal('alert', vi.fn());
      vi.stubGlobal('FileReader', class MockFileReader {
        constructor() {
          this.onloadend = null;
          this.onerror = null;
          this.result = null;
        }
        readAsDataURL() {
          setTimeout(() => {
            if (this.onloadend) {
              this.onloadend();
            }
          }, 0);
        }
        abort() {}
      });
    });

    it('should handle file viewing (PDF)', async () => {
      const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
      apiClient.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-type': 'application/pdf' },
        status: 200
      });

      await investigationService.viewFile('uploads/test.pdf');

      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('/test.pdf'), { responseType: 'blob' });
      expect(global.window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'openPDFViewer' }));
    });

    it('should handle file viewing (Image)', async () => {
      const mockBlob = new Blob(['image-content'], { type: 'image/png' });
      apiClient.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-type': 'image/png' },
        status: 200
      });

      // Mock FileReader
      const mockReader = {
        readAsDataURL: vi.fn(),
        onloadend: null,
        result: 'data:image/png;base64,content'
      };
      global.FileReader = vi.fn(() => mockReader);

      // Trigger the process
      const promise = investigationService.viewFile('test.png');

      // Manually trigger onloadend
      await new Promise(resolve => setTimeout(resolve, 10));
      if (mockReader.onloadend) mockReader.onloadend();

      await promise;

      expect(global.window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'openImageViewer' }));
    });

    it('should throw error when no file path provided', async () => {
      await expect(investigationService.viewFile(null)).rejects.toThrow('No file path provided');
    });

    it('should throw error when file path is empty string', async () => {
      await expect(investigationService.viewFile('')).rejects.toThrow('No file path provided');
    });

    it('should normalize path with uploads/ prefix', async () => {
      const mockBlob = new Blob(['content'], { type: 'application/pdf' });
      apiClient.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-type': 'application/pdf' },
        status: 200
      });

      await investigationService.viewFile('uploads/test.pdf');
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('test.pdf'), expect.any(Object));
    });

    it('should normalize path with uploads\\ prefix (backslash)', async () => {
      const mockBlob = new Blob(['content'], { type: 'application/pdf' });
      apiClient.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-type': 'application/pdf' },
        status: 200
      });

      await investigationService.viewFile('uploads\\test.pdf');
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('test.pdf'), expect.any(Object));
    });

    it('should encode path segments separately', async () => {
      const mockBlob = new Blob(['content'], { type: 'application/pdf' });
      apiClient.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-type': 'application/pdf' },
        status: 200
      });

      await investigationService.viewFile('uploads/investigations/test file.pdf');
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('investigations'), expect.any(Object));
    });

    it('should handle 404 and try fallback route', async () => {
      apiClient.get.mockRejectedValueOnce({ response: { status: 404 } }); // first try
      apiClient.get.mockResolvedValueOnce({
        data: new Blob(['content']),
        headers: { 'content-type': 'application/pdf' },
        status: 200
      }); // fallback try

      await investigationService.viewFile('test.pdf');
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });

    it('should handle 404 with fallback route also failing', async () => {
      apiClient.get.mockRejectedValueOnce({ response: { status: 404 } });
      apiClient.get.mockRejectedValueOnce({ response: { status: 404 } });

      await expect(investigationService.viewFile('test.pdf')).rejects.toThrow();
    });

    it('should handle 401 authentication error', async () => {
      apiClient.get.mockRejectedValueOnce({ response: { status: 401 } });

      await expect(investigationService.viewFile('test.pdf')).rejects.toThrow('Authentication error');
    });

    it('should handle 404 file not found error', async () => {
      apiClient.get.mockRejectedValueOnce({ 
        response: { status: 404, data: { message: 'File not found' } } 
      });

      await expect(investigationService.viewFile('test.pdf')).rejects.toThrow('File not found');
    });

    it('should handle empty file blob', async () => {
      const emptyBlob = new Blob([], { type: 'application/pdf' });
      apiClient.get.mockResolvedValueOnce({
        data: emptyBlob,
        headers: { 'content-type': 'application/pdf' },
        status: 200
      });

      await investigationService.viewFile('test.pdf');
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('empty'));
    });

    it('should handle HTML response instead of file', async () => {
      const htmlBlob = new Blob(['<!DOCTYPE html><html></html>'], { type: 'text/html' });
      apiClient.get.mockResolvedValueOnce({
        data: htmlBlob,
        headers: { 'content-type': 'text/html' },
        status: 200
      });

      await investigationService.viewFile('test.pdf');
      expect(window.alert).toHaveBeenCalled();
    });

    it('should handle JSON error response', async () => {
      const jsonBlob = new Blob(['{"success":false,"message":"Error"}'], { type: 'application/json' });
      apiClient.get.mockResolvedValueOnce({
        data: jsonBlob,
        headers: { 'content-type': 'application/json' },
        status: 200
      });

      await investigationService.viewFile('test.pdf');
      expect(window.alert).toHaveBeenCalled();
    });

    it('should handle DOC file type', async () => {
      const mockBlob = new Blob(['doc-content'], { type: 'application/msword' });
      apiClient.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-type': 'application/msword' },
        status: 200
      });

      global.window.open = vi.fn(() => ({ closed: false }));

      await investigationService.viewFile('test.doc');
      expect(global.window.open).toHaveBeenCalled();
    });

    it('should handle DOCX file type', async () => {
      const mockBlob = new Blob(['docx-content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      apiClient.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        status: 200
      });

      global.window.open = vi.fn(() => ({ closed: false }));

      await investigationService.viewFile('test.docx');
      expect(global.window.open).toHaveBeenCalled();
    });

    it('should handle popup blocked for other file types', async () => {
      const mockBlob = new Blob(['content'], { type: 'application/octet-stream' });
      apiClient.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-type': 'application/octet-stream' },
        status: 200
      });

      global.window.open = vi.fn(() => null); // Popup blocked

      const result = await investigationService.viewFile('test.unknown');
      // Should create download link as fallback
      expect(result.success).toBe(true);
      expect(apiClient.get).toHaveBeenCalled();
    });

    it('should handle FileReader error for image', async () => {
      const mockBlob = new Blob(['image-content'], { type: 'image/png' });
      apiClient.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-type': 'image/png' },
        status: 200
      });

      const mockReader = {
        readAsDataURL: vi.fn(),
        onloadend: null,
        onerror: null,
        result: null
      };
      global.FileReader = vi.fn(() => mockReader);

      const promise = investigationService.viewFile('test.png');
      
      // Trigger error
      await new Promise(resolve => setTimeout(resolve, 10));
      if (mockReader.onerror) {
        mockReader.onerror(new Error('Read error'));
      }

      await promise;
      expect(global.window.dispatchEvent).toHaveBeenCalled();
    });

    it('should handle FileReader timeout for large image', async () => {
      vi.useFakeTimers();
      const mockBlob = new Blob(['image-content'], { type: 'image/png' });
      apiClient.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-type': 'image/png' },
        status: 200
      });

      const mockReader = {
        readAsDataURL: vi.fn(),
        onloadend: null,
        onerror: null,
        result: null,
        abort: vi.fn()
      };
      global.FileReader = vi.fn(() => mockReader);

      const promise = investigationService.viewFile('test.png');
      
      // Advance time to trigger timeout
      vi.advanceTimersByTime(30000);
      
      await promise;
      expect(mockReader.abort).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should handle content type detection from file extension', async () => {
      const mockBlob = new Blob(['content'], { type: 'application/octet-stream' });
      apiClient.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-type': 'application/octet-stream' },
        status: 200
      });

      await investigationService.viewFile('test.jpg');
      expect(global.window.dispatchEvent).toHaveBeenCalled();
    });

    it('should handle error with response data message', async () => {
      apiClient.get.mockRejectedValueOnce({ 
        response: { status: 500, data: { message: 'Server error' } },
        message: 'Network error'
      });

      await expect(investigationService.viewFile('test.pdf')).rejects.toThrow('Server error');
    });

    it('should handle error without response data message', async () => {
      apiClient.get.mockRejectedValueOnce({ 
        response: { status: 500 },
        message: 'Network error'
      });

      await expect(investigationService.viewFile('test.pdf')).rejects.toThrow('Network error');
    });

    it('should handle error without response', async () => {
      apiClient.get.mockRejectedValueOnce({ 
        message: 'Network error'
      });

      await expect(investigationService.viewFile('test.pdf')).rejects.toThrow('Network error');
    });

    it('should handle small image file size warning', async () => {
      const smallBlob = new Blob(['{}'], { type: 'image/png' });
      apiClient.get.mockResolvedValueOnce({
        data: smallBlob,
        headers: { 'content-type': 'image/png' },
        status: 200
      });

      const mockReader = {
        readAsDataURL: vi.fn(),
        onloadend: null,
        result: 'data:image/png;base64,content'
      };
      global.FileReader = vi.fn(() => mockReader);

      const promise = investigationService.viewFile('test.png');
      await new Promise(resolve => setTimeout(resolve, 10));
      if (mockReader.onloadend) mockReader.onloadend();
      await promise;

      expect(global.window.dispatchEvent).toHaveBeenCalled();
    });

    it('should handle path with multiple segments', async () => {
      const mockBlob = new Blob(['content'], { type: 'application/pdf' });
      apiClient.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-type': 'application/pdf' },
        status: 200
      });

      await investigationService.viewFile('uploads/investigations/2024/test file.pdf');
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('investigations'), expect.any(Object));
    });

    it('should handle path without slashes', async () => {
      const mockBlob = new Blob(['content'], { type: 'application/pdf' });
      apiClient.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-type': 'application/pdf' },
        status: 200
      });

      await investigationService.viewFile('testfile.pdf');
      expect(apiClient.get).toHaveBeenCalled();
    });

    it('should handle file with no extension', async () => {
      const mockBlob = new Blob(['content'], { type: 'application/octet-stream' });
      apiClient.get.mockResolvedValueOnce({
        data: mockBlob,
        headers: { 'content-type': 'application/octet-stream' },
        status: 200
      });

      global.window.open = vi.fn(() => ({ closed: false }));

      await investigationService.viewFile('testfile');
      expect(global.window.open).toHaveBeenCalled();
    });
  });
});
