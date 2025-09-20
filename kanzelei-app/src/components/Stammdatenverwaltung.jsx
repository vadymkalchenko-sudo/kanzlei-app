import React, { useState } from 'react';
import { MandantenList } from './MandantenList.jsx';
import PersonForm from './PersonForm.jsx';
import { Modal } from './ui/Modal.jsx';
import { Button } from './ui/Button.jsx';

export const Stammdatenverwaltung = ({
  onGoBack,
  mandanten,
  dritteBeteiligte,
  onMandantSubmit,
  onMandantDelete,
  onDritteSubmit,
  onDritteDelete,
}) => {
  const [activeTab, setActiveTab] = useState('mandanten');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleOpenModal = (item = null) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const isMandantenTab = activeTab === 'mandanten';
  const items = isMandantenTab ? mandanten : dritteBeteiligte;
  const handleDelete = isMandantenTab ? onMandantDelete : onDritteDelete;
  const handleSubmit = isMandantenTab ? onMandantSubmit : onDritteSubmit;
  const title = isMandantenTab ? 'Mandant' : 'Dritter Beteiligter';

  return (
    <div>
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <h2 className="text-2xl font-semibold text-gray-700">Stammdatenverwaltung</h2>
        <Button onClick={onGoBack} className="bg-blue-600 hover:bg-blue-700">
          Zurück zur Aktenübersicht
        </Button>
      </div>

      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('mandanten')}
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'mandanten' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Mandanten
        </button>
        <button
          onClick={() => setActiveTab('dritte')}
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'dritte' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Dritte Beteiligte
        </button>
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={() => handleOpenModal(null)}>
          + Neuen {title} anlegen
        </Button>
      </div>

      <MandantenList
        mandanten={items}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
      />

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        {isModalOpen && (
          <PersonForm
            person={selectedItem}
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            title={`${selectedItem ? 'Bearbeiten' : 'Anlegen'}: ${title}`}
          />
        )}
      </Modal>
    </div>
  );
};

export default Stammdatenverwaltung;
