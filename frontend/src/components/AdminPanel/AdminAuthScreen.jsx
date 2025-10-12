import React, { useState } from 'react';

const AdminAuthScreen = ({ onAuthSuccess, onCancel, setFlashMessage }) => {
    const [password, setPassword] = useState('');

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password === 'adminpass') {
            setFlashMessage({ type: 'success', message: 'Erfolgreich authentifiziert.' });
            onAuthSuccess();
        } else {
            setFlashMessage({ type: 'error', message: 'Falsches Passwort.' });
        }
    };

    return (
        <div className="flex items-center justify-center h-screen">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-900">Admin-Panel-Authentifizierung</h2>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="password-2fa" className="sr-only">
                                Zweites Passwort
                            </label>
                            <input
                                id="password-2fa"
                                name="password"
                                type="password"
                                required
                                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Zweites Passwort"
                                value={password}
                                onChange={handlePasswordChange}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md group hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Bestätigen
                        </button>
                    </div>
                </form>
                <button
                    onClick={onCancel}
                    className="relative flex justify-center w-full px-4 py-2 mt-4 text-sm font-medium text-gray-700 bg-gray-200 border border-transparent rounded-md group hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                    Abbrechen
                </button>
            </div>
        </div>
    );
};

export default AdminAuthScreen;