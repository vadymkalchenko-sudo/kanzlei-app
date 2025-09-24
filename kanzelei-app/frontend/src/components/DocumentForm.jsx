import React, { useState } from 'react';
import { Button } from './ui/Button.jsx';

const DocumentForm = ({ document, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    datum: document?.datum || '',
    beschreibung: document?.beschreibung || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg">
      <h3 className="text-xl font-bold mb-6 text-gray-800">Dokument bearbeiten</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="datum" className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
          <input
            type="date"
            name="datum"
            id="datum"
            value={formData.datum}
            onChange={handleChange}
            className="input-field w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="beschreibung" className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
          <input
            type="text"
            name="beschreibung"
            id="beschreibung"
            value={formData.beschreibung}
            onChange={handleChange}
            className="input-field w-full"
            required
          />
        </div>
      </div>
      <div className="flex justify-end space-x-4 mt-8">
        <Button type="button" onClick={onCancel} className="bg-gray-300 hover:bg-gray-400 text-gray-800">
          Abbrechen
        </Button>
        <Button type="submit">
          Speichern
        </Button>
      </div>
    </form>
  );
};

export default DocumentForm;
