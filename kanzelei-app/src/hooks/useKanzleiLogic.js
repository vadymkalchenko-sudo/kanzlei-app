import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as api from '../api';

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
      setMandanten(mandantenData);
      setRecords(recordsData);
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

  const handleMandantSubmit = async (mandantData) => {
    try {
      if (mandantData.id) {
        await api.updateMandant(mandantData.id, mandantData);
        setFlashMessage('Mandant erfolgreich aktualisiert!');
      } else {
        const newMandant = await api.createMandant(mandantData);
        setFlashMessage('Neuer Mandant erfolgreich angelegt!');
        fetchData(); // Fetch before returning to ensure lists are up-to-date
        return newMandant;
      }
      fetchData(); // Daten neu laden
    } catch (error) {
      setFlashMessage(`Fehler: ${error.message}`);
    }
    return null;
  };

  const handleAddDocuments = async (recordId, files) => {
    try {
      const recordToUpdate = records.find(r => r.id === recordId);
      if (!recordToUpdate) {
        throw new Error('Akte nicht gefunden');
      }

      const newDocuments = Array.from(files).map(file => ({
        datum: new Date().toISOString().split('T')[0],
        beschreibung: file.name,
        format: file.type || 'Unbekannt',
        soll: 0,
        haben: 0,
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

  const handleDritteSubmit = async (data) => {
    try {
      if (data.id) {
        await api.updateDritteBeteiligte(data.id, data);
        setFlashMessage('Dritter Beteiligter erfolgreich aktualisiert!');
      } else {
        await api.createDritteBeteiligte(data);
        setFlashMessage('Neuer Dritter Beteiligter erfolgreich angelegt!');
      }
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler: ${error.message}`);
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
      let messageText = '';
      const {
        id, isNewMandant, mandantId,
        anrede, vorname, nachname, strasse, hausnummer, plz, stadt, email, telefon, iban, notizen,
        status, gegner, unfallDatum, kennzeichen, mdtKennzeichen, gegnerKennzeichen
      } = formData;

      const name = `${vorname} ${nachname}`.trim();
      const mandantData = { anrede, name, strasse, hausnummer, plz, stadt, email, telefon, iban, notizen };
      const recordCoreData = { status, gegner, schadenDatum: unfallDatum, kennzeichen, mdtKennzeichen, gegnerKennzeichen };
      let finalMandantId = mandantId;

      if (isNewMandant) {
        const newMandant = await api.createMandant(mandantData);
        finalMandantId = newMandant.id;
        messageText += 'Neuer Mandant wurde angelegt. ';
      } else if (mandantId) {
        const originalMandant = mandanten.find(m => m.id === mandantId);
        const updatedMandantData = { ...originalMandant, ...mandantData };
        const hasChanged = Object.keys(mandantData).some(key => (originalMandant[key] || '') !== (updatedMandantData[key] || ''));
        if (hasChanged) {
          if (window.confirm("Die Mandantendaten wurden geändert. Möchten Sie den bestehenden Mandanten aktualisieren?\n\n'OK' = Aktualisieren, 'Abbrechen' = Neuen Mandant anlegen.")) {
            await api.updateMandant(mandantId, updatedMandantData);
            messageText += 'Mandantendaten wurden aktualisiert. ';
          } else {
            const newMandant = await api.createMandant(mandantData);
            finalMandantId = newMandant.id;
            messageText += 'Ein neuer Mandant wurde mit den geänderten Daten angelegt. ';
          }
        }
      }

      if (id) {
        const recordData = { ...recordCoreData, mandantId: finalMandantId };
        const originalRecord = records.find(r => r.id === id);
        if (recordData.status === 'geschlossen' && originalRecord?.status !== 'geschlossen') {
          const clientForArchiving = mandanten.find(m => m.id === finalMandantId);
          recordData.archivedMandantData = { ...clientForArchiving, ...mandantData };
          messageText += 'Akte wurde geschlossen und Mandantendaten archiviert. ';
        }
        await api.updateRecord(id, recordData);
        messageText += 'Akte erfolgreich aktualisiert!';
      } else {
        const newRecord = { ...recordCoreData, mandantId: finalMandantId, caseNumber: nextCaseNumber };
        await api.createRecord(newRecord);
        messageText += 'Neue Akte erfolgreich angelegt!';
      }

      setFlashMessage(messageText);
      fetchData();
    } catch (error) {
      setFlashMessage(`Fehler: ${error.message}`);
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
    handleAddDocuments,
    fetchData,
    handleExport,
    handleImport,
    nextCaseNumber,
    setSearchTerm, // Expose setter for the search term
  };
};

export default useKanzleiLogic;