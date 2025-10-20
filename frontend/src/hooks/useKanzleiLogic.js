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

  const fetchData = useCallback(async (signal) => {
    // Komplett auf API-Datenquelle umgestellt - keine localStorage-Migration mehr
    try {
      const [mandantenData, recordsData, dritteData] = await Promise.all([
        api.getMandanten(signal),
        api.getRecords(signal),
        api.getDritteBeteiligte(signal),
      ]);

      if (!mandantenData || !recordsData || !dritteData) {
        return;
      }

      setMandanten(mandantenData);
      setRecords(recordsData);
      setDritteBeteiligte(dritteData);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setFlashMessage(`Fehler beim Laden der Daten: ${error.message}`);
      }
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

  const todayDueRecords = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

    const recordsWithDueTasks = records.map(record => {
        // Safely access aufgaben, defaulting to an empty array.
        const aufgaben = record.aufgaben || [];

        const openTasks = aufgaben.filter(aufgabe => {
            if (aufgabe.erledigt) {
                return false;
            }
            // A task must have a deadline to be considered.
            // It can be under the property 'deadline' or 'datum'.
            const deadlineDate = aufgabe.deadline || aufgabe.datum;
            if (!deadlineDate) {
                return false;
            }
            const deadline = new Date(deadlineDate);
            return deadline <= today;
        });

        if (openTasks.length === 0) {
            return null;
        }

        // Find the oldest deadline among the open tasks for sorting purposes.
        const oldestDeadline = openTasks.reduce((oldest, current) => {
            const currentDate = new Date(current.deadline || current.datum);
            return currentDate < oldest ? currentDate : oldest;
        }, new Date(openTasks[0].deadline || openTasks[0].datum));

        // Return the record along with its most critical deadline.
        return { ...record, oldestDeadline };
    }).filter(Boolean); // Filter out records with no overdue tasks.

    // Sort records so that those with the most overdue tasks appear first.
    recordsWithDueTasks.sort((a, b) => a.oldestDeadline - b.oldestDeadline);

    return recordsWithDueTasks;
  }, [records]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);

    return () => {
      controller.abort();
    };
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

      const updatedNotizen = recordToUpdate.notizen.map(note => {
        if (note.id !== noteId) {
          return note;
        }

        // Check if the update is only for financial fields
        const isOnlyFinancialUpdate =
          Object.keys(noteData).length > 0 &&
          Object.keys(noteData).every(
            key => key === 'betrag_soll' || key === 'betrag_haben'
          );

        const updatedNote = { ...note, ...noteData };

        // Only update the timestamp if it's not a purely financial edit
        if (!isOnlyFinancialUpdate) {
          updatedNote.aktualisierungsdatum = new Date().toISOString();
        }

        return updatedNote;
      });

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

      // Map before sending to the API
      let payloadData = { ...recordData };
      // 1) Map caseNumber -> aktenzeichen (use existing for update, nextCaseNumber for create)
      payloadData.aktenzeichen = id ? (records.find(r => r.id === id)?.caseNumber || '') : nextCaseNumber;
      // 2) Map mandantId -> mandanten_id
      payloadData.mandanten_id = payloadData.mandantId;
      
      // Step 1: Extract single file from form input (if present) and remove it from the record payload
      const extractFirstFileFromFormData = (data) => {
        if (!data || typeof File === 'undefined') return null;
        // Prefer common keys first
        const preferredKeys = ['fileAttachment', 'file', 'attachment'];
        for (const key of preferredKeys) {
          if (data[key] instanceof File) return data[key];
        }
        // Fallback: find the first File anywhere at top-level
        for (const value of Object.values(data)) {
          if (value instanceof File) return value;
        }
        return null;
      };

      const fileToUpload = extractFirstFileFromFormData(formData);

      // Remove any file and file-related metadata from payload (JSON only)
      const stripAttachmentMetaFields = (obj) => {
        const clean = { ...obj };
        Object.keys(clean).forEach((key) => {
          const value = clean[key];
          // Remove any File instances
          if (typeof File !== 'undefined' && value instanceof File) {
            delete clean[key];
            return;
          }
          // Remove keys that look like attachment/file metadata
          if (/file|attachment|anhang/i.test(key)) {
            delete clean[key];
            return;
          }
          // Remove objects that look like file metadata blobs
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            const metaProps = ['name', 'size', 'type', 'lastModified', 'path', 'webkitRelativePath'];
            const hasAnyMeta = metaProps.some((p) => Object.prototype.hasOwnProperty.call(value, p));
            if (hasAnyMeta) {
              delete clean[key];
            }
          }
        });
        return clean;
      };

      payloadData = stripAttachmentMetaFields(payloadData);

      // Deep-clean helper to ensure full JSON-serializability (no File/Blob or file-metadata-like objects)
      const deepCleanSerializable = (value) => {
        const isPlainObject = (v) => Object.prototype.toString.call(v) === '[object Object]';
        if (value == null) return value;
        if (typeof File !== 'undefined' && value instanceof File) return undefined;
        if (typeof Blob !== 'undefined' && value instanceof Blob) return undefined;
        if (Array.isArray(value)) {
          const cleaned = value
            .map((item) => deepCleanSerializable(item))
            .filter((item) => item !== undefined);
          return cleaned;
        }
        if (isPlainObject(value)) {
          const metaProps = ['name', 'size', 'type', 'lastModified', 'path', 'webkitRelativePath'];
          const hasAnyMeta = metaProps.some((p) => Object.prototype.hasOwnProperty.call(value, p));
          if (hasAnyMeta) {
            return undefined;
          }
          const out = {};
          Object.entries(value).forEach(([k, v]) => {
            // Drop keys that look like file-ish
            if (/file|attachment|anhang/i.test(k)) return;
            const cleaned = deepCleanSerializable(v);
            if (cleaned !== undefined) out[k] = cleaned;
          });
          return out;
        }
        if (typeof value === 'function') return undefined;
        return value;
      };

      if (id) {
        const originalRecord = records.find(r => r.id === id);
        if (!originalRecord) {
          throw new Error("Original record not found for update.");
        }

        const updatedRecordRaw = { ...originalRecord, ...payloadData };

        if (updatedRecordRaw.status === 'geschlossen' && originalRecord?.status !== 'geschlossen') {
          const clientForArchiving = mandanten.find(m => m.id === mandantId);
          updatedRecordRaw.archivedMandantData = { ...clientForArchiving };
          setFlashMessage('Akte wurde geschlossen und Mandantendaten archiviert.');
        }
        const updatedRecord = deepCleanSerializable(updatedRecordRaw);
        const savedRecord = await api.updateRecord(id, updatedRecord);
        if (fileToUpload && savedRecord?.id) {
          try {
            await api.uploadDocument(savedRecord.id, fileToUpload);
          } catch (uploadErr) {
            console.error('Fehler beim separaten Datei-Upload (Update):', uploadErr);
          }
        }
        setFlashMessage('Akte erfolgreich aktualisiert!');
      } else {
        const newRecordRaw = {
            ...payloadData,
            caseNumber: nextCaseNumber,
            dokumente: [],
            notizen: [],
            aufgaben: [],
        };
        const newRecord = deepCleanSerializable(newRecordRaw);
        const createdRecord = await api.createRecord(newRecord);
        if (fileToUpload && createdRecord?.id) {
          try {
            await api.uploadDocument(createdRecord.id, fileToUpload);
          } catch (uploadErr) {
            console.error('Fehler beim separaten Datei-Upload (Create):', uploadErr);
          }
        }
        if (clientJustCreated) {
          setFlashMessage('Neuer Mandant und Akte erfolgreich angelegt!');
        } else {
          setFlashMessage('Neue Akte erfolgreich angelegt!');
        }
      }

      fetchData();
    } catch (error) {
      setFlashMessage(error.message);
      console.error(error);
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
    setSearchTerm, // Expose setter for the search term
  };
};

export default useKanzleiLogic;