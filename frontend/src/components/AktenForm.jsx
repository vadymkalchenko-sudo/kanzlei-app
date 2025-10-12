import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button.jsx';
import { Modal } from './ui/Modal.jsx';
import PersonForm from './PersonForm.jsx';

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
  gegnerId: '',
  status: 'offen',
  kennzeichen: '',
  sonstigeBeteiligte: '',
  beteiligteDritte: [],
  mandantId: '',
};

export const AktenForm = ({ akte, mandanten, dritteBeteiligte, onRecordSubmit, onCancel, nextCaseNumber, handleDritteSubmit, handleMandantSubmit }) => {
  const [formData, setFormData] = useState({ ...initialFormData, ...akte });
  const [isNewMandant, setIsNewMandant] = useState(!akte?.mandantId);

  const [dritteSearch, setDritteSearch] = useState('');
  const [selectedDritte, setSelectedDritte] = useState([]);
  const [isBeteiligteOpen, setIsBeteiligteOpen] = useState(false);
  const [isAddBeteiligteModalOpen, setIsAddBeteiligteModalOpen] = useState(false);
  const [isAddMandantModalOpen, setIsAddMandantModalOpen] = useState(false);
  const [isAddGegnerModalOpen, setIsAddGegnerModalOpen] = useState(false);

  useEffect(() => {
    if (akte && akte.beteiligteDritte && dritteBeteiligte?.length > 0) {
      const initialSelected = dritteBeteiligte.filter(d => akte.beteiligteDritte.includes(d.id));
      setSelectedDritte(initialSelected);
    }
  }, [akte, dritteBeteiligte]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, beteiligteDritte: selectedDritte.map(d => d.id) }));
  }, [selectedDritte]);

  useEffect(() => {
    if (akte) {
      const mandant = mandanten.find(m => m.id === akte.mandantId);
      if (mandant) {
        setFormData(prev => ({
          ...prev, ...mandant, status: akte.status, gegnerId: akte.gegnerId,
          unfallDatum: akte.schadenDatum, kennzeichen: akte.kennzeichen,
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
      setFormData(prev => ({ ...prev, ...initialFormData, ...selectedMandant, mandantId: selectedMandant.id }));
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

  const handleAddGegnerSubmit = async (personData) => {
    const newGegner = await handleDritteSubmit(personData);
    if (newGegner) {
      setFormData(prev => ({ ...prev, gegnerId: newGegner.id }));
    }
    setIsAddGegnerModalOpen(false);
  };

  const handleAddMandantSubmit = (personData) => {
    setFormData(prev => ({ ...prev, ...personData }));
    setIsAddMandantModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let submissionData = { ...formData };
      let clientJustCreated = false;

      if (isNewMandant) {
        const { anrede, vorname, nachname, strasse, hausnummer, plz, stadt, email, telefon, iban, notizen } = formData;
        const name = `${vorname} ${nachname}`.trim();
        const mandantData = { anrede, name, strasse, hausnummer, plz, stadt, email, telefon, iban, notizen };

        const newMandant = await handleMandantSubmit(mandantData, { showMessage: false, fetchData: false });
        if (newMandant && newMandant.id) {
          submissionData.mandantId = newMandant.id;
          clientJustCreated = true;
        } else {
          console.error("Failed to create new client.");
          return;
        }
      }

      onRecordSubmit({ ...submissionData, clientJustCreated, status: akte ? formData.status : 'offen' });
      onCancel();
    } catch (error) {
      console.error("Error during form submission:", error);
    }
  };

  const filteredDritte = dritteSearch ? (dritteBeteiligte || []).filter(d =>
    d.name.toLowerCase().includes(dritteSearch.toLowerCase()) && !selectedDritte.some(sd => sd.id === d.id)
  ) : [];

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <h3 className="text-2xl font-bold mb-6 text-center">{akte ? 'Akte bearbeiten' : 'Neue Akte anlegen'}</h3>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 p-4 border rounded-lg bg-gray-50">
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
            <div>
              <Button type="button" onClick={() => setIsAddMandantModalOpen(true)}>
                Neuen Mandant im Formular anlegen
              </Button>
            </div>
          )}
        </div>
        <div className="flex-1 p-4 border rounded-lg bg-gray-50">
          <h4 className="text-xl font-semibold mb-4 border-b pb-2">Falldaten</h4>
          <div className="space-y-3">
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
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="gegnerId">Gegner (aus Stammdaten)</label>
              <div className="flex items-center gap-2">
                <select
                  name="gegnerId"
                  id="gegnerId"
                  value={formData.gegnerId}
                  onChange={handleChange}
                  className="input-field w-full"
                >
                  <option value="">Bitte wählen...</option>
                  {(dritteBeteiligte || []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <Button type="button" onClick={() => setIsAddGegnerModalOpen(true)} className="flex-shrink-0">
                  +
                </Button>
              </div>
            </div>
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

            <div className="pt-4 border-t mt-4">
              <button type="button" onClick={() => setIsBeteiligteOpen(!isBeteiligteOpen)} className="w-full flex justify-between items-center text-lg font-semibold text-left">
                Beteiligte
                <span className={`transform transition-transform duration-200 ${isBeteiligteOpen ? 'rotate-180' : ''}`}>&#9660;</span>
              </button>
              {isBeteiligteOpen && (
                <div className="mt-4 space-y-4">
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="dritteSearch">Dritte Beteiligte (aus Stammdaten)</label>
                    <div className="relative">
                      <input type="search" id="dritteSearch" value={dritteSearch} onChange={(e) => setDritteSearch(e.target.value)} placeholder="Suchen..." className="input-field w-full" />
                      {filteredDritte.length > 0 && (
                        <div className="absolute z-10 w-full bg-white border rounded-b-lg max-h-48 overflow-y-auto">
                          {filteredDritte.map(person => (<div key={person.id} onClick={() => handleSelectDritte(person)} className="p-2 hover:bg-gray-100 cursor-pointer">{person.name}</div>))}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedDritte.map(person => (
                        <div key={person.id} className="flex items-center bg-blue-100 text-blue-800 text-sm font-semibold px-2 py-1 rounded-full">
                          <span>{person.name}</span>
                          <button type="button" onClick={() => handleDeselectDritte(person.id)} className="ml-2 text-blue-600 hover:text-blue-800">&times;</button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <Button type="button" onClick={() => setIsAddBeteiligteModalOpen(true)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm py-1 px-3">Beteiligten hinzufügen</Button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sonstigeBeteiligte">Sonstige Beteiligte (Freitext)</label>
                    <textarea name="sonstigeBeteiligte" id="sonstigeBeteiligte" value={formData.sonstigeBeteiligte} onChange={handleChange} className="input-field w-full h-20" placeholder="Weitere beteiligte Personen oder Firmen..."></textarea>
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
        <PersonForm onSubmit={handleAddBeteiligteSubmit} onCancel={() => setIsAddBeteiligteModalOpen(false)} title="Neuen Beteiligten anlegen" />
      </Modal>

      <Modal isOpen={isAddMandantModalOpen} onClose={() => setIsAddMandantModalOpen(false)}>
        <PersonForm onSubmit={handleAddMandantSubmit} onCancel={() => setIsAddMandantModalOpen(false)} title="Neuen Mandant anlegen" />
      </Modal>

      <Modal isOpen={isAddGegnerModalOpen} onClose={() => setIsAddGegnerModalOpen(false)}>
        <PersonForm onSubmit={handleAddGegnerSubmit} onCancel={() => setIsAddGegnerModalOpen(false)} title="Neuen Gegner anlegen" />
      </Modal>
    </form>
  );
};

export default AktenForm;