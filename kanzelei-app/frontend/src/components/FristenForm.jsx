import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button.jsx';

const FristenForm = ({ frist, onSubmit, onCancel }) => {
  const [titel, setTitel] = useState('');
  const [datum, setDatum] = useState('');

  useEffect(() => {
    if (frist) {
      setTitel(frist.titel || '');
      setDatum(frist.datum ? frist.datum.split('T')[0] : '');
    } else {
      setTitel('');
      const today = new Date();
      today.setDate(today.getDate() + 14); // Default to 2 weeks from now
      setDatum(today.toISOString().split('T')[0]);
    }
  }, [frist]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!titel || !datum) {
      alert('Bitte füllen Sie alle Felder aus.');
      return;
    }
    onSubmit({ titel, datum });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-xl w-96">
      <h2 className="text-xl font-semibold mb-4">{frist ? 'Frist bearbeiten' : 'Neue Frist erstellen'}</h2>
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
          {frist ? 'Speichern' : 'Erstellen'}
        </Button>
      </div>
    </form>
  );
};

export default FristenForm;