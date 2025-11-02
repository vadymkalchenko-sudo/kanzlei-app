import React from 'react';
import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 bg-white rounded-lg">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <Button onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-800">
            Abbrechen
          </Button>
          <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white">
            Bestätigen
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;