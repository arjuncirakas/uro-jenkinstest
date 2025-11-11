import apiClient from '../config/axios';

export const investigationService = {
  // Add PSA result
  addPSAResult: async (patientId, psaData) => {
    try {
      const formData = new FormData();
      
      // Add text fields
      Object.keys(psaData).forEach(key => {
        if (key !== 'testFile' && psaData[key] !== null && psaData[key] !== undefined) {
          formData.append(key, psaData[key]);
        }
      });
      
      // Add file if present
      if (psaData.testFile) {
        formData.append('testFile', psaData.testFile);
      }

      const response = await apiClient.post(`/patients/${patientId}/psa-results`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error adding PSA result:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Add other test result with file upload
  addOtherTestResult: async (patientId, testData) => {
    try {
      const formData = new FormData();
      
      // Add text fields
      Object.keys(testData).forEach(key => {
        if (key !== 'testFile' && testData[key] !== null && testData[key] !== undefined) {
          formData.append(key, testData[key]);
        }
      });
      
      // Add file if present
      if (testData.testFile) {
        formData.append('testFile', testData.testFile);
      }

      const response = await apiClient.post(`/patients/${patientId}/test-results`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error adding test result:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get investigation results for a patient
  getInvestigationResults: async (patientId, testType = null) => {
    try {
      const params = testType ? { testType } : {};
      const response = await apiClient.get(`/patients/${patientId}/investigations`, { params });
      console.log('🔍 investigationService: getInvestigationResults response:', response.data);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching investigation results:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Delete investigation result
  deleteInvestigationResult: async (resultId) => {
    try {
      const response = await apiClient.delete(`/investigations/${resultId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error deleting investigation result:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get all investigations
  getAllInvestigations: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.testType) params.append('testType', filters.testType);
      if (filters.status) params.append('status', filters.status);
      
      const response = await apiClient.get(`/investigations?${params.toString()}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching all investigations:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Create investigation request
  createInvestigationRequest: async (patientId, requestData) => {
    try {
      const response = await apiClient.post(`/patients/${patientId}/investigation-requests`, requestData);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error creating investigation request:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get investigation requests for a patient
  getInvestigationRequests: async (patientId, status = null) => {
    try {
      const params = status ? { status } : {};
      const response = await apiClient.get(`/patients/${patientId}/investigation-requests`, { params });
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching investigation requests:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Delete investigation request
  deleteInvestigationRequest: async (requestId) => {
    try {
      const response = await apiClient.delete(`/investigation-requests/${requestId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error deleting investigation request:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // View/download investigation file
  viewFile: async (filePath) => {
    if (filePath) {
      console.log('Attempting to view file:', filePath);
      
      try {
        // Encode the file path properly - preserve slashes but encode special characters
        // The backend route uses :filePath(*) which matches everything after /files/
        // We need to encode special characters but preserve path structure
        let encodedPath = filePath;
        if (filePath.includes('/')) {
          // Split by '/' and encode each segment separately, then join with '/'
          // This preserves the path structure while encoding special characters in filenames
          const pathSegments = filePath.split('/');
          encodedPath = pathSegments
            .map(segment => {
              // Only encode if segment is not empty
              return segment ? encodeURIComponent(segment) : '';
            })
            .filter(segment => segment !== '')
            .join('/');
        } else {
          // Single filename, encode it
          encodedPath = encodeURIComponent(filePath);
        }
        
        // Log for debugging
        console.log('Original file path:', filePath);
        console.log('Encoded file path:', encodedPath);
        
        // Fetch the file with proper authentication and MIME type
        const response = await apiClient.get(`/files/${encodedPath}`, {
          responseType: 'blob'
        });
        
        console.log('File fetched successfully');
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        console.log('Response data size:', response.data?.size || 'unknown');
        
        // Get file name and extension from path
        const fileName = filePath.split('/').pop() || 'file';
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        
        // Get the content type from response headers, with fallback based on file extension
        let contentType = response.headers['content-type'] || response.headers['Content-Type'] || 'application/octet-stream';
        
        // Check if the response is actually an error (JSON response instead of file)
        // If content-type is application/json, it's likely an error response
        if (contentType.includes('application/json') || contentType.includes('text/html')) {
          // Try to read as text to see the error message
          try {
            const text = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsText(response.data);
            });
            console.error('Received error response instead of file:', text);
            try {
              const errorData = JSON.parse(text);
              alert(`Error loading file: ${errorData.message || 'Unknown error'}`);
            } catch (e) {
              alert(`Error loading file: The server returned an error response instead of the file.`);
            }
          } catch (e) {
            console.error('Error reading error response:', e);
            alert(`Error loading file: The server returned an error response instead of the file.`);
          }
          return;
        }
        
        // Check if blob is empty
        if (!response.data || response.data.size === 0) {
          console.error('Received empty file');
          alert('Error: The file appears to be empty or could not be loaded.');
          return;
        }
        
        // Validate blob size (should be reasonable for images)
        if (response.data.size < 100 && fileExtension !== 'txt') {
          console.warn('File size is very small, might be an error response');
        }
        
        // Fallback: determine content type from file extension if not provided
        if (contentType === 'application/octet-stream' || !contentType) {
          const extensionMimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          };
          contentType = extensionMimeTypes[fileExtension] || 'application/octet-stream';
        }
        
        console.log('Content type:', contentType);
        console.log('File extension:', fileExtension);
        console.log('Blob size:', response.data.size, 'bytes');
        
        // Create blob with proper MIME type
        const blob = new Blob([response.data], { type: contentType });
        
        // Create object URL
        const blobUrl = URL.createObjectURL(blob);
        console.log('Created blob URL:', blobUrl);
        
        // Determine how to display based on content type
        if (contentType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension)) {
          // For images, convert blob to data URL and show in modal
          const reader = new FileReader();
          
          // Add timeout for reading large files
          const readTimeout = setTimeout(() => {
            console.error('Timeout reading image file');
            reader.abort();
            alert('Error: Timeout while reading the image file. The file might be too large or corrupted.');
            URL.revokeObjectURL(blobUrl);
          }, 30000); // 30 second timeout
          
          reader.onloadend = () => {
            clearTimeout(readTimeout); // Clear timeout when reading completes
            try {
              const dataUrl = reader.result;
              
              // Emit event to open image viewer modal
              const event = new CustomEvent('openImageViewer', {
                detail: {
                  imageUrl: dataUrl,
                  fileName: fileName,
                  blobUrl: blobUrl // Keep blob URL for download
                }
              });
              window.dispatchEvent(event);
              
              // Don't revoke blob URL immediately - let the modal handle it
              // The modal will revoke it when closed
            } catch (error) {
              console.error('Error creating image viewer:', error);
              // Fallback: try opening blob URL directly
              const fallbackWindow = window.open(blobUrl, '_blank');
              if (!fallbackWindow || fallbackWindow.closed) {
                // Create download link as last resort
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = fileName;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }
          };
          reader.onerror = (error) => {
            console.error('Error reading image file:', error);
            console.error('Blob details:', {
              size: blob.size,
              type: blob.type,
              fileName: fileName
            });
            
            // Check if blob is valid
            if (blob.size === 0) {
              alert('Error: The file appears to be empty. Please check if the file exists on the server.');
              URL.revokeObjectURL(blobUrl);
              return;
            }
            
            // Fallback: try using blob URL directly in modal
            const event = new CustomEvent('openImageViewer', {
              detail: {
                imageUrl: blobUrl,
                fileName: fileName,
                blobUrl: blobUrl
              }
            });
            window.dispatchEvent(event);
          };
          
          reader.readAsDataURL(blob);
        } else if (contentType === 'application/pdf') {
          // For PDFs, create an HTML page with embedded PDF viewer
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>${fileName}</title>
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  height: 100vh;
                  overflow: hidden;
                }
                iframe {
                  width: 100%;
                  height: 100vh;
                  border: none;
                }
              </style>
            </head>
            <body>
              <iframe src="${blobUrl}" type="application/pdf"></iframe>
            </body>
            </html>
          `;
          const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
          const htmlBlobUrl = URL.createObjectURL(htmlBlob);
          window.open(htmlBlobUrl, '_blank');
          
          // Clean up HTML blob URL after a delay
          setTimeout(() => {
            URL.revokeObjectURL(htmlBlobUrl);
          }, 1000);
        } else {
          // For other file types (DOC, DOCX, etc.), open blob URL directly or download
          const newWindow = window.open(blobUrl, '_blank');
          
          // Check if popup was blocked
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            // Fallback: create a download link if popup was blocked
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
        
        // Clean up the blob URL after a delay (longer for viewing)
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 120000); // Keep it longer for viewing (2 minutes)
        
      } catch (error) {
        console.error('Error fetching file:', error);
        
        // Check if it's an authentication error
        if (error.response?.status === 401) {
          console.error('Authentication error: Session expired');
          // Silently fail - user can see error in console
          return;
        }
        
        // Log error but don't show alert
        console.error('Unable to open file:', error.message);
      }
    } else {
      console.error('No file path provided');
    }
  }
};
