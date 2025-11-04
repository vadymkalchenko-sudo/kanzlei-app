import React, { useState, useMemo } from 'react';
import { Button } from './ui/Button.jsx';
import { Modal } from './ui/Modal.jsx';
import AufgabenForm from './AufgabenForm.jsx';

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
};

const AufgabenPanel = ({
    recordId,
    aufgaben,
    onAddAufgabe,
    onUpdateAufgabe,
    onDeleteAufgabe,
    onToggleAufgabeErledigt,
    userRole
}) => {
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
    const [isAufgabeModalOpen, setIsAufgabeModalOpen] = useState(false);
    const [selectedAufgabe, setSelectedAufgabe] = useState(null);

    const canEdit = userRole === 'admin' || userRole === 'power_user' || userRole === 'user';
    const canDelete = userRole === 'admin' || userRole === 'power_user';

    const handleOpenAufgabeModal = (aufgabe = null) => {
        setSelectedAufgabe(aufgabe);
        setIsAufgabeModalOpen(true);
    };

    const handleCloseAufgabeModal = () => {
        setSelectedAufgabe(null);
        setIsAufgabeModalOpen(false);
    };

    const handleAufgabeSubmit = (aufgabeData) => {
        if (selectedAufgabe) {
            onUpdateAufgabe(recordId, selectedAufgabe.id, aufgabeData);
        } else {
            onAddAufgabe(recordId, aufgabeData);
        }
        handleCloseAufgabeModal();
    };

    const sortedAufgaben = useMemo(() => {
        if (!aufgaben) return { active: [], history: [] };
        const active = aufgaben
            .filter(f => !f.erledigt)
            .sort((a, b) => new Date(a.faelligkeitsdatum) - new Date(b.faelligkeitsdatum));
        const history = aufgaben
            .filter(f => f.erledigt)
            .sort((a, b) => new Date(b.faelligkeitsdatum) - new Date(a.faelligkeitsdatum));
        return { active, history };
    }, [aufgaben]);

    const AufgabeItem = ({ aufgabe, isHistory = false }) => (
        <div className={`p-3 mb-2 rounded-md flex items-center justify-between ${isHistory ? 'bg-green-100' : 'bg-red-50'}`}>
            <div className="flex-grow">
                <div className="flex items-start">
                    {!isHistory && canEdit && (
                        <input
                            type="checkbox"
                            checked={!!aufgabe.erledigt}
                            onChange={(e) => {
                                e.stopPropagation();
                                onToggleAufgabeErledigt(recordId, aufgabe.id);
                            }}
                            className="h-5 w-5 mr-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                    )}
                    <div className="flex-grow">
                        <p className="font-semibold text-gray-800">{aufgabe.titel || aufgabe.beschreibung}</p>
                        <p className="text-sm text-gray-600">Fällig am: {formatDate(aufgabe.faelligkeitsdatum)}</p>
                        {aufgabe.inhalt && <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{aufgabe.inhalt}</p>}
                    </div>
                </div>
            </div>
            {(canEdit || canDelete) && (
                <div className="flex items-center ml-4">
                    {canEdit && (
                        <button onClick={() => handleOpenAufgabeModal(aufgabe)} className="p-1 text-blue-600 hover:text-blue-800" title="Bearbeiten">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                        </button>
                    )}
                    {canDelete && (
                        <button onClick={() => onDeleteAufgabe(recordId, aufgabe.id)} className="p-1 text-red-600 hover:text-red-800 ml-2" title="Löschen">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    )}
                </div>
            )}
        </div>
    );


    return (
        <div className="bg-gray-50 p-4 rounded-lg shadow-inner h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Aufgaben</h3>
                {canEdit && (
                    <Button onClick={() => handleOpenAufgabeModal(null)} className="bg-green-600 hover:bg-green-700 px-3 py-1 text-sm">
                        + Aufgabe
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-4">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 font-medium text-sm ${activeTab === 'active' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Aktive Aufgaben ({sortedAufgaben.active.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 font-medium text-sm ${activeTab === 'history' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    History ({sortedAufgaben.history.length})
                </button>
            </div>

            {/* Content */}
            <div className="h-[calc(100vh-350px)] overflow-y-auto pr-2">
                {activeTab === 'active' ? (
                    sortedAufgaben.active.length > 0 ? (
                        sortedAufgaben.active.map(aufgabe => <AufgabeItem key={aufgabe.id} aufgabe={aufgabe} />)
                    ) : (
                        <p className="text-center text-gray-500 py-8">Keine aktiven Aufgaben.</p>
                    )
                ) : (
                    sortedAufgaben.history.length > 0 ? (
                        sortedAufgaben.history.map(aufgabe => <AufgabeItem key={aufgabe.id} aufgabe={aufgabe} isHistory={true} />)
                    ) : (
                        <p className="text-center text-gray-500 py-8">Keine erledigten Aufgaben.</p>
                    )
                )}
            </div>

            {isAufgabeModalOpen && (
                <Modal isOpen={isAufgabeModalOpen} onClose={handleCloseAufgabeModal}>
                    <AufgabenForm
                        aufgabe={selectedAufgabe}
                        onSubmit={handleAufgabeSubmit}
                        onCancel={handleCloseAufgabeModal}
                    />
                </Modal>
            )}
        </div>
    );
};

export default AufgabenPanel;