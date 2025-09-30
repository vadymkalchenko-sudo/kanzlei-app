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

    if (userRole !== 'admin') {
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
                <UserManagement setFlashMessage={setFlashMessage} />
            )}
        </div>
    );
};

export default AdminPanel;