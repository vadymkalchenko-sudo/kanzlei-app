import React, { useState } from 'react';
import { Button } from './ui/Button.jsx';

const NoteForm = ({ note, onSubmit, onCancel }) => {
  const [isDeadline, setIsDeadline] = useState(!!note?.datum);
  const [formData, setFormData] = useState({
    titel: note?.titel || '',
    inhalt: note?.inhalt || '',
    datum: note?.datum ? new Date(note.datum).toISOString().split('T')[0] : '',
  });

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    if (name === 'isDeadline') {
      setIsDeadline(checked);
      if (!checked) {
        // Clear date if it's no longer a deadline
        setFormData((prev) => ({ ...prev, datum: '' }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = { ...formData };
    if (isDeadline) {
      // If it's an existing note, preserve its 'erledigt' status, otherwise default to false
      dataToSubmit.erledigt = note?.erledigt || false;
    } else {
      // If it's not a deadline, ensure 'datum' and 'erledigt' are not sent
      delete dataToSubmit.datum;
      delete dataToSubmit.erledigt;
    }
    onSubmit(dataToSubmit);
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
        <div className="flex items-center">
          <input
            type="checkbox"
            name="isDeadline"
            id="isDeadline"
            checked={isDeadline}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isDeadline" className="ml-2 block text-sm text-gray-900">
            Als Frist setzen
          </label>
        </div>
        {isDeadline && (
          <div>
            <label htmlFor="datum" className="block text-sm font-medium text-gray-700 mb-1">Fristdatum</label>
            <input
              type="date"
              name="datum"
              id="datum"
              value={formData.datum}
              onChange={handleChange}
              className="input-field w-full"
              required={isDeadline}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        )}
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