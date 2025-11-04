import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook to handle Escape key press for closing modals with confirmation modal
 * @param {Function} onClose - Function to call when Escape is pressed
 * @param {boolean} isOpen - Whether the modal is open
 * @param {boolean} hasUnsavedChanges - Whether there are unsaved changes
 * @param {Function} onSave - Optional function to save changes before closing
 * @returns {Array} [showConfirmModal, closeConfirmModal] - State and handler for confirmation modal
 */
export const useEscapeKey = (onClose, isOpen, hasUnsavedChanges = false, onSave = null) => {
  const onCloseRef = useRef(onClose);
  const onSaveRef = useRef(onSave);
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Keep refs updated
  useEffect(() => {
    onCloseRef.current = onClose;
    onSaveRef.current = onSave;
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [onClose, onSave, hasUnsavedChanges]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        console.log('Escape key pressed in useEscapeKey!');
        console.log('hasUnsavedChangesRef.current:', hasUnsavedChangesRef.current);
        console.log('onSaveRef.current:', onSaveRef.current);
        
        event.preventDefault();
        event.stopPropagation();

        // If there are unsaved changes, show confirmation modal
        if (hasUnsavedChangesRef.current && onSaveRef.current) {
          console.log('Showing confirmation modal');
          setShowConfirmModal(true);
        } else {
          console.log('Closing immediately - no unsaved changes or no save function');
          // Close immediately if no unsaved changes
          onCloseRef.current();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const closeConfirmModal = (shouldSave = false) => {
    setShowConfirmModal(false);
    
    if (shouldSave && onSaveRef.current) {
      onSaveRef.current();
    }
    
    // Close modal regardless
    onCloseRef.current();
  };

  return [showConfirmModal, closeConfirmModal];
};
