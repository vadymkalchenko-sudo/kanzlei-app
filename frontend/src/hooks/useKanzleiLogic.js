import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as api from '../api';
import { readFileAsBase64 } from '../utils';

// Generiert eine neue Aktennummer im Format [Laufende Nummer].[Zweistelliges Jahr].awr
// Prüft zunächst, ob die Nummer bereits existiert und sucht dann nach einer eindeutigen Nummer
const generateNewCaseNumber = async (records, apiCall) => {
  const year = new Date().getFullYear().toString().slice(-2);
  
  // Erste Möglichkeit: Wenn keine Akten existieren, beginne mit 1
  if (records.length === 0) {
    return `1.${year}.awr`;
  }
  
  // Hole alle vorhandenen Aktennummern aus der Datenbank
  let existingNumbers = [];
  try {
    // Wenn eine API-Funktion zur Verfügung steht, verwenden wir diese
    if (apiCall && typeof apiCall === 'function') {
      const allRecords = await apiCall();
      existingNumbers = allRecords.map(record => record.aktenzeichen || record.caseNumber).filter(Boolean);
    } else {
      // Fallback: Verwende die lokalen Records (kann bei Offline-Modus helfen)
      existingNumbers = records.map(record => record.aktenzeichen || record.caseNumber).filter(Boolean);
    }
  } catch (error) {
    console.warn('Konnte keine vorhandenen Aktennummern abrufen, verwende lokale Liste:', error);
  }
  
  // Finde die höchste Nummer in der Datenbank
  let maxNumber = 0;
  existingNumbers.forEach(number => {
    // Extrahiere die Zahl aus dem Format "X.YY.awr"
    const match = number.match(/^(\d+)\.(\d+)\.awr$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  });
  
  // Erzeuge die nächste eindeutige Nummer
  const nextId = maxNumber + 1;
  return `${nextId}.${year}.awr`;
};

// Fallback-Funktion für Fälle, wo keine Datenbankabfrage möglich ist
const generateNewCaseNumberFallback = (totalRecords) => {
  const year = new Date().getFullYear().toString().slice(-2);
  const nextId = totalRecords + 1;
  return `${nextId}.${year}.awr`;
};

/**
 * Ein benutzerdefinierter Hook, der die gesamte Geschäftslogik der Anwendung kapselt.
 * Er interagiert mit der API-Schicht, um Daten zu verwalten.
 */
export const useKanzleiLogic = (isLoggedIn, onLogout) => {
  const [isAppReady, setIsAppReady] = useState(false);
  const [records, setRecords] = useState([]);
  const [mandanten, setMandanten] = useState([]);
  const [dritteBeteiligte, setDritteBeteiligte] = useState([]);
  const [nextCaseNumber, setNextCaseNumber] = useState('');

  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const messageTimerRef = useRef(null);

  // Funktion zur Aktualisierung der nächsten Aktennummer
  const updateNextCaseNumber = useCallback(async () => {
    try {
      const newNumber = await generateNewCaseNumber(records, api.getRecords);
      setNextCaseNumber(newNumber);
    } catch (error) {
      console.error('Fehler bei der Generierung der Aktennummer:', error);
      // Fallback auf alte Methode
      const fallbackNumber = generateNewCaseNumberFallback(records.length);
      setNextCaseNumber(fallbackNumber);
    }
  }, [records]);

  // Initialisierung beim Start
  useEffect(() => {
    updateNextCaseNumber();
  }, [updateNextCaseNumber]);

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
            const deadlineDate = aufgabe.faelligkeitsdatum || aufgabe.deadline || aufgabe.datum;
            if (!deadlineDate) return false;
            const deadline = new Date(deadlineDate);
            return deadline <= today;
        });

        if (openTasks.length === 0) return null;

        const oldestDeadline = openTasks.reduce((oldest, current) => {
            const currentDate = new Date(current.faelligkeitsdatum || current.deadline || current.datum);
            return currentDate < oldest ? currentDate : oldest;
        }, new Date(openTasks[0].faelligkeitsdatum || openTasks[0].deadline || openTasks[0].datum));

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

  // Deep-clean helper to ensure full JSON-serializability (no File/Blob or file-metadata-like objects)
  const deepCleanSerializable = useCallback((value) => {
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
  }, []);

  const handleRecordSubmit = async (formData) => {
    try {
      const { clientJustCreated, ...recordFormData } = formData;
      const {
        id: recordId, // Explizit als Akten-ID benennen
        mandantId, status, gegnerId, unfallDatum, kennzeichen,
        mdtKennzeichen, gegnerKennzeichen, sonstigeBeteiligte, beteiligteDritte
      } = recordFormData;

      if (!mandantId) {
        throw new Error("Cannot submit record without a client (mandantId).");
      }

      // Backend expects: aktenzeichen, status, mandanten_id, dokumente_pfad
      const payloadData = {
        aktenzeichen: recordId ? (records.find(r => r.id === recordId)?.caseNumber || '') : nextCaseNumber,
        status,
        mandanten_id: mandantId,
        dokumente_pfad: '', // optional, leer bei Neuanlage
      };

      // Zusätzliche Felder für spätere Erweiterungen (werden ignoriert, falls Backend sie nicht nutzt)
      // payloadData.gegnerId = gegnerId;
      // payloadData.schadenDatum = unfallDatum;
      // payloadData.kennzeichen = kennzeichen;
      // payloadData.mdtKennzeichen = mdtKennzeichen;
      // payloadData.gegnerKennzeichen = gegnerKennzeichen;
      // payloadData.sonstigeBeteiligte = sonstigeBeteiligte;
      // payloadData.beteiligteDritte = beteiligteDritte;

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

      // payloadData = stripAttachmentMetaFields(payloadData);

      const closeAkteLogic = async (recordId) => {
        const akte = records.find(r => r.id === recordId);
        if (!akte) throw new Error('Akte nicht gefunden');
      
        const mandantId = akte.mandantId || akte.mandanten_id;
        const mandant = mandanten.find(m => m.id === mandantId);
        if (!mandant) throw new Error('Mandant zur Akte nicht gefunden');
      
        // Schnappschuss als JSON-Dokument erstellen und hochladen
        const archiveRecord = {
          akte: { ...akte },
          mandant: { ...mandant },
          snapshotErstelltAm: new Date().toISOString(),
        };
        const archiveJsonString = JSON.stringify(archiveRecord, null, 2);
        const archiveFile = new File([archiveJsonString], `archiv-schnappschuss-${akte.aktenzeichen}.json`, { type: 'application/json' });
        await api.uploadDocument(recordId, archiveFile);
      
        // Akte aktualisieren: Status ändern und Mandantendaten archivieren
        const updatedRecordRaw = {
          ...akte,
          status: 'geschlossen',
          archivedMandantData: { ...mandant }, // Mandantendaten für die Archivierung einbetten
        };
        return deepCleanSerializable(updatedRecordRaw);
      };

      if (recordId) {
        const originalRecord = records.find(r => r.id === recordId);
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
        const savedRecord = await api.updateRecord(recordId, updatedRecord);
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
            aktenzeichen: nextCaseNumber,
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
      throw error; // Fehler an die aufrufende Komponente weiterleiten
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
      // Finde die Notiz, um ihren Status zu ändern
      const record = records.find(r => r.id === recordId);
      const note = record?.notizen.find(n => n.id === noteId);
      if (!note) throw new Error('Notiz nicht gefunden');

      // Erstelle ein sauberes Update-Objekt und sende es an den korrekten Endpunkt
      const updatedNote = { ...note, erledigt: !note.erledigt };
      await api.updateNote(recordId, noteId, updatedNote);

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
        faelligkeitsdatum: aufgabeData.datum,
      };
      console.log('DEBUG (Frontend): handleAddAufgabe - faelligkeitsdatum:', noteData.faelligkeitsdatum, 'Type:', typeof noteData.faelligkeitsdatum);
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
        faelligkeitsdatum: aufgabeData.datum,
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

      const updatedNotePayload = { ...note, erledigt: !note.erledigt };
      // Da es sich um eine Aufgabe handelt, sollte das Fälligkeitsdatum beibehalten werden.
      // Das Backend erwartet `faelligkeitsdatum` für Aufgaben.
      updatedNotePayload.faelligkeitsdatum = note.faelligkeitsdatum;
      await api.updateNote(recordId, aufgabeId, updatedNotePayload);
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

const closeAkte = async (akteId) => {
  try {
    // Finde die Akte und den zugehörigen Mandanten
    const akte = records.find(r => r.id === akteId);
    if (!akte) throw new Error('Akte nicht gefunden');

    const mandant = mandanten.find(m => m.id === (akte.mandantId || akte.mandanten_id));
    if (!mandant) throw new Error('Mandant zur Akte nicht gefunden');

    // Erstelle ein JSON-Schnappschuss-Dokument und lade es hoch
    const archiveJsonString = JSON.stringify({ akte: { ...akte }, mandant: { ...mandant }, snapshotErstelltAm: new Date().toISOString() }, null, 2);
    const archiveFile = new File([archiveJsonString], `archiv-schnappschuss-${akte.aktenzeichen}.json`, { type: 'application/json' });
    await api.uploadDocument(akteId, archiveFile);

    // Erstelle ein sauberes Payload-Objekt, anstatt das gesamte Aktenobjekt zu verwenden.
    // Dies verhindert, dass veraltete oder nicht-serialisierbare Daten gesendet werden.
    const payload = {
      status: 'geschlossen',
      mandanten_id: mandant.id,
      archivedMandantData: { ...mandant },
    };

    // Kombiniere das Original mit dem sauberen Payload und bereinige es dann.
    const finalRecord = deepCleanSerializable({ ...akte, ...payload });

    await api.updateRecord(akteId, finalRecord);

    setFlashMessage('Akte wurde erfolgreich geschlossen und ein Archiv-Schnappschuss erstellt.');
    fetchData();
  } catch (error) {
    console.error('Fehler beim Schließen der Akte:', error);
    setFlashMessage(`Fehler beim Schließen der Akte: ${error.message}`);
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
  closeAkte,
};

};

export default useKanzleiLogic;