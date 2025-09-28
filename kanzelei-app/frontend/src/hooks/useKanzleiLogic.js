import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as api from '../api';
import { readFileAsBase64 } from '../utils';

// Generiert eine neue Aktennummer im Format [Laufende Nummer].[Zweistelliges Jahr].awr
const generateNewCaseNumber = (totalRecords) => {
  const year = new Date().getFullYear().toString().slice(-2);
  const nextId = totalRecords + 1;
  return `${nextId}.${year}.awr`;
};

/**
 * Ein benutzerdefinierter Hook, der die gesamte Geschäftslogik der Anwendung kapselt.
 * Er interagiert mit der API-Schicht, um Daten zu verwalten.
 */
export const useKanzleiLogic = () => {
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

  const fetchData = useCallback(async () => {
    try {
      const [mandantenData, recordsData, dritteData] = await Promise.all([
        api.getMandanten(),
        api.getRecords(),
        api.getDritteBeteiligte(),
      ]);

      // MIGRATE DATA: If a record has notes but no 'aufgaben' array, separate them.
      // This is a client-side migration that prepares the data for the UI.
      // The new structure will be persisted upon the next update to the record.
      const migratedRecords = recordsData.map(record => {
        // Ensure 'dokumente' and 'notizen' are arrays and add financial fields if missing.
        const migratedDokumente = (record.dokumente || []).map(doc => ({
          ...doc,
          betrag_soll: doc.betrag_soll ?? 0,
          betrag_haben: doc.betrag_haben ?? 0,
        }));

        const migratedNotizen = (record.notizen || []).map(note => ({
          ...note,
          betrag_soll: note.betrag_soll ?? 0,
          betrag_haben: note.betrag_haben ?? 0,
        }));

        // First, migrate fristen to aufgaben if fristen exists
        if (record.fristen) {
            record.aufgaben = [...(record.aufgaben || []), ...record.fristen];
            delete record.fristen;
        }

        if (record.aufgaben === undefined && record.notizen) {
          const aufgaben = record.notizen
            .filter(item => item.datum) // Deadlines are notes with a date
            .map(item => ({
              id: item.id,
              titel: item.titel,
              datum: item.datum,
              erledigt: !!item.erledigt,
              details: item.details || '',
            }));
          const notizen = record.notizen.filter(item => !item.datum);
          return { ...record, aufgaben, notizen: migratedNotizen, dokumente: migratedDokumente };
        }
        // Ensure aufgaben is at least an empty array to prevent downstream errors
        if (record.aufgaben === undefined) {
          return { ...record, aufgaben: [], notizen: migratedNotizen, dokumente: migratedDokumente };
        }
        return { ...record, notizen: migratedNotizen, dokumente: migratedDokumente };
      });

      setMandanten(mandantenData);
      setRecords(migratedRecords);
      setDritteBeteiligte(dritteData);
    } catch (error) {
      setFlashMessage(`Fehler beim Laden der Daten: ${error.message}`);
    } finally {
      setIsAppReady(true);
    }
  }, []);

  const filteredRecords = useMemo(() => {
    if (!searchTerm) {
      return records;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return records.filter(record => {
      const mandant = mandanten.find(m => m.id === record.mandantId);
      const clientName = mandant ? mandant.name.toLowerCase() : '';
      const caseNumber = record.caseNumber.toLowerCase();
      return clientName.includes(lowercasedFilter) || caseNumber.includes(lowercasedFilter);
    });
  }, [searchTerm, records, mandanten]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      return null;
    }
  };

  const handleAddDocuments = async (recordId, files) => {
    try {
      const recordToUpdate = records.find(r => r.id === recordId);
      if (!recordToUpdate) throw new Error('Akte nicht gefunden');

      const newDocuments = await Promise.all(Array.from(files).map(async (file) => {
        const content = await readFileAsBase64(file);
        return {
          id: `doc_${new Date().getTime()}_${Math.random()}`,
          datum: new Date().toISOString().split('T')[0],
          beschreibung: file.name,
          format: file.type || 'Unbekannt',
          content: content,
          soll: 0,
          haben: 0,
        };
      }));

      const updatedRecord = {
        ...recordToUpdate,
        dokumente: [...(recordToUpdate.dokumente || []), ...newDocuments],
      };

      await api.updateRecord(recordId, updatedRecord);
      setFlashMessage(`${files.length} Dokument(e) erfolgreich hinzugefügt.`);
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
        const recordNumbers = openRecords.map((r) => r.caseNumber).join(', ');
        setFlashMessage(
          `Mandant kann nicht gelöscht werden. Es gibt noch offene Akten: ${recordNumbers}`
        );
        return;
      }

      await api.deleteMandant(mandantId);
      setFlashMessage('Mandant erfolgreich gelöscht!');
      fetchData(); // Daten neu laden
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
      const recordToUpdate = records.find(r => r.id === recordId);
      if (!recordToUpdate) throw new Error('Akte nicht gefunden');

      const now = new Date().toISOString();
      const newNote = {
        id: `note_${new Date().getTime()}`,
        akte_id: recordId,
        ...noteData,
        betrag_soll: 0,
        betrag_haben: 0,
        autor: 'Sachbearbeiter_A', // Hardcoded as per spec for now
        typ: 'Notiz/Vermerk',
        erstelldatum: now,
        aktualisierungsdatum: now,
      };

      const updatedRecord = {
        ...recordToUpdate,
        notizen: [...(recordToUpdate.notizen || []), newNote],
      };

      await api.updateRecord(recordId, updatedRecord);
      setFlashMessage('Notiz erfolgreich hinzugefügt.');
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler beim Hinzufügen der Notiz: ${error.message}`);
    }
  };

  const handleUpdateNote = async (recordId, noteId, noteData) => {
    try {
      const recordToUpdate = records.find(r => r.id === recordId);
      if (!recordToUpdate) throw new Error('Akte nicht gefunden');

      const updatedNotizen = recordToUpdate.notizen.map(note =>
        note.id === noteId
          ? { ...note, ...noteData, aktualisierungsdatum: new Date().toISOString() }
          : note
      );

      const updatedRecord = {
        ...recordToUpdate,
        notizen: updatedNotizen,
      };

      await api.updateRecord(recordId, updatedRecord);
      setFlashMessage('Notiz erfolgreich aktualisiert.');
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler beim Aktualisieren der Notiz: ${error.message}`);
    }
  };

  const handleDeleteNote = async (recordId, noteId) => {
    try {
      const recordToUpdate = records.find(r => r.id === recordId);
      if (!recordToUpdate) throw new Error('Akte nicht gefunden');

      const updatedNotizen = recordToUpdate.notizen.filter(note => note.id !== noteId);

      const updatedRecord = {
        ...recordToUpdate,
        notizen: updatedNotizen,
      };

      await api.updateRecord(recordId, updatedRecord);
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

  // --- Aufgaben Management ---

  const handleAddAufgabe = async (recordId, aufgabeData) => {
    try {
        const recordToUpdate = records.find(r => r.id === recordId);
        if (!recordToUpdate) throw new Error('Akte nicht gefunden');

        const newAufgabe = {
            id: `aufgabe_${new Date().getTime()}`,
            ...aufgabeData,
            erledigt: false,
        };

        const updatedRecord = {
            ...recordToUpdate,
            aufgaben: [...(recordToUpdate.aufgaben || []), newAufgabe],
        };

        await api.updateRecord(recordId, updatedRecord);
        setFlashMessage('Aufgabe erfolgreich hinzugefügt.');
        fetchData();
    } catch (error) {
        setFlashMessage(`Fehler beim Hinzufügen der Aufgabe: ${error.message}`);
    }
  };

  const handleUpdateAufgabe = async (recordId, aufgabeId, aufgabeData) => {
    try {
        const recordToUpdate = records.find(r => r.id === recordId);
        if (!recordToUpdate) throw new Error('Akte nicht gefunden');

        const updatedAufgaben = recordToUpdate.aufgaben.map(aufgabe =>
            aufgabe.id === aufgabeId ? { ...aufgabe, ...aufgabeData } : aufgabe
        );

        const updatedRecord = {
            ...recordToUpdate,
            aufgaben: updatedAufgaben,
        };

        await api.updateRecord(recordId, updatedRecord);
        setFlashMessage('Aufgabe erfolgreich aktualisiert.');
        fetchData();
    } catch (error) {
        setFlashMessage(`Fehler beim Aktualisieren der Aufgabe: ${error.message}`);
    }
  };

  const handleDeleteAufgabe = async (recordId, aufgabeId) => {
    try {
        const recordToUpdate = records.find(r => r.id === recordId);
        if (!recordToUpdate) throw new Error('Akte nicht gefunden');

        const updatedAufgaben = recordToUpdate.aufgaben.filter(aufgabe => aufgabe.id !== aufgabeId);

        const updatedRecord = {
            ...recordToUpdate,
            aufgaben: updatedAufgaben,
        };

        await api.updateRecord(recordId, updatedRecord);
        setFlashMessage('Aufgabe erfolgreich gelöscht.');
        fetchData();
    } catch (error) {
        setFlashMessage(`Fehler beim Löschen der Aufgabe: ${error.message}`);
    }
  };

  const handleToggleAufgabeErledigt = async (recordId, aufgabeId) => {
    try {
        const recordToUpdate = records.find(r => r.id === recordId);
        if (!recordToUpdate) throw new Error('Akte nicht gefunden');

        const updatedAufgaben = recordToUpdate.aufgaben.map(aufgabe =>
            aufgabe.id === aufgabeId ? { ...aufgabe, erledigt: !aufgabe.erledigt } : aufgabe
        );

        const updatedRecord = {
            ...recordToUpdate,
            aufgaben: updatedAufgaben,
        };

        await api.updateRecord(recordId, updatedRecord);
        setFlashMessage('Aufgaben-Status erfolgreich geändert.');
        fetchData();
    } catch (error) {
        setFlashMessage(`Fehler beim Ändern des Aufgaben-Status: ${error.message}`);
    }
  };

  const handleDeleteDocument = async (recordId, documentId) => {
    try {
      const recordToUpdate = records.find(r => r.id === recordId);
      if (!recordToUpdate) {
        throw new Error('Akte nicht gefunden');
      }

      const updatedDokumente = recordToUpdate.dokumente.filter(d => d.id !== documentId);

      const updatedRecord = {
        ...recordToUpdate,
        dokumente: updatedDokumente,
      };

      await api.updateRecord(recordId, updatedRecord);
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
        return null; // Or the updated data
      } else {
        const newItem = await api.createDritteBeteiligte(data);
        setFlashMessage('Neuer Dritter Beteiligter erfolgreich angelegt!');
        fetchData();
        return newItem; // Return the new item
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

  const nextCaseNumber = generateNewCaseNumber(records.length);

  const handleRecordSubmit = async (formData) => {
    try {
      const { clientJustCreated, ...recordFormData } = formData;
      const {
        id, mandantId, status, gegnerId, unfallDatum, kennzeichen,
        mdtKennzeichen, gegnerKennzeichen, sonstigeBeteiligte, beteiligteDritte
      } = recordFormData;

      if (!mandantId) {
        throw new Error("Cannot submit record without a client (mandantId).");
      }

      const recordData = {
        mandantId,
        status,
        gegnerId,
        schadenDatum: unfallDatum,
        kennzeichen,
        mdtKennzeichen,
        gegnerKennzeichen,
        sonstigeBeteiligte,
        beteiligteDritte,
      };

      if (id) {
        const originalRecord = records.find(r => r.id === id);
        if (recordData.status === 'geschlossen' && originalRecord?.status !== 'geschlossen') {
          const clientForArchiving = mandanten.find(m => m.id === mandantId);
          recordData.archivedMandantData = { ...clientForArchiving };
          setFlashMessage('Akte wurde geschlossen und Mandantendaten archiviert.');
        }
        await api.updateRecord(id, recordData);
        setFlashMessage('Akte erfolgreich aktualisiert!');
      } else {
        const newRecord = { ...recordData, caseNumber: nextCaseNumber };
        await api.createRecord(newRecord);
        if (clientJustCreated) {
          setFlashMessage('Neuer Mandant und Akte erfolgreich angelegt!');
        } else {
          setFlashMessage('Neue Akte erfolgreich angelegt!');
        }
      }

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
      fetchData(); // Daten neu laden
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
      fetchData(); // Reload data
    } catch (error) {
      setFlashMessage(`Import-Fehler: ${error.message}`);
    }
  };

  return {
    isAppReady,
    records: filteredRecords, // Pass filtered records to the UI
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
    setSearchTerm, // Expose setter for the search term
  };
};

export default useKanzleiLogic;