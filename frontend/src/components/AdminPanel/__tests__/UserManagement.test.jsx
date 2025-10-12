import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserManagement from '../UserManagement';
import * as authService from '../../../services/authService';

// Mock the authService
jest.mock('../../../services/authService', () => ({
    ...jest.requireActual('../../../services/authService'),
    getUsers: jest.fn(),
    addUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    resetPassword: jest.fn(),
}));

const mockUsers = [
    { id: 1, username: 'testuser1', role: 'user', status: 'active', createdAt: new Date().toISOString() },
    { id: 2, username: 'testuser2', role: 'admin', status: 'inactive', createdAt: new Date().toISOString() },
];

describe('UserManagement', () => {
    beforeEach(() => {
        authService.getUsers.mockReturnValue(mockUsers);
        window.prompt = jest.fn();
        window.confirm = jest.fn().mockReturnValue(true);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('sollte die Benutzerliste korrekt rendern', () => {
        render(<UserManagement setFlashMessage={() => {}} />);
        expect(screen.getByText('Benutzerverwaltung')).toBeInTheDocument();
        expect(screen.getByText('testuser1')).toBeInTheDocument();
        expect(screen.getByText('testuser2')).toBeInTheDocument();
    });

    it('sollte den UserForm-Modal zum Hinzufügen eines Benutzers öffnen', async () => {
        render(<UserManagement setFlashMessage={() => {}} />);
        const addUserButton = screen.getByRole('button', { name: /neuen benutzer anlegen/i });
        await userEvent.click(addUserButton);
        expect(screen.getByRole('heading', { name: /neuen benutzer anlegen/i })).toBeInTheDocument();
    });

    it('sollte den UserForm-Modal zum Bearbeiten eines Benutzers öffnen', async () => {
        render(<UserManagement setFlashMessage={() => {}} />);
        const editButtons = screen.getAllByText('Bearbeiten');
        await userEvent.click(editButtons[0]);
        expect(screen.getByText('Benutzer bearbeiten')).toBeInTheDocument();
        expect(screen.getByDisplayValue('testuser1')).toBeInTheDocument();
    });

    it('sollte einen Benutzer löschen, wenn auf "Löschen" geklickt wird', async () => {
        render(<UserManagement setFlashMessage={() => {}} />);
        const deleteButtons = screen.getAllByText('Löschen');
        await userEvent.click(deleteButtons[0]);
        expect(authService.deleteUser).toHaveBeenCalledWith(1);
    });

    it('sollte das Passwort zurücksetzen, wenn die Eingabeaufforderung bestätigt wird', async () => {
        window.prompt.mockReturnValue('newpassword123');
        render(<UserManagement setFlashMessage={() => {}} />);
        const resetButton = screen.getAllByText('Passwort zurücksetzen')[0];
        await userEvent.click(resetButton);
        expect(authService.resetPassword).toHaveBeenCalledWith(1, 'newpassword123');
    });
});