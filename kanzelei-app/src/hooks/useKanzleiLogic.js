import { useState, useEffect, useCallback } from 'react';
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
  const [message, setMessage] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [mandantenData, recordsData] = await Promise.all([
        api.getMandanten(),
        api.getRecords(),
      ]);
      setMandanten(mandantenData);
      setRecords(recordsData);
    } catch (error) {
      setMessage(`Fehler beim Laden der Daten: ${error.message}`);
    } finally {
      setIsAppReady(true);
    }
  }, []);

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

  const handleRecordSubmit = async (formData) => {
    try {
      const { id, isNewMandant, mandantId, name, email, street, zipCode, city, description, status } = formData;

      const mandantData = { name, email, street, zipCode, city };
      const recordCoreData = { description, status };

      let finalMandantId = mandantId;
      let mandantUpdated = false;

      // Logic for handling Mandant data
      if (isNewMandant) {
        const newMandant = await api.createMandant(mandantData);
        finalMandantId = newMandant.id;
        setMessage('Neuer Mandant wurde angelegt. ');
      } else if (mandantId) {
        const originalMandant = mandanten.find(m => m.id === mandantId);
        const hasChanged = Object.keys(mandantData).some(key => mandantData[key] !== originalMandant[key]);

        if (hasChanged) {
          const confirmUpdate = window.confirm(
            "Die Mandantendaten wurden geändert. Möchten Sie den bestehenden Mandanten aktualisieren?\n\n'OK' = Aktualisieren, 'Abbrechen' = Neuen Mandant anlegen."
          );

          if (confirmUpdate) {
            await api.updateMandant(mandantId, { ...originalMandant, ...mandantData });
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

        // Aktenabschluss-Logik
        const originalRecord = records.find(r => r.id === id);
        if (recordData.status === 'geschlossen' && originalRecord?.status !== 'geschlossen') {
          const clientForArchiving = mandanten.find(m => m.id === finalMandantId);
          recordData.archivedMandantData = { ...clientForArchiving };
           setMessage(prev => (prev || '') + 'Akte wurde geschlossen und Mandantendaten archiviert. ');
        }

        await api.updateRecord(id, recordData);
        setMessage(prev => (prev || '') + 'Akte erfolgreich aktualisiert!');
      } else { // Neue Akte anlegen
        const newRecord = {
          ...recordCoreData,
          mandantId: finalMandantId,
          caseNumber: generateNewCaseNumber(records.length),
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
    records,
    mandanten,
    message,
    setMessage,
    handleMandantSubmit,
    handleDeleteMandant,
    handleRecordSubmit,
    handleDeleteRecord,
    fetchData,
    handleExport,
    handleImport,
  };
};

export default useKanzleiLogic;