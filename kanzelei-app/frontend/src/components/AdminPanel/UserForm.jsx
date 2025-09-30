import React, { useState, useEffect } from 'react';
import { ROLES } from '../../services/authService';

const UserForm = ({ user, onSubmit, onCancel, title }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'user',
        status: 'active',
    });

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username,
                password: '', // Password should not be pre-filled
                role: user.role,
                status: user.status,
            });
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <h2 className="text-xl font-bold">{title}</h2>
            <div>
                <label className="block mb-1 font-semibold" htmlFor="username">Username</label>
                <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded"
                    required
                />
            </div>
            {!user && ( // Only show password field for new users
                <div>
                    <label className="block mb-1 font-semibold" htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded"
                        required
                    />
                </div>
            )}
            <div>
                <label className="block mb-1 font-semibold" htmlFor="role">Rolle</label>
                <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded"
                >
                    {ROLES.map(role => (
                        <option key={role} value={role}>{role}</option>
                    ))}
                </select>
            </div>
             <div>
                <label className="block mb-1 font-semibold" htmlFor="status">Status</label>
                <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded"
                >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>
            <div className="flex justify-end space-x-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300">
                    Abbrechen
                </button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-700">
                    Speichern
                </button>
            </div>
        </form>
    );
};

export default UserForm;