import React, { useState } from 'react';
import { Button } from './ui/Button.jsx';

/**
 * Formular zum Erstellen oder Bearbeiten einer Akte.
 * @param {object} akte - Optionales Objekt, wenn eine Akte bearbeitet wird.
 * @param {object[]} mandanten - Die Liste der Mandanten.
 * @param {function} onSubmit - Callback-Funktion zum Übermitteln des Formulars.
 * @param {function} onCancel - Callback-Funktion zum Schließen des Formulars.
 */
export const AktenForm = ({ akte, mandanten, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    mandantId: akte?.mandantId || '',
    description: akte?.description || '',
    ...akte,
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
    <form onSubmit={handleSubmit} className="p-6">
      <h3 className="text-xl font-bold mb-4">
        {akte ? 'Akte bearbeiten' : 'Neue Akte anlegen'}
      </h3>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="mandantId">
          Mandant
        </label>
        <select
          name="mandantId"
          id="mandantId"
          value={formData.mandantId}
          onChange={handleChange}
          className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:ring-blue-500"
          required
        >
          <option value="" disabled>Bitte wählen Sie einen Mandanten</option>
          {mandanten.map((mandant) => (
            <option key={mandant.id} value={mandant.id}>
              {mandant.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
          Beschreibung
        </label>
        <textarea
          name="description"
          id="description"
          value={formData.description}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:ring-blue-500"
          rows="4"
          required
        ></textarea>
      </div>
      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800"
        >
          Abbrechen
        </Button>
        <Button type="submit">
          Speichern
        </Button>
      </div>
    </form>
  );
};

export default AktenForm;