import React, { useEffect, useCallback } from 'react';

/**
 * Eine wiederverwendbare Modal-Komponente.
 * @param {boolean} isOpen - Steuert die Sichtbarkeit des Modals.
 * @param {function} onClose - Callback-Funktion zum Schließen des Modals.
 * @param {ReactNode} children - Der Inhalt des Modals.
 */
export const Modal = ({ isOpen, onClose, children }) => {
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent scrolling of the background content
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event) => {
    // Close the modal only if the click is on the backdrop itself, not on its children
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div className="relative bg-white rounded-lg shadow-xl p-6 w-11/12 md:max-w-4xl mx-auto" role="document">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl font-bold"
          aria-label="Schließen"
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;