export const ROLES = ['admin', 'user', 'extern'];

let mockUsers = [
    { id: 1, username: 'admin', password: 'password', role: 'admin', status: 'active', createdAt: new Date().toISOString() },
    { id: 2, username: 'user', password: 'password', role: 'user', status: 'active', createdAt: new Date().toISOString() },
    { id: 3, username: 'extern', password: 'password', role: 'extern', status: 'inactive', createdAt: new Date().toISOString() },
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
export const login = (username, password) => {
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        return { success: true, user: { username: user.username, role: user.role } };
    }
    return { success: false, message: 'Ungültiger Benutzername oder Passwort' };
};