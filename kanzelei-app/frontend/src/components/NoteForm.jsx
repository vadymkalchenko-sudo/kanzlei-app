import React, { useState } from 'react';
import { Button } from './ui/Button.jsx';

const NoteForm = ({ note, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    titel: note?.titel || '',
    inhalt: note?.inhalt || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ensure that required fields are filled
    if (!formData.titel || !formData.inhalt) {
      alert('Bitte füllen Sie alle Felder aus.');
      return;
    }
    onSubmit(formData);
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg">
      <h3 className="text-xl font-bold mb-6 text-gray-800">{note ? 'Notiz bearbeiten' : 'Neue Notiz erstellen'}</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="titel" className="block text-sm font-medium text-gray-700 mb-1">Titel der Notiz</label>
          <input
            type="text"
            name="titel"
            id="titel"
            value={formData.titel}
            onChange={handleChange}
            className="input-field w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="inhalt" className="block text-sm font-medium text-gray-700 mb-1">Freier Text</label>
          <textarea
            name="inhalt"
            id="inhalt"
            value={formData.inhalt}
            onChange={handleChange}
            className="input-field w-full"
            rows="6"
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

export default NoteForm;