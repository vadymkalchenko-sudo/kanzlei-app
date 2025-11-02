export const ROLES = ['admin', 'power_user', 'user', 'extern'];

let mockUsers = [
    { id: 1, username: 'admin', password: 'password', role: 'admin', status: 'active', createdAt: new Date().toISOString() },
    { id: 2, username: 'power_user', password: 'password', role: 'power_user', status: 'active', createdAt: new Date().toISOString() },
    { id: 3, username: 'user', password: 'password', role: 'user', status: 'active', createdAt: new Date().toISOString() },
    { id: 4, username: 'extern', password: 'password', role: 'extern', status: 'inactive', createdAt: new Date().toISOString() },
];

export const getUsers = () => {
    const users = sessionStorage.getItem('mockUsers');
    if (users) {
        return JSON.parse(users);
    }
    sessionStorage.setItem('mockUsers', JSON.stringify(mockUsers));
    return mockUsers;
};

export const addUser = (username, password, role) => {
    const users = getUsers();
    const newUser = {
        id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
        username,
        password,
        role,
        status: 'active',
        createdAt: new Date().toISOString(),
    };
    const updatedUsers = [...users, newUser];
    sessionStorage.setItem('mockUsers', JSON.stringify(updatedUsers));
    return newUser;
};

export const updateUser = (userId, data) => {
    let users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        throw new Error('Benutzer nicht gefunden');
    }
    users[userIndex] = { ...users[userIndex], ...data };
    sessionStorage.setItem('mockUsers', JSON.stringify(users));
    return users[userIndex];
};

export const deleteUser = (userId) => {
    let users = getUsers();
    const updatedUsers = users.filter(u => u.id !== userId);
    if (users.length === updatedUsers.length) {
        throw new Error('Benutzer nicht gefunden');
    }
    sessionStorage.setItem('mockUsers', JSON.stringify(updatedUsers));
    return true;
};

export const resetPassword = (userId, newPassword) => {
    let users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        throw new Error('Benutzer nicht gefunden');
    }
    users[userIndex].password = newPassword;
    sessionStorage.setItem('mockUsers', JSON.stringify(users));
    return users[userIndex];
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