import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminPanel from '../AdminPanel';

describe('AdminPanel', () => {
    it('sollte den AdminAuthScreen rendern, wenn der Benutzer nicht authentifiziert ist', () => {
        render(<AdminPanel userRole="admin" setFlashMessage={() => {}} setCurrentView={() => {}} />);
        expect(screen.getByText('Admin-Panel-Authentifizierung')).toBeInTheDocument();
    });

    it('sollte "Zugriff verweigert" anzeigen, wenn die Rolle nicht "admin" ist', () => {
        render(<AdminPanel userRole="user" setFlashMessage={() => {}} setCurrentView={() => {}} />);
        expect(screen.getByText('Zugriff verweigert')).toBeInTheDocument();
    });
});