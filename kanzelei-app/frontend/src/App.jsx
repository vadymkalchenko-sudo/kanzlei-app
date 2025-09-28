import { useState, useRef, useEffect } from 'react';
import { useKanzleiLogic } from './hooks/useKanzleiLogic.js';
import { Modal } from './components/ui/Modal.jsx';
import { AktenList } from './components/AktenList.jsx';
import AktenForm from './components/AktenForm.jsx';
import Stammdatenverwaltung from './components/Stammdatenverwaltung.jsx';
import Aktenansicht from './components/Aktenansicht.jsx';

// Hauptkomponente, die die gesamte Anwendung darstellt
export const App = () => {
  const {
    isAppReady,
    mandanten,
    records,
    dritteBeteiligte,
    message,
    setFlashMessage,
    handleRecordSubmit,
    handleMandantSubmit,
    handleDeleteMandant,
    handleDritteSubmit,
    handleDeleteDritte,
    handleAddDocuments,
    handleUpdateDocument,
    handleDeleteDocument,
    handleAddNote,
    handleUpdateNote,
    handleDeleteNote,
    handleExport,
    handleImport,
    nextCaseNumber,
    setSearchTerm,
  } = useKanzleiLogic();
  
  const [currentView, setCurrentView] = useState('akten');
  const [initialStammdatenTab, setInitialStammdatenTab] = useState('mandanten');
  const [itemToEdit, setItemToEdit] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const importInputRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navigateToStammdaten = (tab = 'mandanten') => {
    setInitialStammdatenTab(tab);
    setCurrentView('stammdaten');
  };

  const handleCloseMessage = () => {
    setFlashMessage(null);
  };
  
  const handleOpenAkteModal = (akte = null) => {
  setSelectedItem(akte);
  if (akte) {
    setCurrentView('akten_detail');
  } else {
    setIsModalOpen(true);
  }
};

  const handleGoBackToList = () => {
    setSelectedItem(null);
    setCurrentView('akten');
  };

  const handleDirectEdit = (item, type) => {
    setItemToEdit(item);
    navigateToStammdaten(type);
  };

  const clearItemToEdit = () => {
    setItemToEdit(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const onImportClick = () => {
    importInputRef.current.click();
    setIsDropdownOpen(false);
  };

  const onExportClick = () => {
    handleExport();
    setIsDropdownOpen(false);
  };

  const onFileImport = (e) => {
    const file = e.target.files[0];
    handleImport(file);
    e.target.value = null;
  };
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedItem) {
      const updatedRecord = records.find(r => r.id === selectedItem.id);
      if (updatedRecord) {
        setSelectedItem(updatedRecord);
      }
    }
  }, [records, selectedItem]);

  return (
    <div className="bg-gray-100 min-h-screen p-8 font-sans antialiased text-gray-800">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <header className="flex justify-between items-center mb-8 pb-4 border-b">
          <h1 className="text-3xl font-bold text-gray-700">A-W-R Aktenverwaltung</h1>
          <div className="flex items-center space-x-4">
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <button onClick={onExportClick} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Export
                  </button>
                  <button onClick={onImportClick} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
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
              )}
            </div>
          </div>
        </header>

        {/* Meldungsanzeige */}
        {message && (
          <div className="fixed bottom-8 right-8 z-50 max-w-sm bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-lg shadow-lg" role="alert">
            <div className="flex items-center justify-between">
              <span>{message}</span>
              <button onClick={handleCloseMessage} className="ml-4 text-blue-700 hover:text-blue-900 font-bold">
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Hauptansicht */}
        <main>
          {currentView === 'akten' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-700">Aktenübersicht</h2>
                <div className="flex items-center">
                  <button onClick={() => navigateToStammdaten('mandanten')} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105 mr-4">
                    Stammdaten verwalten
                  </button>
                  <button onClick={() => handleOpenAkteModal(null)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105">
                    + Neue Akte anlegen
                  </button>
                </div>
              </div>

              {/* Suchleiste */}
              <div className="mb-6">
                <input
                  type="search"
                  placeholder="Suche nach Aktenzeichen oder Mandant..."
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {isAppReady ? (
                <AktenList
                  records={records}
                  mandanten={mandanten}
                  onEdit={handleOpenAkteModal}
                />
              ) : (
                <p className="text-center text-gray-500 py-12">Lade Akten...</p>
              )}
            </>
          )}

          {currentView === 'stammdaten' && (
            <Stammdatenverwaltung
              onGoBack={handleGoBackToList}
              initialTab={initialStammdatenTab}
              itemToEdit={itemToEdit}
              clearItemToEdit={clearItemToEdit}
              mandanten={mandanten}
              dritteBeteiligte={dritteBeteiligte}
              onMandantSubmit={handleMandantSubmit}
              onMandantDelete={handleDeleteMandant}
              onDritteSubmit={handleDritteSubmit}
              onDritteDelete={handleDeleteDritte}
            />
          )}

          {currentView === 'akten_detail' && (
            <Aktenansicht
              record={selectedItem}
              mandant={mandanten.find(m => m.id === selectedItem.mandantId)}
              dritteBeteiligte={dritteBeteiligte}
              onGoBack={handleGoBackToList}
              onDirectEdit={handleDirectEdit}
              onAddDocuments={handleAddDocuments}
              onDeleteDocument={handleDeleteDocument}
              onUpdateDocument={handleUpdateDocument}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
            />
          )}
        </main>
        
        {/* Modal */}
        <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
          {isModalOpen && (
            <AktenForm
              akte={selectedItem}
              mandanten={mandanten}
              dritteBeteiligte={dritteBeteiligte}
              onRecordSubmit={handleRecordSubmit}
              onCancel={handleCloseModal}
              nextCaseNumber={nextCaseNumber}
              onNavigateToStammdaten={navigateToStammdaten}
              handleDritteSubmit={handleDritteSubmit}
              handleMandantSubmit={handleMandantSubmit}
            />
          )}
        </Modal>
      </div>
    </div>
  );
};

export default App;