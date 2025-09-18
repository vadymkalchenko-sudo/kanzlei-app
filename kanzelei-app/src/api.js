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
    { id: 'r1', mandantId: 'm1', caseNumber: '1.24.awr', status: 'offen', gegner: 'Versicherung AG', schadenDatum: '2024-01-15', kennzeichen: 'B-MV-123' },
    { id: 'r2', mandantId: 'm2', caseNumber: '2.24.awr', status: 'offen', gegner: 'Haftpflicht GmbH', schadenDatum: '2024-02-20', kennzeichen: 'H-XY-456' },
    { id: 'r3', mandantId: 'm1', caseNumber: '3.24.awr', status: 'geschlossen', gegner: 'Gegner Anwalt', schadenDatum: '2023-11-10', kennzeichen: 'B-AB-789', archivedMandantData: { id: 'm1', name: 'Max Mustermann', email: 'max@example.com', street: 'Musterstraße 1', zipCode: '12345', city: 'Musterstadt' } },
  ];

  localStorage.setItem('mandanten', JSON.stringify(mandanten));
  localStorage.setItem('records', JSON.stringify(records));
};

const checkAndSeedData = () => {
  const mandanten = localStorage.getItem('mandanten');
  if (!mandanten) {
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

export const updateRecord = async (recordId, recordData) => {
  // Mock implementation
  console.log('API: updateRecord called with', recordId, recordData);
  let records = JSON.parse(localStorage.getItem('records')) || [];
  records = records.map(r => r.id === recordId ? { ...r, ...recordData } : r);
  localStorage.setItem('records', JSON.stringify(records));
  return Promise.resolve({ ...recordData, id: recordId });
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
