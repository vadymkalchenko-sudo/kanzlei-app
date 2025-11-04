import { getToken } from './services/authService';

const API_BASE_URL = 'http://localhost:3001/api';

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      // Token ist ungültig oder abgelaufen
      // Wir werfen einen spezifischen Fehler, den die UI abfangen kann, um den Logout-Zustand zu verwalten.
      const authError = new Error('Authentication failed');
      authError.status = response.status;
      throw authError;
    }
    const errorData = await response.json().catch(() => null);
    const message = errorData?.message || response.statusText;
    throw new Error(message);
  }
  if (response.status === 204) {
    return []; // Return empty array for No Content to ensure consistency
  }
  return response.json();
};

const apiRequest = async (url, options = {}) => {
  try {
    const token = getToken();
    const headers = {
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });
    return await handleResponse(response);
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    throw error;
  }
};

// Mandanten API
export const getMandanten = (signal) => apiRequest(`${API_BASE_URL}/mandanten`, { signal });
export const createMandant = async (data, signal) => {
  try {
    return await apiRequest(`${API_BASE_URL}/mandanten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal,
    });
  } catch (error) {
    throw error;
  }
};
export const updateMandant = (id, data, signal) => apiRequest(`${API_BASE_URL}/mandanten/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  signal,
});
export const deleteMandant = (id, signal) => apiRequest(`${API_BASE_URL}/mandanten/${id}`, { method: 'DELETE', signal });

// Dritte Beteiligte API
export const getDritteBeteiligte = (signal) => apiRequest(`${API_BASE_URL}/dritte-beteiligte`, { signal });
export const createDritteBeteiligte = async (data, signal) => {
  try {
    return await apiRequest(`${API_BASE_URL}/dritte-beteiligte`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal,
    });
  } catch (error) {
    throw error;
  }
};
export const updateDritteBeteiligte = (id, data, signal) => apiRequest(`${API_BASE_URL}/dritte-beteiligte/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  signal,
});
export const deleteDritteBeteiligte = (id, signal) => apiRequest(`${API_BASE_URL}/dritte-beteiligte/${id}`, { method: 'DELETE', signal });

// Akten API
export const getRecords = (signal) => apiRequest(`${API_BASE_URL}/records`, { signal });
export const createRecord = async (data, signal) => {
  try {
    const isFormData = (typeof FormData !== 'undefined') && (data instanceof FormData);
    const options = isFormData
      ? { method: 'POST', body: data, signal }
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal };
    return await apiRequest(`${API_BASE_URL}/records`, options);
  } catch (error) {
    throw error;
  }
};
export const updateRecord = (id, data, signal) => {
  const isFormData = (typeof FormData !== 'undefined') && (data instanceof FormData);
  const options = isFormData
    ? { method: 'PUT', body: data, signal }
    : { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal };
  return apiRequest(`${API_BASE_URL}/records/${id}`, options);
};
export const deleteRecord = (id, signal) => apiRequest(`${API_BASE_URL}/records/${id}`, { method: 'DELETE', signal });

// Notizen API
export const addNote = (recordId, noteData) => apiRequest(`${API_BASE_URL}/records/${recordId}/notes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(noteData),
});

export const updateNote = (recordId, noteId, noteData) => apiRequest(`${API_BASE_URL}/records/${recordId}/notes/${noteId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(noteData),
});

export const deleteNote = (recordId, noteId) => apiRequest(`${API_BASE_URL}/records/${recordId}/notes/${noteId}`, {
  method: 'DELETE',
});

export const uploadDocuments = (recordId, formData, signal) => {
  return apiRequest(`${API_BASE_URL}/records/${recordId}/documents`, {
    method: 'POST',
    body: formData,
    signal,
  });
};

export const uploadDocument = (recordId, file, signal) => {
  const formData = new FormData();
  formData.append('documents', file);
  return apiRequest(`${API_BASE_URL}/records/${recordId}/documents`, {
    method: 'POST',
    body: formData,
    signal,
  });
};

export const deleteDocument = (documentId, signal) => apiRequest(`${API_BASE_URL}/documents/${documentId}`, { method: 'DELETE', signal });

export const getDocument = (documentId, signal) => apiRequest(`${API_BASE_URL}/documents/${documentId}`, { signal });

export const exportData = async () => {
  console.warn('Export functionality is not implemented on the backend.');
  return Promise.resolve({ mandanten: [], records: [] });
};

export const importData = async (data) => {
  console.warn('Import functionality is not implemented on the backend.');
  return Promise.resolve({ message: 'Daten erfolgreich importiert' });
};