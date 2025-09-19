import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button.jsx';

const initialFormData = {
  // Mandanten-Daten
  anrede: '',
  vorname: '',
  nachname: '',
  strasse: '',
  hausnummer: '',
  plz: '',
  stadt: '',
  email: '',
  telefon: '',
  iban: '',
  notizen: '',
  // Fall-Daten
  mdtKennzeichen: '',
  gegnerKennzeichen: '',
  unfallDatum: '',
  gegner: '', // Existing field
  status: 'offen', // Existing field
  kennzeichen: '', // Existing field
  // Meta-Daten
  mandantId: '',
};

export const AktenForm = ({ akte, mandanten, onSubmit, onCancel, nextCaseNumber }) => {
  const [formData, setFormData] = useState({ ...initialFormData, ...akte });
  const [isNewMandant, setIsNewMandant] = useState(!akte?.mandantId);

  useEffect(() => {
    if (akte) {
      const mandant = mandanten.find(m => m.id === akte.mandantId);
      if (mandant) {
        // Splitting name into vorname and nachname assuming 'name' is "Vorname Nachname"
        const nameParts = mandant.name ? mandant.name.split(' ') : ['', ''];
        const vorname = nameParts[0] || '';
        const nachname = nameParts.slice(1).join(' ') || '';

        setFormData(prev => ({
          ...prev,
          ...mandant,
          vorname,
          nachname,
          status: akte.status,
          gegner: akte.gegner,
          unfallDatum: akte.schadenDatum, // Mapping schadenDatum to unfallDatum
          kennzeichen: akte.kennzeichen,
        }));
      }
    }
  }, [akte, mandanten]);

  const handleMandantSelectChange = (e) => {
    const mandantId = e.target.value;
    if (!mandantId) {
      setFormData({ ...initialFormData, isNewMandant: false });
      return;
    }
    const selectedMandant = mandanten.find((m) => m.id === mandantId);
    if (selectedMandant) {
      const nameParts = selectedMandant.name ? selectedMandant.name.split(' ') : ['', ''];
      const vorname = nameParts[0] || '';
      const nachname = nameParts.slice(1).join(' ') || '';

      setFormData({
        ...formData,
        ...initialFormData, // Reset fields
        ...selectedMandant,
        vorname,
        nachname,
        mandantId: selectedMandant.id,
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (isNewMandant) {
      // Rule 1: Nachname is required
      if (!formData.nachname.trim()) {
        newErrors.nachname = 'Nachname ist ein Pflichtfeld.';
      }

      // Rule 2: At least one contact method is required
      const hasEmail = !!formData.email;
      const hasTelefon = !!formData.telefon;
      const hasFullAddress = !!formData.strasse && !!formData.hausnummer && !!formData.plz && !!formData.stadt;

      if (!hasEmail && !hasTelefon && !hasFullAddress) {
        newErrors.contact = 'Bitte geben Sie mindestens eine Kontaktmöglichkeit an (E-Mail, Telefon oder vollständige Adresse).';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ ...formData, isNewMandant });
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <h3 className="text-2xl font-bold mb-6 text-center">
        {akte ? 'Akte bearbeiten' : 'Neue Akte anlegen'}
      </h3>

      <div className="flex flex-col md:flex-row gap-8">

        {/* Linke Spalte: Mandanten-Daten */}
        <div className="flex-1 p-4 border rounded-lg bg-gray-50">
          <h4 className="text-xl font-semibold mb-4 border-b pb-2">Mandanten-Daten</h4>

          <label className="flex items-center cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={isNewMandant}
              onChange={() => setIsNewMandant(!isNewMandant)}
              className="mr-2"
            />
            <span>Neuen Mandant anlegen</span>
          </label>

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
                className="input-field w-full"
                required
              >
                <option value="">Bitte wählen...</option>
                {mandanten.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.city})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-3">
              <select name="anrede" value={formData.anrede} onChange={handleChange} className="input-field w-full">
                <option value="">Anrede</option>
                <option value="Herr">Herr</option>
                <option value="Frau">Frau</option>
                <option value="Divers">Divers</option>
              </select>
              <input type="text" name="vorname" value={formData.vorname} onChange={handleChange} placeholder="Vorname" className="input-field w-full" />
              <div>
                <input type="text" name="nachname" value={formData.nachname} onChange={handleChange} placeholder="Nachname*" className="input-field w-full" />
                {errors.nachname && <p className="text-red-500 text-xs mt-1">{errors.nachname}</p>}
              </div>
              <div className="flex gap-3">
                <input type="text" name="strasse" value={formData.strasse} onChange={handleChange} placeholder="Straße" className="input-field w-2/3" />
                <input type="text" name="hausnummer" value={formData.hausnummer} onChange={handleChange} placeholder="Nr." className="input-field w-1/3" />
              </div>
              <div className="flex gap-3">
                <input type="text" name="plz" value={formData.plz} onChange={handleChange} placeholder="PLZ" className="input-field w-1/3" />
                <input type="text" name="stadt" value={formData.stadt} onChange={handleChange} placeholder="Stadt" className="input-field w-2/3" />
              </div>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="E-Mail-Adresse" className="input-field w-full" />
              <input type="tel" name="telefon" value={formData.telefon} onChange={handleChange} placeholder="Telefonnummer" className="input-field w-full" />
              {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact}</p>}
              <input type="text" name="iban" value={formData.iban} onChange={handleChange} placeholder="IBAN" className="input-field w-full" />
              <textarea name="notizen" value={formData.notizen} onChange={handleChange} placeholder="Notizen..." className="input-field w-full h-24"></textarea>
            </div>
          )}
        </div>

        {/* Rechte Spalte: Falldaten */}
        <div className="flex-1 p-4 border rounded-lg bg-gray-50">
          <h4 className="text-xl font-semibold mb-4 border-b pb-2">Falldaten</h4>
          <div className="space-y-3">
            <input type="text" name="mdtKennzeichen" value={formData.mdtKennzeichen} onChange={handleChange} placeholder="MDT Kennzeichen" className="input-field w-full" />
            <input type="text" name="gegnerKennzeichen" value={formData.gegnerKennzeichen} onChange={handleChange} placeholder="Gegner Kennzeichen" className="input-field w-full" />
            <input type="date" name="unfallDatum" value={formData.unfallDatum} onChange={handleChange} placeholder="Unfall Datum" className="input-field w-full" />
            <input type="text" name="gegner" value={formData.gegner} onChange={handleChange} placeholder="Gegner Name" className="input-field w-full" />
            <input type="text" name="kennzeichen" value={formData.kennzeichen} onChange={handleChange} placeholder="Kennzeichen" className="input-field w-full" />
            <div className="pt-2">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">
                Status
              </label>
              <select name="status" id="status" value={formData.status} onChange={handleChange} className="input-field w-full">
                <option value="offen">Offen</option>
                <option value="geschlossen">Geschlossen</option>
              </select>
            </div>
             <div className="pt-2">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="caseNumber">
                Aktennummer
              </label>
              <input
                type="text"
                name="caseNumber"
                id="caseNumber"
                value={formData.caseNumber || nextCaseNumber}
                className="input-field bg-gray-200 w-full"
                disabled
              />
            </div>
          </div>
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

export default AktenForm;