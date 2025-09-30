import React, { useState, useEffect } from 'react';
import { getUsers, addUser, updateUser, deleteUser, resetPassword } from '../../services/authService';
import { Modal } from '../ui/Modal';
import UserForm from './UserForm';

const UserManagement = ({ setFlashMessage }) => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);

    const fetchUsers = () => {
        try {
            const userList = getUsers();
            setUsers(userList);
        } catch (error) {
            setFlashMessage({ type: 'error', message: 'Fehler beim Laden der Benutzer.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddUser = () => {
        setUserToEdit(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user) => {
        setUserToEdit(user);
        setIsModalOpen(true);
    };

    const handleDeleteUser = (userId) => {
        if (window.confirm('Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?')) {
            try {
                deleteUser(userId);
                fetchUsers();
                setFlashMessage({ type: 'success', message: 'Benutzer erfolgreich gelöscht.' });
            } catch (error) {
                setFlashMessage({ type: 'error', message: 'Fehler beim Löschen des Benutzers.' });
            }
        }
    };

    const handleResetPassword = (userId) => {
        const newPassword = prompt('Bitte geben Sie das neue Passwort ein:');
        if (newPassword) {
            try {
                resetPassword(userId, newPassword);
                setFlashMessage({ type: 'success', message: 'Passwort erfolgreich zurückgesetzt.' });
            } catch (error) {
                setFlashMessage({ type: 'error', message: 'Fehler beim Zurücksetzen des Passworts.' });
            }
        }
    };

    const handleFormSubmit = (formData) => {
        try {
            if (userToEdit) {
                updateUser(userToEdit.id, formData);
                setFlashMessage({ type: 'success', message: 'Benutzer erfolgreich aktualisiert.' });
            } else {
                addUser(formData.username, formData.password, formData.role);
                setFlashMessage({ type: 'success', message: 'Benutzer erfolgreich hinzugefügt.' });
            }
            fetchUsers();
            setIsModalOpen(false);
        } catch (error) {
            setFlashMessage({ type: 'error', message: `Fehler: ${error.message}` });
        }
    };

    if (isLoading) {
        return <div>Lade Benutzer...</div>;
    }

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">Benutzerverwaltung</h1>
                <button
                    onClick={handleAddUser}
                    className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700"
                >
                    Neuen Benutzer anlegen
                </button>
            </div>
            <div className="overflow-x-auto bg-white rounded shadow">
                <table className="min-w-full bg-white">
                    <thead className="text-white bg-gray-800">
                        <tr>
                            <th className="px-4 py-2 text-left">ID</th>
                            <th className="px-4 py-2 text-left">Username</th>
                            <th className="px-4 py-2 text-left">Rolle</th>
                            <th className="px-4 py-2 text-left">Status</th>
                            <th className="px-4 py-2 text-left">Erstellt am</th>
                            <th className="px-4 py-2 text-left">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {users.map((user) => (
                            <tr key={user.id} className="border-b">
                                <td className="px-4 py-2">{user.id}</td>
                                <td className="px-4 py-2">{user.username}</td>
                                <td className="px-4 py-2">{user.role}</td>
                                <td className="px-4 py-2">{user.status}</td>
                                <td className="px-4 py-2">{new Date(user.createdAt).toLocaleDateString()}</td>
                                <td className="px-4 py-2">
                                    <button onClick={() => handleEditUser(user)} className="mr-2 text-blue-500 hover:text-blue-700">Bearbeiten</button>
                                    <button onClick={() => handleResetPassword(user.id)} className="mr-2 text-yellow-500 hover:text-yellow-700">Passwort zurücksetzen</button>
                                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:text-red-700">Löschen</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <UserForm
                    user={userToEdit}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setIsModalOpen(false)}
                    title={userToEdit ? 'Benutzer bearbeiten' : 'Neuen Benutzer anlegen'}
                />
            </Modal>
        </div>
    );
};

export default UserManagement;