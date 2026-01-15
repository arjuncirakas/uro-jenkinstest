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

  // Update PSA result
  updatePSAResult: async (resultId, psaData) => {
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

      const response = await apiClient.patch(`/psa-results/${resultId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error updating PSA result:', error);
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

  // Update other test result with file upload
  updateOtherTestResult: async (resultId, testData) => {
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

      const response = await apiClient.patch(`/test-results/${resultId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error updating test result:', error);
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

  // Update investigation request status
  updateInvestigationRequestStatus: async (requestId, status) => {
    try {
      const response = await apiClient.patch(`/investigation-requests/${requestId}/status`, { status });
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error updating investigation request status:', error);
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

  // Parse PSA file and extract values automatically
  parsePSAFile: async (file) => {
    try {
      console.log('[Frontend PSA Service] ===== API REQUEST START =====');
      console.log('[Frontend PSA Service] File name:', file.name);
      console.log('[Frontend PSA Service] File size:', file.size, 'bytes');
      console.log('[Frontend PSA Service] File type:', file.type);
      
      const formData = new FormData();
      formData.append('file', file);
      console.log('[Frontend PSA Service] FormData created, sending POST to /parse-psa-file');

      const response = await apiClient.post('/parse-psa-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('[Frontend PSA Service] ===== API RESPONSE RECEIVED =====');
      console.log('[Frontend PSA Service] Response status:', response.status);
      console.log('[Frontend PSA Service] Full response:', JSON.stringify(response.data, null, 2));
      console.log('[Frontend PSA Service] Response data:', response.data);
      console.log('[Frontend PSA Service] Response data.data:', response.data?.data);
      console.log('[Frontend PSA Service] PSA entries count:', response.data?.data?.psaEntries?.length || 0);
      
      if (response.data?.data?.psaEntries) {
        console.log('[Frontend PSA Service] PSA entries:', JSON.stringify(response.data.data.psaEntries, null, 2));
        response.data.data.psaEntries.forEach((entry, index) => {
          console.log(`[Frontend PSA Service] Entry ${index + 1}:`, {
            testDate: entry.testDate,
            result: entry.result,
            status: entry.status,
            notes: entry.notes
          });
        });
      }
      
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('[Frontend PSA Service] ===== API ERROR =====');
      console.error('[Frontend PSA Service] Error parsing PSA file:', error);
      console.error('[Frontend PSA Service] Error message:', error.message);
      console.error('[Frontend PSA Service] Error response:', error.response);
      console.error('[Frontend PSA Service] Error response data:', error.response?.data);
      console.error('[Frontend PSA Service] Error response status:', error.response?.status);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // View/download investigation file
  viewFile: async (filePath) => {
    console.log('📁 [investigationService.viewFile] ==========================================');
    console.log('📁 [investigationService.viewFile] Called with filePath:', filePath);
    console.log('📁 [investigationService.viewFile] filePath type:', typeof filePath);
    console.log('📁 [investigationService.viewFile] filePath length:', filePath?.length);
    
    if (filePath) {
      console.log('📁 [investigationService.viewFile] Starting file view process');
      
      try {
        // Normalize the file path - remove 'uploads/' prefix if present
        // The backend middleware expects paths relative to uploads directory
        let normalizedPath = filePath;
        console.log('📁 [investigationService.viewFile] Step 1 - Original file path:', normalizedPath);
        
        if (normalizedPath.startsWith('uploads/') || normalizedPath.startsWith('uploads\\')) {
          normalizedPath = normalizedPath.replace(/^uploads[/\\]/, '');
          console.log('📁 [investigationService.viewFile] Step 2 - Removed uploads/ prefix');
        } else {
          console.log('📁 [investigationService.viewFile] Step 2 - No uploads/ prefix to remove');
        }
        console.log('📁 [investigationService.viewFile] Step 2 - Normalized file path:', normalizedPath);
        
        // Encode the file path properly for URL
        // Split by '/' and encode each segment separately to preserve path structure
        // This ensures special characters in filenames are encoded while slashes remain
        let encodedPath = normalizedPath;
        if (normalizedPath.includes('/')) {
          const pathSegments = normalizedPath.split('/');
          console.log('📁 [investigationService.viewFile] Step 3 - Path segments:', pathSegments);
          encodedPath = pathSegments
            .map(segment => segment ? encodeURIComponent(segment) : '')
            .filter(segment => segment !== '')
            .join('/');
          console.log('📁 [investigationService.viewFile] Step 3 - Encoded path segments:', encodedPath);
        } else {
          encodedPath = encodeURIComponent(normalizedPath);
          console.log('📁 [investigationService.viewFile] Step 3 - Encoded single segment:', encodedPath);
        }
        console.log('📁 [investigationService.viewFile] Step 3 - Final encoded file path:', encodedPath);
        
        // Construct full URL for testing
        const baseURL = import.meta.env.VITE_API_URL || 'https://uroprep.ahimsa.global/api';
        const fullURL = `${baseURL}/investigations/files/${encodedPath}`;
        console.log('📁 [investigationService.viewFile] Step 4 - Base URL:', baseURL);
        console.log('📁 [investigationService.viewFile] Step 4 - Full URL:', fullURL);
        console.log('📁 [investigationService.viewFile] Step 4 - VITE_API_URL env:', import.meta.env.VITE_API_URL);
        
        // Fetch the file with proper authentication and MIME type
        // Use /investigations/files to match the backend route
        // The router is mounted at /api, so this becomes /api/investigations/files/:filePath(*)
        console.log('📁 [investigationService.viewFile] Step 5 - Making API request');
        console.log('📁 [investigationService.viewFile] Step 5 - Request URL:', `/investigations/files/${encodedPath}`);
        console.log('📁 [investigationService.viewFile] Step 5 - Request config:', { responseType: 'blob' });
        
        let response;
        try {
          response = await apiClient.get(`/investigations/files/${encodedPath}`, {
            responseType: 'blob'
          });
          console.log('📁 [investigationService.viewFile] Step 6 - API request successful');
        } catch (error) {
          console.log('📁 [investigationService.viewFile] Step 6 - API request failed');
          console.log('📁 [investigationService.viewFile] Step 6 - Error:', error);
          console.log('📁 [investigationService.viewFile] Step 6 - Error response status:', error.response?.status);
          console.log('📁 [investigationService.viewFile] Step 6 - Error response data:', error.response?.data);
          
          // If the main route fails, try the backward compatibility route
          if (error.response?.status === 404) {
            console.log('📁 [investigationService.viewFile] Step 6 - Trying backward compatibility route /files/...');
            try {
              response = await apiClient.get(`/files/${encodedPath}`, {
                responseType: 'blob'
              });
              console.log('📁 [investigationService.viewFile] Step 6 - Backward compatibility route succeeded');
            } catch (backupError) {
              console.log('📁 [investigationService.viewFile] Step 6 - Backward compatibility route also failed');
              throw backupError;
            }
          } else {
            throw error;
          }
        }
        
        console.log('📁 [investigationService.viewFile] Step 7 - File fetched successfully');
        console.log('📁 [investigationService.viewFile] Step 7 - Response status:', response.status);
        console.log('📁 [investigationService.viewFile] Step 7 - Response headers:', response.headers);
        console.log('📁 [investigationService.viewFile] Step 7 - Response Content-Type:', response.headers['content-type'] || response.headers['Content-Type']);
        console.log('📁 [investigationService.viewFile] Step 7 - Response data size:', response.data?.size || 'unknown');
        console.log('📁 [investigationService.viewFile] Step 7 - Response data type:', response.data?.constructor?.name || 'unknown');
        
        // Log first few bytes for debugging (if it's a blob)
        if (response.data && response.data.size > 0) {
          console.log('📁 [investigationService.viewFile] Step 8 - Checking response content');
          try {
            const preview = response.data.slice(0, 100);
            preview.text().then(text => {
              console.log('📁 [investigationService.viewFile] Step 8 - First 100 bytes of response:', text);
              console.log('📁 [investigationService.viewFile] Step 8 - Starts with < (HTML?):', text.trim().startsWith('<'));
              console.log('📁 [investigationService.viewFile] Step 8 - Starts with { (JSON?):', text.trim().startsWith('{'));
            }).catch(e => {
              console.log('📁 [investigationService.viewFile] Step 8 - Could not read preview (might be binary data):', e);
            });
          } catch (e) {
            console.log('📁 [investigationService.viewFile] Step 8 - Could not create preview:', e);
          }
        } else {
          console.log('📁 [investigationService.viewFile] Step 8 - Response data is empty or null');
        }
        
        // Get file name and extension from path
        const fileName = filePath.split('/').pop() || 'file';
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        console.log('📁 [investigationService.viewFile] Step 9 - File name:', fileName);
        console.log('📁 [investigationService.viewFile] Step 9 - File extension:', fileExtension);
        
        // Get the content type from response headers, with fallback based on file extension
        let contentType = response.headers['content-type'] || response.headers['Content-Type'] || 'application/octet-stream';
        console.log('📁 [investigationService.viewFile] Step 9 - Content-Type from headers:', contentType);
        
        // Check if blob is empty
        if (!response.data || response.data.size === 0) {
          console.error('Received empty file');
          alert('Error: The file appears to be empty or could not be loaded.');
          return;
        }
        
        // Check if the response is actually HTML (wrong content type)
        // This happens when a reverse proxy or static server serves index.html instead of the file
        const isHTMLResponse = contentType.includes('text/html') || 
          (response.data.size < 5000 && await (async () => {
            try {
              const preview = response.data.slice(0, 200);
              const text = await preview.text();
              return text.trim().toLowerCase().startsWith('<!doctype') || 
                     text.trim().toLowerCase().startsWith('<html');
            } catch (e) {
              return false;
            }
          })());
        
        if (isHTMLResponse && !contentType.startsWith('image/')) {
          console.error('📁 [investigationService.viewFile] ERROR - Received HTML instead of image file');
          console.error('📁 [investigationService.viewFile] ERROR - This usually means the backend route is not matching');
          console.error('📁 [investigationService.viewFile] ERROR - Requested URL:', fullURL);
          console.error('📁 [investigationService.viewFile] ERROR - Response Content-Type:', contentType);
          
          // Try to read the HTML to see what was returned
          try {
            const text = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsText(response.data);
            });
            console.error('📁 [investigationService.viewFile] ERROR - HTML content received:', text.substring(0, 500));
            
            // Check if it's a JSON error wrapped in HTML
            try {
              const errorMatch = text.match(/\{"success":\s*false[^}]*\}/);
              if (errorMatch) {
                const errorData = JSON.parse(errorMatch[0]);
                alert(`Error loading file: ${errorData.message || 'File not found or route not matching'}`);
              } else {
                alert(`Error: The server returned an HTML page instead of the image file.\n\nThis usually means:\n1. The backend route is not matching\n2. A reverse proxy is serving the frontend HTML\n3. The file path is incorrect\n\nRequested: ${fullURL}\n\nPlease check the backend server logs for route matching issues.`);
              }
            } catch (e) {
              alert(`Error: The server returned an HTML page instead of the image file.\n\nRequested URL: ${fullURL}\n\nPlease check:\n1. Backend server logs for route matching\n2. Reverse proxy configuration\n3. File path correctness`);
            }
          } catch (e) {
            console.error('📁 [investigationService.viewFile] ERROR - Could not read HTML response:', e);
            alert(`Error: Received HTML response instead of image file. Please check backend logs.`);
          }
          return;
        }
        
        // Check if the response is actually an error (JSON response instead of file)
        // Only check for JSON if content-type explicitly says so AND file is small
        // Don't block if content-type is image/* even if small (might be valid small image)
        const isJSONError = contentType.includes('application/json') 
          && !contentType.startsWith('image/')
          && response.data.size < 1024;
        
        if (isJSONError) {
          // Try to read as text to see the error message
          try {
            const text = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsText(response.data);
            });
            console.error('📁 [investigationService.viewFile] ERROR - Received JSON error response:', text);
            try {
              const errorData = JSON.parse(text);
              alert(`Error loading file: ${errorData.message || 'Unknown error'}`);
            } catch (e) {
              alert(`Error loading file: The server returned an error response instead of the file.`);
            }
          } catch (e) {
            console.error('📁 [investigationService.viewFile] ERROR - Error reading error response:', e);
            alert(`Error loading file: The server returned an error response instead of the file.`);
          }
          return;
        }
        
        // For images, validate that the blob size is reasonable
        // Images should be at least a few KB (unless it's a very small icon)
        // But don't block if content-type is correct - let the image load and show error if it fails
        if (contentType.startsWith('image/') && response.data.size < 500 && fileExtension !== 'ico') {
          console.warn('Image file size is very small:', response.data.size, 'bytes');
          // Check if it's actually JSON by reading first few bytes
          try {
            // Clone the blob to read without consuming it
            const blobClone = response.data.slice(0, 100);
            const firstBytes = await blobClone.text();
            if (firstBytes.trim().startsWith('{') || firstBytes.trim().startsWith('<')) {
              console.error('Response appears to be JSON/HTML, not an image');
              console.error('First 100 bytes:', firstBytes);
              alert('Error: The server returned an error response instead of the image file.');
              return;
            }
          } catch (e) {
            // If we can't read it, proceed anyway - might be a valid small image
            console.warn('Could not validate response content, proceeding...', e);
          }
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
          // For PDFs, emit event to open PDF viewer modal
          const event = new CustomEvent('openPDFViewer', {
            detail: {
              pdfUrl: blobUrl,
              fileName: fileName,
              blobUrl: blobUrl // Keep blob URL for download and cleanup
            }
          });
          window.dispatchEvent(event);
          
          // Don't revoke blob URL immediately - let the modal handle it
          // The modal will revoke it when closed
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
        console.error('Error response:', error.response);
        console.error('Requested path:', normalizedPath);
        console.error('Encoded path:', encodedPath);
        
        // Check if it's an authentication error
        if (error.response?.status === 401) {
          console.error('Authentication error: Session expired');
          throw new Error('Authentication error: Please log in again to view the file.');
        }
        
        // Check if it's a 404 error
        if (error.response?.status === 404) {
          const errorMessage = error.response?.data?.message || 'File not found';
          console.error('File not found (404):', errorMessage);
          console.error('File path:', filePath);
          console.error('Normalized path:', normalizedPath);
          throw new Error(`File not found: ${errorMessage}. Please check if the file exists.`);
        }
        
        // Re-throw the error so the caller can handle it
        const errorMessage = error.response?.data?.message || error.message || 'Unable to open file';
        console.error('Unable to open file:', errorMessage);
        throw new Error(errorMessage);
      }
    } else {
      const errorMsg = 'No file path provided';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }
};
