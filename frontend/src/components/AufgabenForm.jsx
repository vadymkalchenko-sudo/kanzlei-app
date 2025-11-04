import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button.jsx';

const AufgabenForm = ({ aufgabe, onSubmit, onCancel }) => {
  const [titel, setTitel] = useState('');
  const [datum, setDatum] = useState('');
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (aufgabe) {
      setTitel(aufgabe.titel || '');
      setDatum(aufgabe.faelligkeitsdatum ? aufgabe.faelligkeitsdatum.split('T')[0] : '');
      setDetails(aufgabe.inhalt || '');
    } else {
      setTitel('');
      setDetails('');
      const today = new Date();
      today.setDate(today.getDate() + 14); // Default to 2 weeks from now
      setDatum(today.toISOString().split('T')[0]);
    }
  }, [aufgabe]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!titel || !datum) {
      alert('Bitte füllen Sie alle Felder aus.');
      return;
    }
    onSubmit({ titel, datum, details });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-xl w-96">
      <h2 className="text-xl font-semibold mb-4">{aufgabe ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen'}</h2>
      <div className="mb-4">
        <label htmlFor="titel" className="block text-sm font-medium text-gray-700">Titel</label>
        <input
          type="text"
          id="titel"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          required
        />
      </div>
       <div className="mb-4">
        <label htmlFor="details" className="block text-sm font-medium text-gray-700">Details</label>
        <textarea
          id="details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows="4"
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <div className="mb-6">
        <label htmlFor="datum" className="block text-sm font-medium text-gray-700">Datum</label>
        <input
          type="date"
          id="datum"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          required
        />
      </div>
      <div className="flex justify-end gap-4">
        <Button type="button" onClick={onCancel} className="bg-gray-300 hover:bg-gray-400 text-black">
          Abbrechen
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {aufgabe ? 'Speichern' : 'Erstellen'}
        </Button>
      </div>
    </form>
  );
};

export default AufgabenForm;