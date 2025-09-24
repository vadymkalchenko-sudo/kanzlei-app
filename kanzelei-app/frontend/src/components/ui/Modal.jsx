import React from 'react';

/**
 * Eine wiederverwendbare Modal-Komponente.
 * @param {boolean} isOpen - Steuert die Sichtbarkeit des Modals.
 * @param {function} onClose - Callback-Funktion zum Schließen des Modals.
 * @param {ReactNode} children - Der Inhalt des Modals.
 */
export const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="relative bg-white rounded-lg shadow-xl p-6 w-11/12 md:max-w-4xl mx-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl font-bold"
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;