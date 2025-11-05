import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as api from '../api';

/**
 * Ein benutzerdefinierter Hook, der die gesamte Geschäftslogik der Anwendung kapselt.
 * Er interagiert mit der API-Schicht, um Daten zu verwalten.
 */
export const useKanzleiLogic = (isLoggedIn, onLogout) => {
  const [isAppReady, setIsAppReady] = useState(false);
  const [records, setRecords] = useState([]);
  const [mandanten, setMandanten] = useState([]);
  const [dritteBeteiligte, setDritteBeteiligte] = useState([]);
  
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const messageTimerRef = useRef(null);

  const setFlashMessage = (msg) => {
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
    setMessage(msg);
    if (msg) {
      messageTimerRef.current = setTimeout(() => {
        setMessage(null);
      }, 5000);
    }
  };

  const fetchData = useCallback(async (signal) => {
    try {
      console.log("--- [FETCH START] ---");
      const [mandantenData, recordsData, dritteData] = await Promise.all([
        api.getMandanten(signal),
        api.getRecords(signal),
        api.getDritteBeteiligte(signal),
      ]);

      setMandanten(mandantenData || []);
      setRecords(recordsData || []);
      setDritteBeteiligte(dritteData || []);
      
      console.log("--- [FETCH END] ---");

    } catch (error) {
     if (error.name !== 'AbortError') {
       if (error.status === 401 || error.status === 403) {
         onLogout();
       } else {
         console.error("[FETCH ERROR]", error);
         setFlashMessage(`Fehler beim Laden der Daten: ${error.message}`);
       }
     }
   } finally {
      setIsAppReady(true);
    }
  }, [onLogout]);

  const filteredRecords = useMemo(() => {
    if (!searchTerm) {
      return records;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return records.filter(record => {
      const mandant = mandanten.find(m => m.id === record.mandantId);
      const clientName = mandant ? mandant.name.toLowerCase() : '';
      const caseNumber = record.aktenzeichen.toLowerCase();
      return clientName.includes(lowercasedFilter) || caseNumber.includes(lowercasedFilter);
    });
  }, [searchTerm, records, mandanten]);

  const todayDueRecords = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recordsWithDueTasks = records.map(record => {
        const aufgaben = record.aufgaben || [];
        const openTasks = aufgaben.filter(aufgabe => {
            if (aufgabe.erledigt) return false;
            const deadlineDate = aufgabe.deadline || aufgabe.datum;
            if (!deadlineDate) return false;
            const deadline = new Date(deadlineDate);
            return deadline <= today;
        });

        if (openTasks.length === 0) return null;

        const oldestDeadline = openTasks.reduce((oldest, current) => {
            const currentDate = new Date(current.deadline || current.datum);
            return currentDate < oldest ? currentDate : oldest;
        }, new Date(openTasks[0].deadline || openTasks[0].datum));

        return { ...record, oldestDeadline };
    }).filter(Boolean);

    recordsWithDueTasks.sort((a, b) => a.oldestDeadline - b.oldestDeadline);

    return recordsWithDueTasks;
  }, [records]);

  useEffect(() => {
    if (isLoggedIn) {
      const controller = new AbortController();
      fetchData(controller.signal);

      return () => {
        controller.abort();
      };
    }
  }, [isLoggedIn, fetchData]);

  const nextCaseNumber = useMemo(() => {
    if (!records) return '1.25.awr';

    const highestNum = records.reduce((max, record) => {
        const match = record.aktenzeichen.match(/^(\d+)\.\d{2}\.awr$/);
        if (match) {
            return Math.max(max, parseInt(match[1], 10));
        }
        return max;
    }, 0);

    const nextNum = highestNum + 1;
    const year = new Date().getFullYear().toString().slice(-2);
    return `${nextNum}.${year}.awr`;
  }, [records]);


  const handleRecordSubmit = async (formData) => {
    try {
        const { clientJustCreated, ...recordFormData } = formData;

        if (formData.id) {
            await api.updateRecord(formData.id, recordFormData);
            setFlashMessage('Akte erfolgreich aktualisiert!');
        } else {
            await api.createRecord(recordFormData);
            setFlashMessage('Neue Akte erfolgreich angelegt!');
        }

      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler: ${error.message}`);
      console.error(error);
      throw error;
    }
  };
  
  const handleMandantSubmit = async (mandantData, options = { showMessage: true, fetchData: true }) => {
    try {
      let newMandant = null;
      if (mandantData.id) {
        newMandant = await api.updateMandant(mandantData.id, mandantData);
        if (options.showMessage) setFlashMessage('Mandant erfolgreich aktualisiert!');
      } else {
        newMandant = await api.createMandant(mandantData);
        if (options.showMessage) setFlashMessage('Neuer Mandant erfolgreich angelegt!');
      }

      if (options.fetchData) {
        fetchData();
      }
      return newMandant;
    } catch (error) {
      setFlashMessage(`Fehler: ${error.message}`);
      throw error;
    }
  };

  const handleAddDocuments = async (recordId, files) => {
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('documents', file);
      });

      await api.uploadDocuments(recordId, formData);
      setFlashMessage(`${files.length} Dokument(e) erfolgreich hochgeladen.`);
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler beim Hinzufügen von Dokumenten: ${error.message}`);
    }
  };

  const handleDeleteMandant = async (mandantId) => {
    try {
      const openRecords = records.filter(
        (r) => r.mandantId === mandantId && r.status === 'offen'
      );

      if (openRecords.length > 0) {
        const recordNumbers = openRecords.map((r) => r.aktenzeichen).join(', ');
        setFlashMessage(
          `Mandant kann nicht gelöscht werden. Es gibt noch offene Akten: ${recordNumbers}`
        );
        return;
      }

      await api.deleteMandant(mandantId);
      setFlashMessage('Mandant erfolgreich gelöscht!');
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler: ${error.message}`);
    }
  };

  const handleUpdateDocument = async (recordId, documentId, updatedDocData) => {
    try {
      const recordToUpdate = records.find(r => r.id === recordId);
      if (!recordToUpdate) {
        throw new Error('Akte nicht gefunden');
      }

      const updatedDocuments = recordToUpdate.dokumente.map(doc =>
        doc.id === documentId ? { ...doc, ...updatedDocData } : doc
      );

      const updatedRecord = {
        ...recordToUpdate,
        dokumente: updatedDocuments,
      };

      await api.updateRecord(recordId, updatedRecord);
      setFlashMessage('Dokument erfolgreich aktualisiert.');
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler beim Aktualisieren des Dokuments: ${error.message}`);
    }
  };

  const handleAddNote = async (recordId, noteData) => {
    try {
      await api.addNote(recordId, noteData);
      setFlashMessage('Notiz erfolgreich hinzugefügt.');
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler beim Hinzufügen der Notiz: ${error.message}`);
    }
  };

  const handleUpdateNote = async (recordId, noteId, noteData) => {
    try {
      await api.updateNote(recordId, noteId, noteData);
      setFlashMessage('Notiz erfolgreich aktualisiert.');
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler beim Aktualisieren der Notiz: ${error.message}`);
    }
  };

  const handleDeleteNote = async (recordId, noteId) => {
    try {
      await api.deleteNote(recordId, noteId);
      setFlashMessage('Notiz erfolgreich gelöscht.');
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler beim Löschen der Notiz: ${error.message}`);
    }
  };

  const handleToggleNoteErledigt = async (recordId, noteId) => {
    try {
      const recordToUpdate = records.find(r => r.id === recordId);
      if (!recordToUpdate) throw new Error('Akte nicht gefunden');

      const updatedNotizen = recordToUpdate.notizen.map(note =>
        note.id === noteId ? { ...note, erledigt: !note.erledigt } : note
      );

      const updatedRecord = {
        ...recordToUpdate,
        notizen: updatedNotizen,
      };

      await api.updateRecord(recordId, updatedRecord);
      setFlashMessage('Notiz-Status erfolgreich geändert.');
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler beim Ändern des Notiz-Status: ${error.message}`);
    }
  };

  const handleAddAufgabe = async (recordId, aufgabeData) => {
    try {
      const noteData = {
        titel: aufgabeData.titel,
        inhalt: aufgabeData.details || '',
        typ: 'Aufgabe',
        erledigt: false,
        erstellungsdatum: aufgabeData.datum,
      };
      await api.addNote(recordId, noteData);
      setFlashMessage('Aufgabe erfolgreich hinzugefügt.');
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler beim Hinzufügen der Aufgabe: ${error.message}`);
    }
  };

  const handleUpdateAufgabe = async (recordId, aufgabeId, aufgabeData) => {
    try {
      const noteData = {
        titel: aufgabeData.titel,
        inhalt: aufgabeData.details || '',
        typ: 'Aufgabe',
        erstellungsdatum: aufgabeData.datum,
      };
      await api.updateNote(recordId, aufgabeId, noteData);
      setFlashMessage('Aufgabe erfolgreich aktualisiert.');
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler beim Aktualisieren der Aufgabe: ${error.message}`);
    }
  };

  const handleDeleteAufgabe = async (recordId, aufgabeId) => {
    try {
      await api.deleteNote(recordId, aufgabeId);
      setFlashMessage('Aufgabe erfolgreich gelöscht.');
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler beim Löschen der Aufgabe: ${error.message}`);
    }
  };

  const handleToggleAufgabeErledigt = async (recordId, aufgabeId) => {
    try {
      const record = records.find(r => r.id === recordId);
      const note = record?.notizen.find(n => n.id === aufgabeId);
      if (!note) throw new Error('Aufgabe nicht gefunden');

      const updatedNote = { ...note, erledigt: !note.erledigt };
      
      await api.updateNote(recordId, aufgabeId, updatedNote);
      setFlashMessage('Aufgaben-Status erfolgreich geändert.');
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler beim Ändern des Aufgaben-Status: ${error.message}`);
    }
  };

  const handleDeleteDocument = async (recordId, documentId) => {
    try {
      await api.deleteDocument(documentId);
      setFlashMessage('Dokument erfolgreich gelöscht.');
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler beim Löschen des Dokuments: ${error.message}`);
    }
  };

  const handleDritteSubmit = async (data) => {
    try {
      if (data.id) {
        await api.updateDritteBeteiligte(data.id, data);
        setFlashMessage('Dritter Beteiligter erfolgreich aktualisiert!');
        fetchData();
        return null;
      } else {
        const newItem = await api.createDritteBeteiligte(data);
        setFlashMessage('Neuer Dritter Beteiligter erfolgreich angelegt!');
        fetchData();
        return newItem;
      }
    } catch (error) {
      setFlashMessage(`Fehler: ${error.message}`);
      return null;
    }
  };

  const handleDeleteDritte = async (id) => {
    try {
      await api.deleteDritteBeteiligte(id);
      setFlashMessage('Dritter Beteiligter erfolgreich gelöscht!');
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler: ${error.message}`);
    }
  };

  const handleUpdateRecord = async (recordId, updatedData) => {
    try {
      const recordToUpdate = records.find((r) => r.id === recordId);
      if (!recordToUpdate) {
        throw new Error('Akte nicht gefunden');
      }

      const updatedRecord = { ...recordToUpdate, ...updatedData };

      await api.updateRecord(recordId, updatedRecord);
      setFlashMessage('Akte erfolgreich aktualisiert.');
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler beim Aktualisieren der Akte: ${error.message}`);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    try {
      await api.deleteRecord(recordId);
      setFlashMessage('Akte erfolgreich gelöscht!');
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler: ${error.message}`);
    }
  };

  const handleExport = async () => {
    try {
      const data = await api.exportData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      const link = document.createElement('a');
      link.href = jsonString;
      link.download = `kanzlei-backup-${new Date().toISOString()}.json`;
      link.click();
      setFlashMessage('Daten erfolgreich exportiert.');
    } catch (error) {
      setFlashMessage(`Export-Fehler: ${error.message}`);
    }
  };

  const handleImport = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.importData(data);
      setFlashMessage('Daten erfolgreich importiert. Die Ansicht wird aktualisiert.');
      fetchData();
    } catch (error) {
      setFlashMessage(`Import-Fehler: ${error.message}`);
    }
  };

  return {
    isAppReady,
    records: filteredRecords,
    todayDueRecords,
    mandanten,
    dritteBeteiligte,
    message,
    setFlashMessage,
    handleMandantSubmit,
    handleDeleteMandant,
    handleDritteSubmit,
    handleDeleteDritte,
    handleRecordSubmit,
    handleDeleteRecord,
    handleUpdateRecord,
    handleAddDocuments,
    handleUpdateDocument,
    handleDeleteDocument,
    handleAddNote,
    handleUpdateNote,
    handleDeleteNote,
    handleToggleNoteErledigt,
    handleAddAufgabe,
    handleUpdateAufgabe,
    handleDeleteAufgabe,
    handleToggleAufgabeErledigt,
    fetchData,
    handleExport,
    handleImport,
    nextCaseNumber,
    setSearchTerm,
    allRecords: records, // Für die Validierung
  };
};

export default useKanzleiLogic;