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
        console.log('Response headers:', response.headers);
        
        // Get file name and extension from path
        const fileName = filePath.split('/').pop() || 'file';
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        
        // Get the content type from response headers, with fallback based on file extension
        let contentType = response.headers['content-type'] || response.headers['Content-Type'] || 'application/octet-stream';
        
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
        
        // Create blob with proper MIME type
        const blob = new Blob([response.data], { type: contentType });
        
        // Create object URL
        const blobUrl = URL.createObjectURL(blob);
        console.log('Created blob URL:', blobUrl);
        
        // Determine how to display based on content type
        if (contentType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension)) {
          // For images, convert blob to data URL and embed in HTML
          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              const dataUrl = reader.result;
              // Escape the data URL for use in HTML (it's already safe, but be cautious)
              const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                  <title>${fileName}</title>
                  <meta charset="UTF-8">
                  <style>
                    * {
                      box-sizing: border-box;
                    }
                    body {
                      margin: 0;
                      padding: 20px;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      min-height: 100vh;
                      background-color: #f5f5f5;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    }
                    .image-container {
                      max-width: 100%;
                      max-height: 100vh;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                    }
                    img {
                      max-width: 100%;
                      max-height: 100vh;
                      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                      border-radius: 4px;
                      object-fit: contain;
                    }
                    .error-message {
                      color: #dc2626;
                      text-align: center;
                      padding: 20px;
                    }
                  </style>
                </head>
                <body>
                  <div class="image-container">
                    <img src="${dataUrl}" alt="${fileName}" onerror="this.parentElement.innerHTML='<div class=\\'error-message\\'>Failed to load image</div>'" />
                  </div>
                </body>
                </html>
              `;
              const htmlBlob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
              const htmlBlobUrl = URL.createObjectURL(htmlBlob);
              
              // Try to open in new window
              const newWindow = window.open(htmlBlobUrl, '_blank', 'width=1200,height=800');
              
              if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                // If popup blocked, try direct blob URL
                console.log('Popup blocked, trying direct blob URL');
                const directWindow = window.open(blobUrl, '_blank');
                if (!directWindow || directWindow.closed) {
                  // Last resort: create download link
                  const link = document.createElement('a');
                  link.href = blobUrl;
                  link.download = fileName;
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }
              
              // Clean up HTML blob URL after a delay
              setTimeout(() => {
                URL.revokeObjectURL(htmlBlobUrl);
              }, 1000);
              
              // Clean up original blob URL after image is loaded (longer delay for viewing)
              setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
              }, 300000); // 5 minutes for viewing
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
