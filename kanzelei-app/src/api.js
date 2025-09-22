const API_BASE_URL = 'http://localhost:3001/api';

// Helper function for handling API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unbekannter Fehler' }));
    throw new Error(errorData.error || 'Etwas ist schiefgelaufen');
  }
  if (response.status === 204 || (response.status === 200 && response.headers.get('content-length') === '0')) {
    return null;
  }
  return response.json();
};

// Generic factory for creating API functions
const createApiMethods = (entity) => {
  const endpoint = `${API_BASE_URL}/${entity}`;
  return {
    getAll: () => fetch(endpoint).then(handleResponse),
    create: (data) => fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),
    update: (id, data) => fetch(`${endpoint}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),
    delete: (id) => fetch(`${endpoint}/${id}`, {
      method: 'DELETE',
    }).then(handleResponse),
  };
};

const mandantenApi = createApiMethods('mandanten');
const recordsApi = createApiMethods('records');
const dritteBeteiligteApi = createApiMethods('dritte-beteiligte');

// --- Mandanten API ---
export const getMandanten = mandantenApi.getAll;
export const createMandant = mandantenApi.create;
export const updateMandant = mandantenApi.update;
export const deleteMandant = mandantenApi.delete;

// --- Dritte Beteiligte API ---
export const getDritteBeteiligte = dritteBeteiligteApi.getAll;
export const createDritteBeteiligte = dritteBeteiligteApi.create;
export const updateDritteBeteiligte = dritteBeteiligteApi.update;
export const deleteDritteBeteiligte = dritteBeteiligteApi.delete;

// --- Akten (Records) API ---
export const getRecords = recordsApi.getAll;
export const createRecord = recordsApi.create;
export const updateRecord = recordsApi.update;
export const deleteRecord = recordsApi.delete;

// --- Backup/Restore API ---
export const exportData = async () => {
  const endpoint = `${API_BASE_URL}/export`;
  return fetch(endpoint).then(handleResponse);
};

export const importData = async (data) => {
  const endpoint = `${API_BASE_URL}/import`;
  return fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse);
};
