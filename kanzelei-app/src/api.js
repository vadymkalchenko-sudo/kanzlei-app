// In a real application, this would be your base API URL
const API_URL = '/api'; // Using a relative URL for proxying in development

// Helper function for handling API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Etwas ist schiefgelaufen');
  }
  return response.json();
};

const seedInitialData = () => {
  const mandanten = [
    { id: 'm1', name: 'Max Mustermann', email: 'max@example.com', street: 'Musterstraße 1', zipCode: '12345', city: 'Musterstadt' },
    { id: 'm2', name: 'Erika Mustermann', email: 'erika@example.com', street: 'Beispielweg 2', zipCode: '54321', city: 'Beispielhausen' },
    { id: 'm3', name: 'John Doe', email: 'john@example.com', street: 'Doe Street 3', zipCode: '98765', city: 'Doetown' },
  ];

  const records = [
    {
      id: 'rec1', mandantId: 'm1', caseNumber: '101.24.awr', status: 'offen', gegner: 'Gegnerische Versicherung', schadenDatum: '2024-03-01', kennzeichen: 'B-OS-123',
      dokumente: [{id: 'doc1', datum: '2024-03-01', beschreibung: 'Unfallbericht.pdf', format: 'application/pdf', soll: 500.00, haben: 0}],
      notizen: [{id: 'note1', datum: '2024-03-02', titel: 'Erstanruf', inhalt: 'Mandant hat den Unfall gemeldet.'}],
      fristen: [{datum: '2024-03-15', notiz: 'Klage einreichen'}],
      wiedervorlagen: [{datum: '2024-03-08', notiz: 'Rücksprache mit Mandant'}],
    },
    {
      id: 'rec2', mandantId: 'm2', caseNumber: '102.24.awr', status: 'offen', gegner: 'Unfallgegner GmbH', schadenDatum: '2024-02-15', kennzeichen: 'M-AX-456',
      dokumente: [],
      notizen: [],
      fristen: [],
      wiedervorlagen: [],
    },
    {
      id: 'rec3', mandantId: 'm3', caseNumber: '103.24.awr', status: 'geschlossen', gegner: 'Anwaltskanzlei Dr. Streber', schadenDatum: '2023-12-20', kennzeichen: 'K-LN-789',
      dokumente: [{id: 'doc2', datum: '2023-12-20', beschreibung: 'Abschlussrechnung.pdf', format: 'application/pdf', soll: 0, haben: 1200.00}],
      notizen: [{id: 'note2', datum: '2023-12-21', titel: 'Fall geschlossen', inhalt: 'Zahlung erhalten, Fall abgeschlossen.'}],
      fristen: [],
      wiedervorlagen: [],
    },
  ];

  localStorage.setItem('mandanten', JSON.stringify(mandanten));
  localStorage.setItem('records', JSON.stringify(records));

  const dritteBeteiligte = [
    { id: 'd1', name: 'Gutachter Schmidt', email: 'gutachter@example.com', street: 'Prüfweg 10', zipCode: '10115', city: 'Berlin' },
  ];
  localStorage.setItem('dritteBeteiligte', JSON.stringify(dritteBeteiligte));
};

const checkAndSeedData = () => {
  const mandanten = localStorage.getItem('mandanten');
  const dritte = localStorage.getItem('dritteBeteiligte');
  if (!mandanten || !dritte) {
    console.log('No data found in localStorage. Seeding initial data.');
    seedInitialData();
  }
};

// Mandanten API
export const getMandanten = async () => {
  console.log('API: getMandanten called');
  checkAndSeedData(); // Ensure data exists
  const mandanten = JSON.parse(localStorage.getItem('mandanten')) || [];
  return Promise.resolve(mandanten);
};

export const createMandant = async (mandantData) => {
  // Mock implementation
  console.log('API: createMandant called with', mandantData);
  const mandanten = JSON.parse(localStorage.getItem('mandanten')) || [];
  const newMandant = { ...mandantData, id: new Date().toISOString() };
  localStorage.setItem('mandanten', JSON.stringify([...mandanten, newMandant]));
  return Promise.resolve(newMandant);
};

export const updateMandant = async (mandantId, mandantData) => {
  // Mock implementation
  console.log('API: updateMandant called with', mandantId, mandantData);
  let mandanten = JSON.parse(localStorage.getItem('mandanten')) || [];
  mandanten = mandanten.map(m => m.id === mandantId ? { ...m, ...mandantData } : m);
  localStorage.setItem('mandanten', JSON.stringify(mandanten));
  return Promise.resolve({ ...mandantData, id: mandantId });
};

