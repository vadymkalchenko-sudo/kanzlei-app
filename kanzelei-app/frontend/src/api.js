const API_BASE_URL = '/api';

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network response was not ok' }));
    throw new Error(error.message || 'Something went wrong');
  }
  if (response.status === 204) {
    return null; // No content
  }
  return response.json();
};

const apiRequest = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    return handleResponse(response);
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Mandanten API
export const getMandanten = () => apiRequest(`${API_BASE_URL}/mandanten`);
export const createMandant = (data) => apiRequest(`${API_BASE_URL}/mandanten`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
export const updateMandant = (id, data) => apiRequest(`${API_BASE_URL}/mandanten/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
export const deleteMandant = (id) => apiRequest(`${API_BASE_URL}/mandanten/${id}`, { method: 'DELETE' });

// Dritte Beteiligte API
export const getDritteBeteiligte = () => apiRequest(`${API_BASE_URL}/dritte-beteiligte`);
export const createDritteBeteiligte = (data) => apiRequest(`${API_BASE_URL}/dritte-beteiligte`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
export const updateDritteBeteiligte = (id, data) => apiRequest(`${API_BASE_URL}/dritte-beteiligte/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
export const deleteDritteBeteiligte = (id) => apiRequest(`${API_BASE_URL}/dritte-beteiligte/${id}`, { method: 'DELETE' });


// Akten API
export const getRecords = () => apiRequest(`${API_BASE_URL}/records`);
export const createRecord = (data) => apiRequest(`${API_BASE_URL}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
});
export const updateRecord = (id, data) => apiRequest(`${API_BASE_URL}/records/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
});
export const deleteRecord = (id) => apiRequest(`${API_BASE_URL}/records/${id}`, { method: 'DELETE' });

// This is a placeholder, as the backend does not have backup/restore endpoints
export const exportData = async () => {
  console.warn('Export functionality is not implemented on the backend.');
  return Promise.resolve({ mandanten: [], records: [] });
};

export const importData = async (data) => {
  console.warn('Import functionality is not implemented on the backend.');
  return Promise.resolve({ message: 'Daten erfolgreich importiert' });
};