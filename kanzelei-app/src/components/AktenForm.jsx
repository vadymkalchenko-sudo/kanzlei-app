import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button.jsx';

const initialFormData = {
  // Akten-Daten
  status: 'offen',
  gegner: '',
  schadenDatum: '',
  kennzeichen: '',
  // Mandanten-Daten
  mandantId: '', // ID des bestehenden Mandanten
  name: '',
  email: '',
  street: '',
  zipCode: '',
  city: '',
};

export const AktenForm = ({ akte, mandanten, onSubmit, onCancel, nextCaseNumber }) => {
  const [formData, setFormData] = useState({ ...initialFormData, ...akte });
  const [isNewMandant, setIsNewMandant] = useState(!akte?.mandantId);

  useEffect(() => {
    if (akte) {
      // Wenn eine Akte bearbeitet wird, die Mandantendaten laden
      const mandant = mandanten.find(m => m.id === akte.mandantId);
      if (mandant) {
        setFormData(prev => ({
          ...prev,
          ...mandant,
          status: akte.status,
          gegner: akte.gegner,
          schadenDatum: akte.schadenDatum,
          kennzeichen: akte.kennzeichen,
        }));
      }
    }
  }, [akte, mandanten]);

  const handleMandantSelectChange = (e) => {
    const mandantId = e.target.value;
    const selectedMandant = mandanten.find((m) => m.id === mandantId);
    if (selectedMandant) {
      setFormData({ ...formData, ...selectedMandant, mandantId: selectedMandant.id });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Die Logik, ob ein Mandant aktualisiert oder neu erstellt wird,
    // wird im übergeordneten Hook (useKanzleiLogic) behandelt.
    onSubmit({ ...formData, isNewMandant });
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <h3 className="text-xl font-bold mb-4">
        {akte ? 'Akte bearbeiten' : 'Neue Akte anlegen'}
      </h3>

      {/* Mandanten-Sektion */}
      <div className="p-4 border rounded-md bg-gray-50 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold">Mandant</h4>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isNewMandant}
              onChange={() => setIsNewMandant(!isNewMandant)}
              className="mr-2"
            />
            <span>Neuen Mandant anlegen</span>
          </label>
        </div>

        {!isNewMandant ? (
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="mandantId">
              Bestehenden Mandant auswählen
            </label>
            <select
              name="mandantId"
              id="mandantId"
              value={formData.mandantId}
              onChange={handleMandantSelectChange}
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:ring-blue-500"
              required
            >
              <option value="" disabled>Bitte wählen...</option>
              {mandanten.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Mandanten-Datenfelder */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Name" required className="input-field" />
          <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="E-Mail" required className="input-field" />
          <input type="text" name="street" value={formData.street} onChange={handleChange} placeholder="Straße" className="input-field md:col-span-2" />
          <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} placeholder="PLZ" className="input-field" />
          <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="Ort" className="input-field" />
        </div>
      </div>

      {/* Akten-Sektion */}
      <div className="p-4 border rounded-md bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="caseNumber">
              Aktennummer
            </label>
            <input
              type="text"
              name="caseNumber"
              id="caseNumber"
              value={formData.caseNumber || nextCaseNumber}
              className="input-field bg-gray-200"
              disabled
            />
          </div>
          <input type="text" name="gegner" value={formData.gegner} onChange={handleChange} placeholder="Gegner Name" className="input-field" />
          <input type="date" name="schadenDatum" value={formData.schadenDatum} onChange={handleChange} placeholder="Schaden-Datum" className="input-field" />
          <input type="text" name="kennzeichen" value={formData.kennzeichen} onChange={handleChange} placeholder="Kennzeichen" className="input-field" />
           <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">
              Status
            </label>
            <select name="status" id="status" value={formData.status} onChange={handleChange} className="input-field w-full">
              <option value="offen">Offen</option>
              <option value="geschlossen">Geschlossen</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4 mt-6">
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

export default AktenForm;