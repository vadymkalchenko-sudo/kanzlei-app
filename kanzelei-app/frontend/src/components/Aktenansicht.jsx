import React, { useState, useRef, useMemo } from 'react';
import { Button } from './ui/Button.jsx';
import { Modal } from './ui/Modal.jsx';
import DocumentForm from './DocumentForm.jsx';
import NoteForm from './NoteForm.jsx';

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
  onToggleNoteErledigt,
  onUpdateRecord,
}) => {
  const fileInputRef = useRef(null);
  const [isEditDocModalOpen, setIsEditDocModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [quickMerke, setQuickMerke] = useState(record?.quick_merke || '');
  const [sortOrder, setSortOrder] = useState('desc');

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

  const handleUpdateDocSubmit = (updatedData) => {
    onUpdateDocument(record.id, selectedDoc.id, updatedData);
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

  const handleNoteSubmit = (noteData) => {
    if (selectedNote) {
      onUpdateNote(record.id, selectedNote.id, noteData);
    } else {
      onAddNote(record.id, noteData);
    }
    handleCloseNoteModal();
  };

  const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const combinedItems = useMemo(() => {
    const documents = (record?.dokumente || []).filter(Boolean).map(doc => ({ ...doc, itemType: 'document', date: doc.datum }));
    const notes = (record?.notizen || []).filter(Boolean).map(note => ({ ...note, itemType: 'note', date: note.aktualisierungsdatum }));

    const allItems = [...documents, ...notes];

    return allItems.sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : null;
      const dateB = b.date ? new Date(b.date) : null;

      const aIsValid = dateA && !isNaN(dateA);
      const bIsValid = dateB && !isNaN(dateB);

      if (aIsValid && !bIsValid) return -1;
      if (!aIsValid && bIsValid) return 1;
      if (!aIsValid && !bIsValid) return 0;

      return sortOrder === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });
  }, [record?.dokumente, record?.notizen, sortOrder]);

  const handleOpenDocument = (doc) => {
    if (!doc.content) {
      alert('Dokumenteninhalt nicht gefunden. Die Datei wurde möglicherweise vor der Inhalts-Speicherung hochgeladen.');
      return;
    }
    const blob = base64ToBlob(doc.content, doc.format);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.beschreibung || 'dokument';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const simplifyFormat = (doc) => {
    const extension = doc.beschreibung.split('.').pop().toLowerCase();
    return extension === doc.beschreibung.toLowerCase() ? (doc.format || 'Unbekannt') : extension;
  };

  const gegner = record.gegnerId && dritteBeteiligte
    ? dritteBeteiligte.find(d => d.id === record.gegnerId)
    : null;

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Aktenansicht: {record.caseNumber}</h2>
          {record.unfallDatum && (
            <p className="text-lg text-gray-600">Unfalldatum: {formatDate(record.unfallDatum)}</p>
          )}
        </div>
        <div className="flex-grow ml-12">
          <label htmlFor="quick-merke" className="block text-sm font-medium text-gray-700 mb-1">
            Quick-Notes / Merke
          </label>
          <textarea
            id="quick-merke"
            value={quickMerke}
            onChange={handleQuickMerkeChange}
            onBlur={handleQuickMerkeBlur}
            className="w-full h-20 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Schnelle Notizen hier eingeben..."
          />
        </div>
        <div className="ml-4">
          <Button onClick={onGoBack}>Zurück zur Übersicht</Button>
        </div>
      </div>

      {/* Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold text-lg mb-2 flex items-center">
            Mandant
            <button onClick={() => onDirectEdit(mandant, 'mandanten')} className="ml-2 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
            </button>
          </h3>
          <p>{mandant.name}</p>
          <p>{mandant.street}, {mandant.zipCode} {mandant.city}</p>
          <p>{mandant.email}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold text-lg mb-2 flex items-center">
            Gegner
            {gegner && (
              <button onClick={() => onDirectEdit(gegner, 'dritte')} className="ml-2 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full">
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
          <p>Kennzeichen: {record.gegnerKennzeichen || 'N/A'}</p>
        </div>
      </div>

      {/* Document Management Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Dokumenten- und Notizverwaltung</h3>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Sortieren:</label>
            <Button
              onClick={() => setSortOrder('desc')}
              className={`px-3 py-1 text-sm rounded-md ${sortOrder === 'desc' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              Neueste zuerst
            </Button>
            <Button
              onClick={() => setSortOrder('asc')}
              className={`px-3 py-1 text-sm rounded-md ${sortOrder === 'asc' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              Älteste zuerst
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div onDragOver={handleDragOver} onDrop={handleDrop} className="flex-grow border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100">
            <p className="text-gray-500">Dateien hierher ziehen</p>
          </div>
          <Button onClick={handleFileSelectClick} className="bg-gray-600 hover:bg-gray-700">Oder Dateien auswählen</Button>
          <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" multiple />
          <Button onClick={() => handleOpenNoteModal(null)} className="bg-green-600 hover:bg-green-700">
            + Frist / Notiz hinzufügen
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 border-b text-center">Typ</th>
                <th className="px-4 py-2 border-b">Datum</th>
                <th className="px-4 py-2 border-b">Beschreibung / Titel</th>
                <th className="px-4 py-2 border-b">Format / Art</th>
                <th className="px-4 py-2 border-b text-right">Soll</th>
                <th className="px-4 py-2 border-b text-right">Haben</th>
                <th className="px-4 py-2 border-b text-center">Erledigt</th>
                <th className="px-4 py-2 border-b text-center">Aktionen</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {combinedItems.length > 0 ? (
                combinedItems.map((item) => (
                  <tr
                    key={item.id}
                    onDoubleClick={() => item.itemType === 'document' ? handleOpenDocument(item) : handleOpenNoteModal(item)}
                    className={`hover:bg-gray-50 cursor-pointer ${item.itemType === 'note' && item.datum && !item.erledigt ? 'bg-red-50' : ''} ${item.itemType === 'note' && item.erledigt ? 'bg-green-100' : ''}`}
                  >
                    <td className="px-4 py-2 border-b text-center">{item.itemType === 'document' ? '📄' : (item.datum ? '📅' : '📝')}</td>
                    <td className="px-4 py-2 border-b">{formatDate(item.datum ? item.datum : item.date)}</td>
                    <td className="px-4 py-2 border-b">{item.itemType === 'document' ? item.beschreibung : item.titel}</td>
                    <td className="px-4 py-2 border-b">{item.itemType === 'document' ? simplifyFormat(item) : item.typ}</td>
                    <td className="px-4 py-2 border-b text-right">{item.itemType === 'document' && item.soll ? `${item.soll.toFixed(2)} €` : '–'}</td>
                    <td className="px-4 py-2 border-b text-right">{item.itemType === 'document' && item.haben ? `${item.haben.toFixed(2)} €` : '–'}</td>
                    <td className="px-4 py-2 border-b text-center">
                      {item.itemType === 'note' && item.datum ? (
                        <input
                          type="checkbox"
                          checked={!!item.erledigt}
                          onChange={(e) => { e.stopPropagation(); onToggleNoteErledigt(record.id, item.id); }}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      ) : '–'}
                    </td>
                    <td className="px-4 py-2 border-b text-center">
                      {item.itemType === 'document' ? (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(item); }} className="p-1 text-blue-600 hover:text-blue-800" title="Bearbeiten">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteDocument(record.id, item.id); }} className="p-1 text-red-600 hover:text-red-800 ml-2" title="Löschen">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); handleOpenNoteModal(item); }} className="p-1 text-blue-600 hover:text-blue-800" title="Bearbeiten">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteNote(record.id, item.id); }} className="p-1 text-red-600 hover:text-red-800 ml-2" title="Löschen">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="8" className="text-center py-12 text-gray-500">Keine Dokumente oder Notizen vorhanden.</td></tr>
              )}
            </tbody>
          </table>
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
    </div>
  );
};

export default Aktenansicht;