import React, { useState, useRef, useMemo } from 'react';
import * as api from '../api';
import { AkteService } from '../services/akteService';
import { Button } from './ui/Button.jsx';
import { Modal } from './ui/Modal.jsx';
import DocumentForm from './DocumentForm.jsx';
import NoteForm from './NoteForm.jsx';
import AufgabenPanel from './AufgabenPanel.jsx';
import ConfirmModal from './ui/ConfirmModal.jsx';

export const Aktenansicht = ({
  record,
  mandant,
  dritteBeteiligte,
  onGoBack,
  onDirectEdit,
  onAddDocuments,
  onDeleteDocument,
  onUpdateDocument,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onUpdateRecord,
  onDeleteRecord,
  // Aufgaben-Props
  onAddAufgabe,
  onUpdateAufgabe,
  onDeleteAufgabe,
  onToggleAufgabeErledigt,
  onCloseAkte,
  userRole,
}) => {
  const fileInputRef = useRef(null);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [isConfirmCloseModalOpen, setIsConfirmCloseModalOpen] = useState(false);
  const [isEditDocModalOpen, setIsEditDocModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [quickMerke, setQuickMerke] = useState(record?.quick_merke || '');
  const [sortOrder, setSortOrder] = useState('desc');
  const [editingCell, setEditingCell] = useState(null); // { id: string, field: 'soll' | 'haben' }
  const [editValue, setEditValue] = useState('');

  const canEdit = userRole === 'admin' || userRole === 'power_user' || userRole === 'user';
  const canDelete = userRole === 'admin' || userRole === 'power_user';

  const toggleSortOrder = () => {
    setSortOrder(prevOrder => prevOrder === 'desc' ? 'asc' : 'desc');
  };

  const handleCellClick = (item, field) => {
    setEditingCell({ id: item.id, field });
    const value = item[field === 'soll' ? 'betrag_soll' : 'betrag_haben'] || 0;
    setEditValue(value.toString().replace('.', ','));
  };

  const handleEditBlur = () => {
    if (!editingCell) return;

    const { id, field } = editingCell;
    const item = combinedItems.find(i => i.id === id);
    if (!item) {
        setEditingCell(null);
        return;
    }

    const isDocument = item.itemType === 'document';
    const numericValue = parseFloat(editValue.replace(',', '.')) || 0;

    const updateData = {
      [field === 'soll' ? 'betrag_soll' : 'betrag_haben']: numericValue,
    };

    const updateFn = isDocument ? onUpdateDocument : onUpdateNote;
    updateFn(record.id, id, updateData);

    // Aggregation nach dem Update auslösen und Akte neu laden
    setTimeout(async () => {
      try {
        const updatedRecord = await api.aggregateRecord(record.id);
        // Aktualisiere den Record-State in der übergeordneten Komponente
        onUpdateRecord(record.id, updatedRecord);
      } catch (error) {
        console.error('Fehler bei der Aggregation:', error);
      }
    }, 100); // Kurze Verzögerung, um sicherzustellen, dass das Update durchgeführt wurde

    setEditingCell(null);
    setEditValue('');
  };

  const handleQuickMerkeChange = (e) => {
    setQuickMerke(e.target.value);
  };

  const handleQuickMerkeBlur = () => {
    if (quickMerke !== (record?.quick_merke || '')) {
      onUpdateRecord(record.id, { quick_merke: quickMerke });
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onAddDocuments(record.id, files);
      e.dataTransfer.clearData();
    }
  };

  const handleFileSelectClick = () => { fileInputRef.current.click(); };

  const handleFileSelected = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onAddDocuments(record.id, files);
    }
  };

  const handleOpenEditModal = (doc) => {
    setSelectedDoc(doc);
    setIsEditDocModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditDocModalOpen(false);
    setSelectedDoc(null);
  };

  const handleUpdateDocSubmit = async (updatedData) => {
    await onUpdateDocument(record.id, selectedDoc.id, updatedData);
    
    // Aggregation nach dem Update auslösen und Akte neu laden
    try {
      const updatedRecord = await api.aggregateRecord(record.id);
      // Aktualisiere den Record-State in der übergeordneten Komponente
      onUpdateRecord(record.id, updatedRecord);
    } catch (error) {
      console.error('Fehler bei der Aggregation:', error);
    }
    
    handleCloseEditModal();
  };

  const handleOpenNoteModal = (note = null) => {
    setSelectedNote(note);
    setIsNoteModalOpen(true);
  };

  const handleCloseNoteModal = () => {
    setIsNoteModalOpen(false);
    setSelectedNote(null);
  };

  const handleNoteSubmit = async (noteData) => {
    if (selectedNote) {
      await onUpdateNote(record.id, selectedNote.id, noteData);
    } else {
      await onAddNote(record.id, noteData);
    }
    
    // Aggregation nach dem Update auslösen und Akte neu laden
    try {
      const updatedRecord = await api.aggregateRecord(record.id);
      // Aktualisiere den Record-State in der übergeordneten Komponente
      onUpdateRecord(record.id, updatedRecord);
    } catch (error) {
      console.error('Fehler bei der Aggregation:', error);
    }
    
    handleCloseNoteModal();
  };

  const handleDeleteAkte = () => {
    setIsConfirmDeleteModalOpen(true);
  };

  const confirmDeleteAkte = () => {
    onDeleteRecord(record.id);
    onGoBack();
  };

  const handleCloseAkte = () => {
    setIsConfirmCloseModalOpen(true);
  };

  const confirmCloseAkte = () => {
    onCloseAkte(record.id);
    setIsConfirmCloseModalOpen(false);
  };


  const combinedItems = useMemo(() => {
    const documents = (record?.dokumente || []).filter(Boolean).map(doc => ({ ...doc, itemType: 'document', date: doc.hochgeladen_am, name: doc.dateiname }));
    const notes = (record?.notizen || []).filter(note => note && note.typ !== 'Aufgabe').map(note => ({ ...note, itemType: 'note', date: note.aktualisierungsdatum || note.erstellungsdatum }));

    // Identifiziere Archiv-Snapshots und passe deren Eigenschaften an
    const processedNotes = notes.map(note => {
      // Überprüfe, ob es sich um einen Archiv-Snapshot handelt
      if (note.typ === 'Archiv' && note.titel === 'Akte-Archiv') {
        try {
          // Versuche, den Inhalt als JSON zu parsen, um das Archivdatum zu extrahieren
          const archiveData = JSON.parse(note.inhalt);
          if (archiveData.archiviertAm) {
            return {
              ...note,
              itemType: 'archive',
              date: archiveData.archiviertAm,
              format: 'Archiv-Snapshot',
              beschreibung: 'Archivkopie der Akte zum Schließungsdatum',
              isArchiveSnapshot: true
            };
          }
        } catch (e) {
          // Wenn das Parsen fehlschlägt, handle als normale Notiz
          console.warn('Could not parse archive note content as JSON:', e);
        }
      }
      return note;
    });

    const allItems = [...documents, ...processedNotes];

    return allItems.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (sortOrder === 'desc') {
        return dateB - dateA;
      }
      return dateA - dateB;
    });
  }, [record?.dokumente, record?.notizen, sortOrder]);

  const netBalance = useMemo(() => {
    return AkteService.calculateNetBalance(record);
  }, [record]);

  const handleOpenDocument = async (documentId) => {
    try {
      const doc = await api.getDocument(documentId);
      if (!doc || !doc.data_b64) {
        throw new Error('Dokumentendaten unvollständig.');
      }

      const byteCharacters = atob(doc.data_b64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: doc.mimetype });
      
      const blobUrl = URL.createObjectURL(blob);
      
      // Erzeuge ein temporäres Link-Element, um den Download mit korrektem Namen zu erzwingen
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.dateiname; // Hier wird der korrekte Dateiname gesetzt
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(blobUrl);

    } catch (error) {
      console.error('Fehler beim Öffnen/Herunterladen des Dokuments:', error);
      alert('Fehler beim Herunterladen des Dokuments.');
    }
  };

  if (!record || !mandant) {
    return (
      <div>
        <p>Lade Akte...</p>
        <Button onClick={onGoBack}>Zurück zur Übersicht</Button>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        console.warn('Invalid date string received:', dateString);
        return 'Ungültiges Datum';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const simplifyFormat = (doc) => {
    const extension = doc?.name?.split('.')?.pop()?.toLowerCase();
    if (!extension) {
      return doc?.format || 'Unbekannt';
    }
    return extension === doc?.beschreibung?.toLowerCase() ? (doc?.format || 'Unbekannt') : extension;
  };

  const gegner = record.gegnerId && dritteBeteiligte
    ? dritteBeteiligte.find(d => d.id === record.gegnerId)
    : null;

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Aktenansicht: {record.aktenzeichen}</h2>
          {record.unfall_datum && (
            <p className="text-lg text-gray-600">Unfalldatum: {formatDate(record.unfall_datum)}</p>
          )}
        </div>
        <div className="flex-grow ml-12">
          <label htmlFor="quick-merke" className="block text-sm font-medium text-gray-700 mb-1">
            Quick-Notes / Merke
          </label>
          <input
            type="text"
            id="quick-merke"
            value={quickMerke}
            onChange={handleQuickMerkeChange}
            onBlur={handleQuickMerkeBlur}
            maxLength={100}
            className="w-full max-w-md p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Schnelle Notizen (max. 100 Zeichen)"
          />
        </div>
        <div className="ml-4 text-right">
            <h3 className="text-lg font-medium text-gray-500">Netto-Saldo</h3>
            <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netBalance.toFixed(2).replace('.', ',')} €
            </p>
        </div>
        <div className="ml-4 flex items-center space-x-2">
          <Button onClick={onGoBack}>Zurück zur Übersicht</Button>
          {canEdit && record.status !== 'geschlossen' && record.status !== 'archiviert' && (
            <Button onClick={handleCloseAkte} className="bg-red-500 hover:bg-red-600 text-white">
              Akte schließen
            </Button>
          )}
          {canDelete && (
            <Button onClick={handleDeleteAkte} className="bg-red-600 hover:bg-red-700 text-white">
              Akte löschen
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Overview Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg relative">
              <span className={`absolute top-2 right-2 text-xl font-bold ${mandant.iban ? 'text-green-500' : 'text-red-500'}`} title={mandant.iban ? 'IBAN vorhanden' : 'IBAN fehlt'}>
                €
              </span>
              <h3 className="font-bold text-lg mb-2 flex items-center">
                Mandant
                {canEdit && (
                  <button onClick={() => onDirectEdit(mandant, 'mandanten')} className="ml-2 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                  </button>
                )}
              </h3>
              <p>{mandant.name}</p>
              <p>{mandant.street}, {mandant.zipCode} {mandant.city}</p>
              <p>{mandant.email}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold text-lg mb-2 flex items-center">
                Gegner
                {canEdit && (
                  <button onClick={() => onDirectEdit(gegner || {}, 'dritte')} className="ml-2 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                  </button>
                )}
              </h3>
              {gegner ? (
                <div>
                  <p>{gegner.name}</p>
                  <p>{gegner.street}, {gegner.zipCode} {gegner.city}</p>
                  <p>{gegner.email}</p>
                </div>
              ) : (
                <p>N/A</p>
              )}
              <p>Kennzeichen: {record.gegner_kennzeichen || 'N/A'}</p>
            </div>
          </div>

          {/* Document Management Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Dokumenten- und Notizverwaltung</h3>
            </div>
            {canEdit && (
              <div className="flex items-center gap-4 mb-4">
                <div onDragOver={handleDragOver} onDrop={handleDrop} className="flex-grow border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100">
                  <p className="text-gray-500">Dateien hierher ziehen</p>
                </div>
                <Button onClick={handleFileSelectClick} className="bg-gray-600 hover:bg-gray-700">Oder Dateien auswählen</Button>
                <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" multiple />
                <Button onClick={() => handleOpenNoteModal(null)} className="bg-blue-600 hover:bg-blue-700">
                  + Notiz hinzufügen
                </Button>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-4 py-2 border-b text-center">Typ</th>
                    <th className="px-4 py-2 border-b cursor-pointer" onClick={toggleSortOrder}>
                      Datum {sortOrder === 'desc' ? '↓' : '↑'}
                    </th>
                    <th className="px-4 py-2 border-b">Beschreibung / Titel</th>
                    <th className="px-4 py-2 border-b">Format / Art</th>
                    <th className="px-4 py-2 border-b text-right">Soll</th>
                    <th className="px-4 py-2 border-b text-right">Haben</th>
                    {canEdit && <th className="px-4 py-2 border-b text-center">Aktionen</th>}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {combinedItems.length > 0 ? (
                    combinedItems.map((item) => (
                      <tr
                        key={item.id}
                        onDoubleClick={() => {
                          if (item.itemType === 'document') {
                            handleOpenDocument(item.id);
                          } else if (canEdit && !item.isArchiveSnapshot) {
                            handleOpenNoteModal(item);
                          }
                        }}
                        className={`hover:bg-gray-50 ${canEdit && !item.isArchiveSnapshot ? 'cursor-pointer' : ''}`}
                      >
                        <td className="px-4 py-2 border-b text-center">
                          {item.itemType === 'document' ? '📄' :
                           item.itemType === 'archive' ? '📦' : '📝'}
                        </td>
                        <td className="px-4 py-2 border-b">{formatDate(item.date)}</td>
                        <td className="px-4 py-2 border-b">
                          {item.itemType === 'document' ? item.dateiname :
                           item.itemType === 'archive' ? item.beschreibung || (item.titel || item.inhalt) :
                           (item.titel || item.inhalt)}
                        </td>
                        <td className="px-4 py-2 border-b">
                          {item.itemType === 'document' ? simplifyFormat(item) :
                           item.itemType === 'archive' ? item.format || 'Archiv-Snapshot' :
                           item.typ || 'Notiz'}
                        </td>
                        <td className="px-4 py-2 border-b text-right" onClick={() => canEdit && !item.isArchiveSnapshot && handleCellClick(item, 'soll')}>
                            {editingCell?.id === item.id && editingCell?.field === 'soll' && !item.isArchiveSnapshot ? (
                                <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleEditBlur}
                                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-24 p-1 text-right bg-yellow-100 border-blue-500 border rounded-md"
                                    autoFocus
                                />
                            ) : (
                                `${(parseFloat(item.betrag_soll) || 0).toFixed(2).replace('.', ',')} €`
                            )}
                        </td>
                        <td className="px-4 py-2 border-b text-right" onClick={() => canEdit && !item.isArchiveSnapshot && handleCellClick(item, 'haben')}>
                            {editingCell?.id === item.id && editingCell?.field === 'haben' && !item.isArchiveSnapshot ? (
                                <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleEditBlur}
                                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-24 p-1 text-right bg-yellow-100 border-blue-500 border rounded-md"
                                    autoFocus
                                />
                            ) : (
                                `${(parseFloat(item.betrag_haben) || 0).toFixed(2).replace('.', ',')} €`
                            )}
                        </td>
                        {canEdit && (
                          <td className="px-4 py-2 border-b text-center">
                            {item.itemType === 'document' ? (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(item); }} className="p-1 text-blue-600 hover:text-blue-800" title="Bearbeiten">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                </button>
                                {canDelete && (
                                  <button onClick={(e) => { e.stopPropagation(); onDeleteDocument(record.id, item.id); }} className="p-1 text-red-600 hover:text-red-800 ml-2" title="Löschen">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); handleOpenNoteModal(item); }} className="p-1 text-blue-600 hover:text-blue-800" title="Bearbeiten">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                </button>
                                {canDelete && (
                                  <button onClick={(e) => { e.stopPropagation(); onDeleteNote(record.id, item.id); }} className="p-1 text-red-600 hover:text-red-800 ml-2" title="Löschen">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                )}
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="7" className="text-center py-12 text-gray-500">Keine Dokumente oder Notizen vorhanden.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <AufgabenPanel
            recordId={record.id}
            aufgaben={(record.notizen || []).filter(note => note.typ === 'Aufgabe')}
            onAddAufgabe={onAddAufgabe}
            onUpdateAufgabe={onUpdateAufgabe}
            onDeleteAufgabe={onDeleteAufgabe}
            onToggleAufgabeErledigt={onToggleAufgabeErledigt}
            userRole={userRole}
          />
        </div>
      </div>

      {isEditDocModalOpen && (
        <Modal isOpen={isEditDocModalOpen} onClose={handleCloseEditModal}>
          <DocumentForm document={selectedDoc} onSubmit={handleUpdateDocSubmit} onCancel={handleCloseEditModal} />
        </Modal>
      )}

      {isNoteModalOpen && (
        <Modal isOpen={isNoteModalOpen} onClose={handleCloseNoteModal}>
          <NoteForm note={selectedNote} onSubmit={handleNoteSubmit} onCancel={handleCloseNoteModal} />
        </Modal>
      )}

      <ConfirmModal
        isOpen={isConfirmDeleteModalOpen}
        onClose={() => setIsConfirmDeleteModalOpen(false)}
        onConfirm={confirmDeleteAkte}
        title="Akte löschen"
        message="Sind Sie sicher, dass Sie diese Akte endgültig löschen möchten?"
      />

      <ConfirmModal
        isOpen={isConfirmCloseModalOpen}
        onClose={() => setIsConfirmCloseModalOpen(false)}
        onConfirm={confirmCloseAkte}
        title="Akte schließen"
        message="Möchten Sie diese Akte wirklich schließen und archivieren? Dieser Vorgang kann nicht rückgängig gemacht werden."
      />
    </div>
  );
};

export default Aktenansicht;