export const deleteMandant = async (mandantId) => {
  // Mock implementation
  console.log('API: deleteMandant called with', mandantId);
  let mandanten = JSON.parse(localStorage.getItem('mandanten')) || [];
  mandanten = mandanten.filter(m => m.id !== mandantId);
  localStorage.setItem('mandanten', JSON.stringify(mandanten));
  return Promise.resolve({ message: 'Mandant gelöscht' });
};

// Dritte Beteiligte API
export const getDritteBeteiligte = async () => {
  console.log('API: getDritteBeteiligte called');
  checkAndSeedData(); // Ensure data exists
  const dritte = JSON.parse(localStorage.getItem('dritteBeteiligte')) || [];
  return Promise.resolve(dritte);
};

export const createDritteBeteiligte = async (data) => {
  console.log('API: createDritteBeteiligte called with', data);
  const dritte = JSON.parse(localStorage.getItem('dritteBeteiligte')) || [];
  const newItem = { ...data, id: `d${new Date().toISOString()}` };
  localStorage.setItem('dritteBeteiligte', JSON.stringify([...dritte, newItem]));
  return Promise.resolve(newItem);
};

export const updateDritteBeteiligte = async (id, data) => {
  console.log('API: updateDritteBeteiligte called with', id, data);
  let dritte = JSON.parse(localStorage.getItem('dritteBeteiligte')) || [];
  dritte = dritte.map(d => d.id === id ? { ...d, ...data } : d);
  localStorage.setItem('dritteBeteiligte', JSON.stringify(dritte));
  return Promise.resolve({ ...data, id });
};

export const deleteDritteBeteiligte = async (id) => {
  console.log('API: deleteDritteBeteiligte called with', id);
  let dritte = JSON.parse(localStorage.getItem('dritteBeteiligte')) || [];
  dritte = dritte.filter(d => d.id !== id);
  localStorage.setItem('dritteBeteiligte', JSON.stringify(dritte));
  return Promise.resolve({ message: 'Dritter Beteiligter gelöscht' });
};

// Akten API
export const getRecords = async () => {
  console.log('API: getRecords called');
  checkAndSeedData(); // Ensure data exists
  const records = JSON.parse(localStorage.getItem('records')) || [];
  return Promise.resolve(records);
};

export const createRecord = async (recordData) => {
  // Mock implementation
  console.log('API: createRecord called with', recordData);
  const records = JSON.parse(localStorage.getItem('records')) || [];
  const newRecord = { ...recordData, id: new Date().toISOString() };
  localStorage.setItem('records', JSON.stringify([...records, newRecord]));
  return Promise.resolve(newRecord);
};

export const updateRecord = async (recordId, partialRecordData) => {
  // Mock implementation
  console.log('API: updateRecord called with', recordId, partialRecordData);
  let records = JSON.parse(localStorage.getItem('records')) || [];
  let updatedRecord = null;
  records = records.map(r => {
    if (r.id === recordId) {
      updatedRecord = { ...r, ...partialRecordData };
      return updatedRecord;
    }
    return r;
  });
  localStorage.setItem('records', JSON.stringify(records));
  return Promise.resolve(updatedRecord);
};

export const deleteRecord = async (recordId) => {
  // Mock implementation
  console.log('API: deleteRecord called with', recordId);
  let records = JSON.parse(localStorage.getItem('records')) || [];
  records = records.filter(r => r.id !== recordId);
  localStorage.setItem('records', JSON.stringify(records));
  return Promise.resolve({ message: 'Akte gelöscht' });
};

// Backup/Restore API
export const exportData = async () => {
  console.log('API: exportData called');
  const mandanten = JSON.parse(localStorage.getItem('mandanten')) || [];
  const records = JSON.parse(localStorage.getItem('records')) || [];
  return Promise.resolve({ mandanten, records });
};

export const importData = async (data) => {
  console.log('API: importData called with', data);
  localStorage.setItem('mandanten', JSON.stringify(data.mandanten || []));
  localStorage.setItem('records', JSON.stringify(data.records || []));
  return Promise.resolve({ message: 'Daten erfolgreich importiert' });
};

export const connectDb = async () => {
  const response = await fetch(`${API_URL}/db-connect`, { method: 'POST' });
  return handleResponse(response);
};

export const getDbStatus = async () => {
  const response = await fetch(`${API_URL}/db-status`);
  return handleResponse(response);
};
