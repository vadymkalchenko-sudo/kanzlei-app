export const ROLES = ['admin', 'power_user', 'user', 'extern'];

// API-Endpunkte
const API_BASE = 'http://localhost:3001/api';

// Hilfsfunktion für API-Aufrufe
const apiCall = async (endpoint, options = {}) => {
    const token = sessionStorage.getItem('authToken');
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        ...options
    };

    const response = await fetch(`${API_BASE}${endpoint}`, defaultOptions);
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API-Fehler');
    }
    
    return response.json();
};

export const getUsers = async () => {
    return await apiCall('/users');
};

export const addUser = async (username, password, role) => {
    return await apiCall('/users', {
        method: 'POST',
        body: JSON.stringify({ username, password, role })
    });
};

export const updateUser = async (userId, data) => {
    return await apiCall(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
};

export const deleteUser = async (userId) => {
    return await apiCall(`/users/${userId}`, {
        method: 'DELETE'
    });
};

export const resetPassword = async (userId, newPassword) => {
    // Für das Zurücksetzen des Passworts wird eine separate API benötigt
    // In diesem Fall simulieren wir das mit einem PUT auf den Benutzer
    return await updateUser(userId, { password: newPassword });
};

export const getRoles = async () => {
    return await apiCall('/roles');
};

export const getPermissions = async () => {
    return await apiCall('/permissions');
};

// Mock login function for demonstration
export const login = async (username, password) => {
    try {
        const response = await fetch('http://localhost:3001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return { success: false, message: errorData.error || 'Login fehlgeschlagen' };
        }

        const { token, role } = await response.json();
        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('userRole', role);

        return { success: true, user: { username, role } };
    } catch (error) {
        return { success: false, message: 'Netzwerkfehler beim Login' };
    }
};

export const logout = () => {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userRole');
};

export const getToken = () => sessionStorage.getItem('authToken');
export const getUserRole = () => sessionStorage.getItem('userRole');