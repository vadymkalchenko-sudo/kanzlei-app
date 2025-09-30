import React, { useState } from 'react';
import AdminAuthScreen from './AdminAuthScreen';
import UserManagement from './UserManagement';

const AdminPanel = ({ userRole, setFlashMessage, setCurrentView }) => {
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

    const handleAuthSuccess = () => {
        setIsAdminAuthenticated(true);
    };

    const handleCancel = () => {
        setCurrentView('akten');
    };

    if (userRole !== 'admin' && userRole !== 'power_user') {
        return (
            <div className="p-4">
                <h1 className="text-2xl font-bold text-red-600">Zugriff verweigert</h1>
                <p>Sie haben keine Berechtigung, auf diese Seite zuzugreifen.</p>
            </div>
        );
    }

    return (
        <div>
            {!isAdminAuthenticated ? (
                <AdminAuthScreen
                    onAuthSuccess={handleAuthSuccess}
                    onCancel={handleCancel}
                    setFlashMessage={setFlashMessage}
                />
            ) : (
                <>
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={handleCancel}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
                        >
                            Zurück zur Aktenverwaltung
                        </button>
                    </div>
                    <UserManagement setFlashMessage={setFlashMessage} />
                </>
            )}
        </div>
    );
};

export default AdminPanel;