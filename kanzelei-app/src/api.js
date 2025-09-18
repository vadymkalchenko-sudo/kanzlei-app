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

// Mandanten API
export const getMandanten = async () => {
  // Mock implementation
  console.log('API: getMandanten called');
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
  // Mock implementation
  console.log('API: getRecords called');
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
