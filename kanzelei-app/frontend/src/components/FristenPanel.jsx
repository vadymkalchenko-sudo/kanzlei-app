import React, { useState, useMemo } from 'react';
import { Button } from './ui/Button.jsx';
import { Modal } from './ui/Modal.jsx';
import FristenForm from './FristenForm.jsx';

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
};

const FristenPanel = ({
    recordId,
    fristen,
    onAddFrist,
    onUpdateFrist,
    onDeleteFrist,
    onToggleFristErledigt
}) => {
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
    const [isFristModalOpen, setIsFristModalOpen] = useState(false);
    const [selectedFrist, setSelectedFrist] = useState(null);

    const handleOpenFristModal = (frist = null) => {
        setSelectedFrist(frist);
        setIsFristModalOpen(true);
    };

    const handleCloseFristModal = () => {
        setSelectedFrist(null);
        setIsFristModalOpen(false);
    };

    const handleFristSubmit = (fristData) => {
        if (selectedFrist) {
            onUpdateFrist(recordId, selectedFrist.id, fristData);
        } else {
            onAddFrist(recordId, fristData);
        }
        handleCloseFristModal();
    };

    const sortedFristen = useMemo(() => {
        if (!fristen) return { active: [], history: [] };
        const active = fristen
            .filter(f => !f.erledigt)
            .sort((a, b) => new Date(a.datum) - new Date(b.datum));
        const history = fristen
            .filter(f => f.erledigt)
            .sort((a, b) => new Date(b.datum) - new Date(a.datum));
        return { active, history };
    }, [fristen]);

    const FristItem = ({ frist, isHistory = false }) => (
        <div className={`p-3 mb-2 rounded-md flex items-center justify-between ${isHistory ? 'bg-green-100' : 'bg-red-50'}`}>
            <div className="flex items-center">
                {!isHistory && (
                    <input
                        type="checkbox"
                        checked={!!frist.erledigt}
                        onChange={(e) => {
                            e.stopPropagation();
                            onToggleFristErledigt(recordId, frist.id);
                        }}
                        className="h-5 w-5 mr-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                )}
                <div>
                    <p className="font-semibold text-gray-800">{frist.titel}</p>
                    <p className="text-sm text-gray-600">{formatDate(frist.datum)}</p>
                </div>
            </div>
            <div className="flex items-center">
                <button onClick={() => handleOpenFristModal(frist)} className="p-1 text-blue-600 hover:text-blue-800" title="Bearbeiten">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                </button>
                <button onClick={() => onDeleteFrist(recordId, frist.id)} className="p-1 text-red-600 hover:text-red-800 ml-2" title="Löschen">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        </div>
    );

    return (
        <div className="bg-gray-50 p-4 rounded-lg shadow-inner h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Fristen-Management</h3>
                <Button onClick={() => handleOpenFristModal(null)} className="bg-green-600 hover:bg-green-700">
                    + Neue Frist
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-4">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 font-medium text-sm ${activeTab === 'active' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Aktive Fristen ({sortedFristen.active.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 font-medium text-sm ${activeTab === 'history' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    History ({sortedFristen.history.length})
                </button>
            </div>

            {/* Content */}
            <div className="h-[calc(100vh-350px)] overflow-y-auto pr-2">
                {activeTab === 'active' ? (
                    sortedFristen.active.length > 0 ? (
                        sortedFristen.active.map(frist => <FristItem key={frist.id} frist={frist} />)
                    ) : (
                        <p className="text-center text-gray-500 py-8">Keine aktiven Fristen.</p>
                    )
                ) : (
                    sortedFristen.history.length > 0 ? (
                        sortedFristen.history.map(frist => <FristItem key={frist.id} frist={frist} isHistory={true} />)
                    ) : (
                        <p className="text-center text-gray-500 py-8">Keine erledigten Fristen.</p>
                    )
                )}
            </div>

            {isFristModalOpen && (
                <Modal isOpen={isFristModalOpen} onClose={handleCloseFristModal}>
                    <FristenForm
                        frist={selectedFrist}
                        onSubmit={handleFristSubmit}
                        onCancel={handleCloseFristModal}
                    />
                </Modal>
            )}
        </div>
    );
};

export default FristenPanel;