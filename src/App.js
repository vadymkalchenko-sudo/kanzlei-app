import React, { useState } from 'react';
import { useKanzleiLogic } from './hooks/useKanzleiLogic.js';
import { MandantenList } from './components/MandantenList.jsx';
import MandantenForm from './components/MandantenForm.jsx';
import { AktenList } from './components/AktenList.jsx';
import AktenForm from './components/AktenForm.jsx';
import { Modal } from './components/ui/Modal.jsx';

// Lade Tailwind CSS über das CDN
const tailwindScript = document.createElement('script');
tailwindScript.src = 'https://cdn.tailwindcss.com';
document.head.appendChild(tailwindScript);

const App = () => {
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
  } = useKanzleiLogic();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // 'mandant' oder 'akte'
  const [selectedItem, setSelectedItem] = useState(null); // Für Bearbeitung

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

  return (
    <div className="bg-gray-100 min-h-screen p-8 font-sans antialiased text-gray-800">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800">Kanzlei-Verwaltung</h1>
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

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-700">Mandanten</h2>
              <button onClick={() => handleOpenMandantModal()} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors">
                + Neuer Mandant
              </button>
            </div>
            {isAppReady ? (
              mandanten.length > 0 ? (
                <MandantenList
                  mandanten={mandanten}
                  onEdit={handleOpenMandantModal}
                  onDelete={handleDeleteMandant}
                />
              ) : (
                <p className="text-red-600">Keine Mandanten gefunden. Bitte legen Sie welche an.</p>
              )
            ) : (
              <p className="text-gray-500">Lade Mandanten...</p>
            )}
          </div>

          <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-700">Akten</h2>
              <button onClick={() => handleOpenAkteModal()} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors">
                + Neue Akte
              </button>
            </div>
            {isAppReady ? (
              records.length > 0 ? (
                <AktenList
                  records={records}
                  mandanten={mandanten}
                  onEdit={handleOpenAkteModal}
                  onDelete={handleDeleteRecord}
                />
              ) : (
                <p className="text-red-600">Keine Akten gefunden. Bitte legen Sie welche an.</p>
              )
            ) : (
              <p className="text-gray-500">Lade Akten...</p>
            )}
          </div>
        </main>

        <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
          {modalType === 'mandant' && (
            <MandantenForm
              mandant={selectedItem}
              onSubmit={handleMandantSubmit}
              onCancel={handleCloseModal}
            />
          )}
          {modalType === 'akte' && (
            <AktenForm
              akte={selectedItem}
              mandanten={mandanten}
              onSubmit={handleRecordSubmit}
              onCancel={handleCloseModal}
            />
          )}
        </Modal>
      </div>
    </div>
  );
};

export default App;
