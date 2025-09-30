import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminPanel from '../AdminPanel';

describe('AdminPanel', () => {
    it('sollte den AdminAuthScreen für die Rolle "admin" rendern', () => {
        render(<AdminPanel userRole="admin" setFlashMessage={() => {}} setCurrentView={() => {}} />);
        expect(screen.getByText('Admin-Panel-Authentifizierung')).toBeInTheDocument();
    });

    it('sollte den AdminAuthScreen für die Rolle "power_user" rendern', () => {
        render(<AdminPanel userRole="power_user" setFlashMessage={() => {}} setCurrentView={() => {}} />);
        expect(screen.getByText('Admin-Panel-Authentifizierung')).toBeInTheDocument();
    });

    it('sollte "Zugriff verweigert" für die Rolle "user" anzeigen', () => {
        render(<AdminPanel userRole="user" setFlashMessage={() => {}} setCurrentView={() => {}} />);
        expect(screen.getByText('Zugriff verweigert')).toBeInTheDocument();
    });

    it('sollte "Zugriff verweigert" für die Rolle "extern" anzeigen', () => {
        render(<AdminPanel userRole="extern" setFlashMessage={() => {}} setCurrentView={() => {}} />);
        expect(screen.getByText('Zugriff verweigert')).toBeInTheDocument();
    });

    it('sollte zur Aktenansicht navigieren, wenn der Zurück-Button geklickt wird', async () => {
        const setCurrentViewMock = jest.fn();
        render(<AdminPanel userRole="admin" setFlashMessage={() => {}} setCurrentView={setCurrentViewMock} />);

        // Authenticate first
        const passwordInput = screen.getByPlaceholderText('Zweites Passwort');
        const confirmButton = screen.getByRole('button', { name: /bestätigen/i });

        await userEvent.type(passwordInput, 'adminpass');
        await userEvent.click(confirmButton);

        // Now the back button should be visible
        const backButton = screen.getByRole('button', { name: /zurück zur aktenverwaltung/i });
        await userEvent.click(backButton);

        expect(setCurrentViewMock).toHaveBeenCalledWith('akten');
    });
});