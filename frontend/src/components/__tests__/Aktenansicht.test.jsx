import React from 'react';
import { render, screen } from '@testing-library/react';
import Aktenansicht from '../Aktenansicht';

describe('Aktenansicht', () => {
    const mockRecord = {
        id: 1,
        caseNumber: 'A-123',
        dokumente: [{ id: 'doc-1', beschreibung: 'doc1.pdf', datum: new Date().toISOString() }],
        notizen: [{ id: 'note-1', titel: 'Test Note', aktualisierungsdatum: new Date().toISOString() }],
        aufgaben: [{ id: 'task-1', titel: 'Test Task', datum: new Date().toISOString() }],
    };
    const mockMandant = { id: 1, name: 'Test Mandant' };
    const mockProps = {
        record: mockRecord,
        mandant: mockMandant,
        dritteBeteiligte: [],
        onGoBack: jest.fn(),
        onDirectEdit: jest.fn(),
        onAddDocuments: jest.fn(),
        onDeleteDocument: jest.fn(),
        onUpdateDocument: jest.fn(),
        onAddNote: jest.fn(),
        onUpdateNote: jest.fn(),
        onDeleteNote: jest.fn(),
        onUpdateRecord: jest.fn(),
        onAddAufgabe: jest.fn(),
        onUpdateAufgabe: jest.fn(),
        onDeleteAufgabe: jest.fn(),
        onToggleAufgabeErledigt: jest.fn(),
    };

    it('sollte Bearbeiten- und Löschen-Buttons für die Rolle "admin" anzeigen', () => {
        render(<Aktenansicht {...mockProps} userRole="admin" />);
        expect(screen.getAllByTitle('Bearbeiten').length).toBeGreaterThan(0);
        expect(screen.getAllByTitle('Löschen').length).toBeGreaterThan(0);
    });

    it('sollte Bearbeiten- und Löschen-Buttons für die Rolle "power_user" anzeigen', () => {
        render(<Aktenansicht {...mockProps} userRole="power_user" />);
        expect(screen.getAllByTitle('Bearbeiten').length).toBeGreaterThan(0);
        expect(screen.getAllByTitle('Löschen').length).toBeGreaterThan(0);
    });

    it('sollte Bearbeiten-Buttons, aber keine Löschen-Buttons für die Rolle "user" anzeigen', () => {
        render(<Aktenansicht {...mockProps} userRole="user" />);
        expect(screen.getAllByTitle('Bearbeiten').length).toBeGreaterThan(0);
        expect(screen.queryAllByTitle('Löschen').length).toBe(0);
    });

    it('sollte keine Bearbeiten- oder Löschen-Buttons für die Rolle "extern" anzeigen', () => {
        render(<Aktenansicht {...mockProps} userRole="extern" />);
        expect(screen.queryAllByTitle('Bearbeiten').length).toBe(0);
        expect(screen.queryAllByTitle('Löschen').length).toBe(0);
    });
});