import { useState, useEffect, useCallback, useMemo } from 'react';
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
      setMessage(`Fehler beim Laden der Daten: ${error.message}`);
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
        setMessage('Mandant erfolgreich aktualisiert!');
      } else {
        await api.createMandant(mandantData);
        setMessage('Neuer Mandant erfolgreich angelegt!');
      }
      fetchData(); // Daten neu laden
    } catch (error) {
      setMessage(`Fehler: ${error.message}`);
    }
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
      setMessage(`${files.length} Dokument(e) erfolgreich hinzugefügt.`);
      fetchData();
    } catch (error) {
      setMessage(`Fehler beim Hinzufügen von Dokumenten: ${error.message}`);
    }
  };

  const handleDeleteMandant = async (mandantId) => {
    try {
      const openRecords = records.filter(
        (r) => r.mandantId === mandantId && r.status === 'offen'
      );

      if (openRecords.length > 0) {
        const recordNumbers = openRecords.map((r) => r.caseNumber).join(', ');
        setMessage(
          `Mandant kann nicht gelöscht werden. Es gibt noch offene Akten: ${recordNumbers}`
        );
        return;
      }

      await api.deleteMandant(mandantId);
      setMessage('Mandant erfolgreich gelöscht!');
      fetchData(); // Daten neu laden
    } catch (error) {
      setMessage(`Fehler: ${error.message}`);
    }
  };

  const handleDritteSubmit = async (data) => {
    try {
      if (data.id) {
        await api.updateDritteBeteiligte(data.id, data);
        setMessage('Dritter Beteiligter erfolgreich aktualisiert!');
      } else {
        await api.createDritteBeteiligte(data);
        setMessage('Neuer Dritter Beteiligter erfolgreich angelegt!');
      }
      fetchData();
    } catch (error) {
      setMessage(`Fehler: ${error.message}`);
    }
  };

  const handleDeleteDritte = async (id) => {
    try {
      await api.deleteDritteBeteiligte(id);
      setMessage('Dritter Beteiligter erfolgreich gelöscht!');
      fetchData();
    } catch (error) {
      setMessage(`Fehler: ${error.message}`);
    }
  };

  const nextCaseNumber = generateNewCaseNumber(records.length);

  const handleRecordSubmit = async (formData) => {
    try {
      const {
        id, isNewMandant, mandantId,
        anrede, vorname, nachname, strasse, hausnummer, plz, stadt, email, telefon, iban, notizen,
        status, gegner, unfallDatum, kennzeichen, mdtKennzeichen, gegnerKennzeichen
      } = formData;

      // Combine vorname and nachname for the 'name' field expected by the backend.
      const name = `${vorname} ${nachname}`.trim();

      const mandantData = {
        anrede, name, strasse, hausnummer, plz, stadt, email, telefon, iban, notizen
      };

      const recordCoreData = {
        status, gegner, schadenDatum: unfallDatum, kennzeichen, mdtKennzeichen, gegnerKennzeichen
      };

      let finalMandantId = mandantId;

      // Logic for handling Mandant data
      if (isNewMandant) {
        const newMandant = await api.createMandant(mandantData);
        finalMandantId = newMandant.id;
        setMessage('Neuer Mandant wurde angelegt. ');
      } else if (mandantId) {
        const originalMandant = mandanten.find(m => m.id === mandantId);
        // Create a comparable version of the new data
        const updatedMandantData = { ...originalMandant, ...mandantData };

        const hasChanged = Object.keys(mandantData).some(key => {
            // Normalize empty strings and null/undefined for comparison
            const oldValue = originalMandant[key] || '';
            const newValue = updatedMandantData[key] || '';
            return oldValue !== newValue;
        });

        if (hasChanged) {
          const confirmUpdate = window.confirm(
            "Die Mandantendaten wurden geändert. Möchten Sie den bestehenden Mandanten aktualisieren?\n\n'OK' = Aktualisieren, 'Abbrechen' = Neuen Mandant anlegen."
          );

          if (confirmUpdate) {
            await api.updateMandant(mandantId, updatedMandantData);
            setMessage('Mandantendaten wurden aktualisiert. ');
          } else {
            const newMandant = await api.createMandant(mandantData);
            finalMandantId = newMandant.id;
            setMessage('Ein neuer Mandant wurde mit den geänderten Daten angelegt. ');
          }
        }
      }

      // Logic for handling Akte data
      if (id) { // Akte bearbeiten
        const recordData = { ...recordCoreData, mandantId: finalMandantId };

        const originalRecord = records.find(r => r.id === id);
        if (recordData.status === 'geschlossen' && originalRecord?.status !== 'geschlossen') {
          const clientForArchiving = mandanten.find(m => m.id === finalMandantId);
          recordData.archivedMandantData = { ...clientForArchiving, ...mandantData }; // Archive new data
           setMessage(prev => (prev || '') + 'Akte wurde geschlossen und Mandantendaten archiviert. ');
        }

        await api.updateRecord(id, recordData);
        setMessage(prev => (prev || '') + 'Akte erfolgreich aktualisiert!');
      } else { // Neue Akte anlegen
        const newRecord = {
          ...recordCoreData,
          mandantId: finalMandantId,
          caseNumber: nextCaseNumber,
        };
        await api.createRecord(newRecord);
        setMessage(prev => (prev || '') + 'Neue Akte erfolgreich angelegt!');
      }

      fetchData(); // Reload all data
    } catch (error) {
      setMessage(`Fehler: ${error.message}`);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    try {
      await api.deleteRecord(recordId);
      setMessage('Akte erfolgreich gelöscht!');
      fetchData(); // Daten neu laden
    } catch (error) {
      setMessage(`Fehler: ${error.message}`);
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
      setMessage('Daten erfolgreich exportiert.');
    } catch (error) {
      setMessage(`Export-Fehler: ${error.message}`);
    }
  };

  const handleImport = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.importData(data);
      setMessage('Daten erfolgreich importiert. Die Ansicht wird aktualisiert.');
      fetchData(); // Reload data
    } catch (error) {
      setMessage(`Import-Fehler: ${error.message}`);
    }
  };

  return {
    isAppReady,
    records: filteredRecords, // Pass filtered records to the UI
    mandanten,
    dritteBeteiligte,
    message,
    setMessage,
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