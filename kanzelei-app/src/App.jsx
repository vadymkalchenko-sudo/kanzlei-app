import { useState, useRef } from 'react';
import { useKanzleiLogic } from './hooks/useKanzleiLogic.js';
import { MandantenList } from './components/MandantenList.jsx';
import MandantenForm from './components/MandantenForm.jsx';
import { Modal } from './components/ui/Modal.jsx';
import { AktenList } from './components/AktenList.jsx';
import AktenForm from './components/AktenForm.jsx';

// Hauptkomponente, die die gesamte Anwendung darstellt
export const App = () => {
  const {
    isAppReady,
    mandanten,
    records,
    message,
    setMessage,
    handleMandantSubmit,
    handleDeleteMandant,
    handleRecordSubmit,
    handleDeleteRecord,
    handleExport,
    handleImport,
    nextCaseNumber,
  } = useKanzleiLogic();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // 'mandant' oder 'akte'
  const [selectedItem, setSelectedItem] = useState(null); // Für Bearbeitung
  const importInputRef = useRef(null);

  // Schließt die Meldungsanzeige
  const handleCloseMessage = () => {
    setMessage(null);
  };

  const handleOpenMandantModal = (mandant = null) => {
    setSelectedItem(mandant);
    setModalType('mandant');
    setIsModalOpen(true);
  };
  
  const handleOpenAkteModal = (akte = null) => {
    setSelectedItem(akte);
    setModalType('akte');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalType(null);
    setSelectedItem(null);
  };

  const onImportClick = () => {
    importInputRef.current.click();
  };

  const onFileImport = (e) => {
    const file = e.target.files[0];
    handleImport(file);
    e.target.value = null; // Reset input
  };
  
  return (
    <div className="bg-gray-100 min-h-screen p-8 font-sans antialiased text-gray-800">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b">
          <h1 className="text-3xl font-bold text-gray-700">A-W-R Aktenverwaltung</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-sm font-medium text-gray-600">Connected</span>
            </div>
            <div className="flex space-x-2">
              {/* TODO: Group these under a "Setup" dropdown */}
              <button onClick={handleExport} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg text-sm transition-colors">
                Export
              </button>
              <button onClick={onImportClick} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg text-sm transition-colors">
                Import
              </button>
              <input
                type="file"
                ref={importInputRef}
                onChange={onFileImport}
                className="hidden"
                accept="application/json"
              />
            </div>
          </div>
        </header>

        {/* Meldungsanzeige */}
        {message && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded-lg shadow-sm" role="alert">
            <div className="flex items-center justify-between">
              <span>{message}</span>
              <button onClick={handleCloseMessage} className="text-blue-700 hover:text-blue-900 font-bold">
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Hauptansicht */}
        <main>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-700">Aktenübersicht</h2>
            <button onClick={() => handleOpenAkteModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105">
              + Neue Akte anlegen
            </button>
          </div>
          {isAppReady ? (
            records.length > 0 ? (
              <AktenList
                records={records}
                mandanten={mandanten}
                onEdit={handleOpenAkteModal}
                onDelete={handleDeleteRecord} // This will be removed from AktenList itself
              />
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Keine Akten gefunden.</p>
                <p className="text-gray-400 text-sm mt-2">Klicken Sie auf "+ Neue Akte anlegen", um zu beginnen.</p>
              </div>
            )
          ) : (
            <p className="text-center text-gray-500 py-12">Lade Akten...</p>
          )}
        </main>
        
        {/* Modal */}
        <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
          {/* The modal now only handles 'akte' type. The 'mandant' type is removed. */}
          {modalType === 'akte' && (
            <AktenForm
              akte={selectedItem}
              mandanten={mandanten}
              onSubmit={handleRecordSubmit}
              onCancel={handleCloseModal}
              nextCaseNumber={nextCaseNumber}
            />
          )}
        </Modal>
      </div>
    </div>
  );
};

export default App;