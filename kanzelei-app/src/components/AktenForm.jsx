import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/Button.jsx';

const initialFormData = {
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
  mdtKennzeichen: '',
  gegnerKennzeichen: '',
  unfallDatum: '',
  gegner: '',
  status: 'offen',
  kennzeichen: '',
  sonstigeBeteiligte: '',
  beteiligteDritte: [],
  mandantId: '',
};

export const AktenForm = ({ akte, mandanten, dritteBeteiligte, onSubmit, onCancel, nextCaseNumber, handleDritteSubmit }) => {
  const [formData, setFormData] = useState({ ...initialFormData, ...akte });
  const [isNewMandant, setIsNewMandant] = useState(!akte?.mandantId);
  const [errors, setErrors] = useState({});

  // State for Dritte Beteiligte search
  const [dritteSearch, setDritteSearch] = useState('');
  const [selectedDritte, setSelectedDritte] = useState([]);
  const [isBeteiligteOpen, setIsBeteiligteOpen] = useState(false);
  const [isAddBeteiligteModalOpen, setIsAddBeteiligteModalOpen] = useState(false);

  // Effect to populate selectedDritte when editing an existing Akte
  useEffect(() => {
    if (akte && akte.beteiligteDritte && dritteBeteiligte?.length > 0) {
      const initialSelected = dritteBeteiligte.filter(d =>
        akte.beteiligteDritte.includes(d.id)
      );
      setSelectedDritte(initialSelected);
    }
  }, [akte, dritteBeteiligte]);

  // Effect to update formData when selectedDritte changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      beteiligteDritte: selectedDritte.map(d => d.id),
    }));
  }, [selectedDritte]);

  useEffect(() => {
    if (akte) {
      const mandant = mandanten.find(m => m.id === akte.mandantId);
      if (mandant) {
        const nameParts = mandant.name ? mandant.name.split(' ') : ['', ''];
        setFormData(prev => ({
          ...prev,
          ...mandant,
          vorname: nameParts[0] || '',
          nachname: nameParts.slice(1).join(' ') || '',
          status: akte.status,
          gegner: akte.gegner,
          unfallDatum: akte.schadenDatum,
          kennzeichen: akte.kennzeichen,
          sonstigeBeteiligte: akte.sonstigeBeteiligte || '',
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
      setFormData({
        ...formData,
        ...initialFormData,
        ...selectedMandant,
        vorname: nameParts[0] || '',
        nachname: nameParts.slice(1).join(' ') || '',
        mandantId: selectedMandant.id,
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectDritte = (person) => {
    if (!selectedDritte.some(p => p.id === person.id)) {
      setSelectedDritte(prev => [...prev, person]);
    }
    setDritteSearch('');
  };

  const handleDeselectDritte = (personId) => {
    setSelectedDritte(prev => prev.filter(p => p.id !== personId));
  };

  const handleAddBeteiligteSubmit = async (personData) => {
    await handleDritteSubmit(personData);
    setIsAddBeteiligteModalOpen(false);
  };

  const validate = () => {
    const newErrors = {};
    if (isNewMandant) {
      if (!formData.nachname.trim()) {
        newErrors.nachname = 'Nachname ist ein Pflichtfeld.';
      }
      const hasEmail = !!formData.email;
      const hasTelefon = !!formData.telefon;
      const hasFullAddress = !!formData.strasse && !!formData.hausnummer && !!formData.plz && !!formData.stadt;
      if (!hasEmail && !hasTelefon && !hasFullAddress) {
        newErrors.contact = 'Bitte geben Sie mindestens eine Kontaktmöglichkeit an (E-Mail, Telefon oder vollständige Adresse).';
      }
    }

    // Date validation
    if (formData.unfallDatum) {
      const today = new Date().toISOString().split('T')[0];
      if (formData.unfallDatum > today) {
        newErrors.unfallDatum = 'Das Unfalldatum darf nicht in der Zukunft liegen.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ ...formData, isNewMandant, status: akte ? formData.status : 'offen' });
      onCancel();
    }
  };

  const filteredDritte =
    dritteSearch ?
    (dritteBeteiligte || []).filter(d =>
      d.name.toLowerCase().includes(dritteSearch.toLowerCase()) &&
      !selectedDritte.some(sd => sd.id === d.id)
    ) : [];

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <h3 className="text-2xl font-bold mb-6 text-center">
        {akte ? 'Akte bearbeiten' : 'Neue Akte anlegen'}
      </h3>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Column: Mandanten-Daten */}
        <div className="flex-1 p-4 border rounded-lg bg-gray-50">
           {/* Mandant form part is unchanged */}
           <h4 className="text-xl font-semibold mb-4 border-b pb-2">Mandanten-Daten</h4>
          <label className="flex items-center cursor-pointer mb-4">
            <input type="checkbox" checked={isNewMandant} onChange={() => setIsNewMandant(!isNewMandant)} className="mr-2" />
            <span>Neuen Mandant anlegen</span>
          </label>
          {!isNewMandant ? (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="mandantId">Bestehenden Mandant auswählen</label>
              <select name="mandantId" id="mandantId" value={formData.mandantId} onChange={handleMandantSelectChange} className="input-field w-full" required>
                <option value="">Bitte wählen...</option>
                {mandanten.map((m) => (<option key={m.id} value={m.id}>{m.name} ({m.city})</option>))}
              </select>
            </div>
          ) : (
            <div className="space-y-3">
              <select name="anrede" value={formData.anrede} onChange={handleChange} className="input-field w-full"><option value="">Anrede</option><option value="Herr">Herr</option><option value="Frau">Frau</option></select>
              <input type="text" name="vorname" value={formData.vorname} onChange={handleChange} placeholder="Vorname" className="input-field w-full" />
              <div><input type="text" name="nachname" value={formData.nachname} onChange={handleChange} placeholder="Nachname*" className="input-field w-full" /></div>
              <div className="flex gap-3"><input type="text" name="strasse" value={formData.strasse} onChange={handleChange} placeholder="Straße" className="input-field w-2/3" /><input type="text" name="hausnummer" value={formData.hausnummer} onChange={handleChange} placeholder="Nr." className="input-field w-1/3" /></div>
              <div className="flex gap-3"><input type="text" name="plz" value={formData.plz} onChange={handleChange} placeholder="PLZ" className="input-field w-1/3" /><input type="text" name="stadt" value={formData.stadt} onChange={handleChange} placeholder="Stadt" className="input-field w-2/3" /></div>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="E-Mail-Adresse" className="input-field w-full" />
              <input type="tel" name="telefon" value={formData.telefon} onChange={handleChange} placeholder="Telefonnummer" className="input-field w-full" />
              <input type="text" name="iban" value={formData.iban} onChange={handleChange} placeholder="IBAN" className="input-field w-full" />
              <textarea name="notizen" value={formData.notizen} onChange={handleChange} placeholder="Notizen..." className="input-field w-full h-24"></textarea>
            </div>
          )}
        </div>
        {/* Right Column: Falldaten & Beteiligte */}
        <div className="flex-1 p-4 border rounded-lg bg-gray-50">
          <h4 className="text-xl font-semibold mb-4 border-b pb-2">Falldaten</h4>
          <div className="space-y-3">
            {/* Falldaten part is unchanged */}
            <input type="text" name="mdtKennzeichen" value={formData.mdtKennzeichen} onChange={handleChange} placeholder="MDT Kennzeichen" className="input-field w-full" />
            <input type="text" name="gegnerKennzeichen" value={formData.gegnerKennzeichen} onChange={handleChange} placeholder="Gegner Kennzeichen" className="input-field w-full" />
            <div>
              <input
                type={formData.unfallDatum ? 'date' : 'text'}
                name="unfallDatum"
                value={formData.unfallDatum}
                onChange={handleChange}
                onFocus={(e) => e.target.type = 'date'}
                onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                placeholder="Unfall Datum"
                className="input-field w-full text-gray-500"
              />
            </div>
            <input type="text" name="gegner" value={formData.gegner} onChange={handleChange} placeholder="Gegner Name" className="input-field w-full" />
            <input type="text" name="kennzeichen" value={formData.kennzeichen} onChange={handleChange} placeholder="Kennzeichen" className="input-field w-full" />
            {akte && (
              <div className="pt-2">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">Status</label>
                <select name="status" id="status" value={formData.status} onChange={handleChange} className="input-field w-full">
                  <option value="offen">Offen</option>
                  <option value="geschlossen">Geschlossen</option>
                </select>
              </div>
            )}
            <div className="pt-2"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="caseNumber">Aktennummer</label><input type="text" name="caseNumber" id="caseNumber" value={formData.caseNumber || nextCaseNumber} className="input-field bg-gray-200 w-full" disabled /></div>

            {/* Beteiligte Section (Accordion) */}
            <div className="pt-4 border-t mt-4">
              <button
                type="button"
                onClick={() => setIsBeteiligteOpen(!isBeteiligteOpen)}
                className="w-full flex justify-between items-center text-lg font-semibold text-left"
              >
                Beteiligte
                <span className={`transform transition-transform duration-200 ${isBeteiligteOpen ? 'rotate-180' : ''}`}>
                  &#9660;
                </span>
              </button>
              {isBeteiligteOpen && (
                <div className="mt-4 space-y-4">
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="dritteSearch">
                      Dritte Beteiligte (aus Stammdaten)
                    </label>
                    <div className="relative">
                      <input
                        type="search"
                        id="dritteSearch"
                        value={dritteSearch}
                        onChange={(e) => setDritteSearch(e.target.value)}
                        placeholder="Suchen..."
                        className="input-field w-full"
                      />
                      {filteredDritte.length > 0 && (
                        <div className="absolute z-10 w-full bg-white border rounded-b-lg max-h-48 overflow-y-auto">
                          {filteredDritte.map(person => (
                            <div
                              key={person.id}
                              onClick={() => handleSelectDritte(person)}
                              className="p-2 hover:bg-gray-100 cursor-pointer"
                            >
                              {person.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedDritte.map(person => (
                        <div key={person.id} className="flex items-center bg-blue-100 text-blue-800 text-sm font-semibold px-2 py-1 rounded-full">
                          <span>{person.name}</span>
                          <button
                            type="button"
                            onClick={() => handleDeselectDritte(person.id)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <Button
                        type="button"
                    onClick={() => setIsAddBeteiligteModalOpen(true)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm py-1 px-3"
                      >
                        Beteiligten hinzufügen
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sonstigeBeteiligte">
                      Sonstige Beteiligte (Freitext)
                    </label>
                    <textarea
                      name="sonstigeBeteiligte"
                      id="sonstigeBeteiligte"
                      value={formData.sonstigeBeteiligte}
                      onChange={handleChange}
                      className="input-field w-full h-20"
                      placeholder="Weitere beteiligte Personen oder Firmen..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end space-x-4 mt-8">
        <Button type="button" onClick={onCancel} className="bg-gray-300 hover:bg-gray-400 text-gray-800">Abbrechen</Button>
        <Button type="submit">Speichern</Button>
      </div>

      <Modal isOpen={isAddBeteiligteModalOpen} onClose={() => setIsAddBeteiligteModalOpen(false)}>
        <PersonForm
          onSubmit={handleAddBeteiligteSubmit}
          onCancel={() => setIsAddBeteiligteModalOpen(false)}
          title="Neuen Beteiligten anlegen"
        />
      </Modal>
    </form>
  );
};

export default AktenForm;