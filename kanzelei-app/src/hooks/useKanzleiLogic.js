import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Generiert eine eindeutige ID für den lokalen Benutzer
const getLocalUserId = () => {
  let userId = localStorage.getItem('kanzlei_user_id');
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem('kanzlei_user_id', userId);
  }
  return userId;
};

// Generiert eine neue Aktennummer im Format YY-NNNN
const generateNewCaseNumber = (records) => {
  const currentYear = new Date().getFullYear().toString().substring(2);
  const recordsInCurrentYear = records.filter(record => record.caseNumber && record.caseNumber.startsWith(currentYear));

  let maxNumber = 0;
  if (recordsInCurrentYear.length > 0) {
    const numbers = recordsInCurrentYear.map(record => parseInt(record.caseNumber.split('-')[1], 10) || 0);
    maxNumber = Math.max(...numbers);
  }

  const newNumber = (maxNumber + 1).toString().padStart(4, '0');
  return `${currentYear}-${newNumber}`;
};

/**
 * Ein benutzerdefinierter Hook, der die gesamte Geschäftslogik der Anwendung kapselt.
 * Er simuliert die Datenhaltung in einer lokalen Datenbank und bietet Funktionen
 * zum Verwalten von Mandanten und Akten.
 */
export const useKanzleiLogic = () => {
  const [isAppReady, setIsAppReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [records, setRecords] = useState([]);
  const [mandanten, setMandanten] = useState([]);
  const [message, setMessage] = useState(null);

  // Simuliert das Laden von Daten beim ersten Laden der App
  useEffect(() => {
    const currentUserId = getLocalUserId();
    setUserId(currentUserId);
    
    const loadedMandanten = JSON.parse(localStorage.getItem('mandanten')) || [];
    const loadedRecords = JSON.parse(localStorage.getItem('records')) || [];

    setMandanten(loadedMandanten);
    setRecords(loadedRecords);
    setIsAppReady(true);
  }, []);

  // Simuliert das Speichern von Daten bei Änderungen
  useEffect(() => {
    if (isAppReady) {
      localStorage.setItem('mandanten', JSON.stringify(mandanten));
      localStorage.setItem('records', JSON.stringify(records));
    }
  }, [mandanten, records, isAppReady]);

  // Hinzufügen oder Bearbeiten eines Mandanten
  const handleMandantSubmit = (mandantData) => {
    let updatedMandanten;
    if (mandantData.id) {
      updatedMandanten = mandanten.map(m => m.id === mandantData.id ? mandantData : m);
      setMessage('Mandant erfolgreich aktualisiert!');
    } else {
      const newMandant = { ...mandantData, id: uuidv4() };
      updatedMandanten = [...mandanten, newMandant];
      setMessage('Neuer Mandant erfolgreich angelegt!');
    }
    setMandanten(updatedMandanten);
  };

  // Löschen eines Mandanten
  const handleDeleteMandant = (mandantId) => {
    const updatedMandanten = mandanten.filter(m => m.id !== mandantId);
    setMandanten(updatedMandanten);
    setMessage('Mandant erfolgreich gelöscht!');
  };

  // Hinzufügen oder Bearbeiten einer Akte
  const handleRecordSubmit = (recordData) => {
    let updatedRecords;
    if (recordData.id) {
      updatedRecords = records.map(r => r.id === recordData.id ? recordData : r);
      setMessage('Akte erfolgreich aktualisiert!');
    } else {
      const newRecord = {
        ...recordData,
        id: uuidv4(),
        caseNumber: generateNewCaseNumber(records),
      };
      updatedRecords = [...records, newRecord];
      setMessage('Neue Akte erfolgreich angelegt!');
    }
    setRecords(updatedRecords);
  };

  // Löschen einer Akte
  const handleDeleteRecord = (recordId) => {
    const updatedRecords = records.filter(r => r.id !== recordId);
    setRecords(updatedRecords);
    setMessage('Akte erfolgreich gelöscht!');
  };

  return {
    isAppReady,
    userId,
    records,
    mandanten,
    message,
    setMessage,
    handleMandantSubmit,
    handleDeleteMandant,
    handleRecordSubmit,
    handleDeleteRecord,
  };
};

export default useKanzleiLogic;