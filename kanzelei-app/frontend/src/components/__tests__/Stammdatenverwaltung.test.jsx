import React from 'react';
import { render, screen } from '@testing-library/react';
import Stammdatenverwaltung from '../Stammdatenverwaltung';

describe('Stammdatenverwaltung', () => {
    const mockProps = {
        onGoBack: jest.fn(),
        mandanten: [],
        dritteBeteiligte: [],
        onMandantSubmit: jest.fn(),
        onMandantDelete: jest.fn(),
        onDritteSubmit: jest.fn(),
        onDritteDelete: jest.fn(),
    };

    it('sollte den "Neuen Mandant anlegen" Button für die Rolle "admin" anzeigen', () => {
        render(<Stammdatenverwaltung {...mockProps} userRole="admin" />);
        expect(screen.getByText('+ Neuen Mandant anlegen')).toBeInTheDocument();
    });

    it('sollte den "Neuen Mandant anlegen" Button für die Rolle "power_user" anzeigen', () => {
        render(<Stammdatenverwaltung {...mockProps} userRole="power_user" />);
        expect(screen.getByText('+ Neuen Mandant anlegen')).toBeInTheDocument();
    });

    it('sollte den "Neuen Mandant anlegen" Button für die Rolle "user" anzeigen', () => {
        render(<Stammdatenverwaltung {...mockProps} userRole="user" />);
        expect(screen.getByText('+ Neuen Mandant anlegen')).toBeInTheDocument();
    });

    it('sollte den "Neuen Mandant anlegen" Button für die Rolle "extern" nicht anzeigen', () => {
        render(<Stammdatenverwaltung {...mockProps} userRole="extern" />);
        expect(screen.queryByText('+ Neuen Mandant anlegen')).not.toBeInTheDocument();
    });
});