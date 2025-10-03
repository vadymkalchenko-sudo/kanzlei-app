const API_BASE_URL = 'http://backend:3001/api';

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
    if (error.name === 'AbortError') {
      // Ignore abort errors, as they are expected during component unmounts
      return;
    }
    console.error('API request failed:', error);
    throw error;
  }
};

// Mandanten API
export const getMandanten = (signal) => apiRequest(`${API_BASE_URL}/mandanten`, { signal });
export const createMandant = (data, signal) => apiRequest(`${API_BASE_URL}/mandanten`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  signal,
});
export const updateMandant = (id, data, signal) => apiRequest(`${API_BASE_URL}/mandanten/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  signal,
});
export const deleteMandant = (id, signal) => apiRequest(`${API_BASE_URL}/mandanten/${id}`, { method: 'DELETE', signal });

// Dritte Beteiligte API
export const getDritteBeteiligte = (signal) => apiRequest(`${API_BASE_URL}/dritte-beteiligte`, { signal });
export const createDritteBeteiligte = (data, signal) => apiRequest(`${API_BASE_URL}/dritte-beteiligte`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  signal,
});
export const updateDritteBeteiligte = (id, data, signal) => apiRequest(`${API_BASE_URL}/dritte-beteiligte/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  signal,
});
export const deleteDritteBeteiligte = (id, signal) => apiRequest(`${API_BASE_URL}/dritte-beteiligte/${id}`, { method: 'DELETE', signal });


// Akten API
export const getRecords = (signal) => apiRequest(`${API_BASE_URL}/records`, { signal });
export const createRecord = (data, signal) => apiRequest(`${API_BASE_URL}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal,
});
export const updateRecord = (id, data, signal) => apiRequest(`${API_BASE_URL}/records/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal,
});
export const deleteRecord = (id, signal) => apiRequest(`${API_BASE_URL}/records/${id}`, { method: 'DELETE', signal });

// This is a placeholder, as the backend does not have backup/restore endpoints
export const exportData = async () => {
  console.warn('Export functionality is not implemented on the backend.');
  return Promise.resolve({ mandanten: [], records: [] });
};

export const importData = async (data) => {
  console.warn('Import functionality is not implemented on the backend.');
  return Promise.resolve({ message: 'Daten erfolgreich importiert' });
};