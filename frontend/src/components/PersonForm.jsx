import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button.jsx';

const PersonForm = ({ person, onSubmit, onCancel, title, fetchData }) => {
  // Für Mandanten und Gegner verwenden wir unterschiedliche Formate
  const [formData, setFormData] = useState({
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
    ...person,
  });

  useEffect(() => {
    // Wenn person Daten enthält, müssen wir diese entsprechend aufbereiten
    if (person) {
      // Für Mandanten/Gegner, die aus dem Backend kommen, könnten einige Felder anders benannt sein
      let preparedData = { ...person };
      
      // Wenn es sich um einen Mandanten handelt, könnte der Name in verschiedenen Feldern vorliegen
      if (person.name && !person.vorname && !person.nachname) {
        const nameParts = person.name.split(' ') || ['', ''];
        const vorname = nameParts[0];
        const nachname = nameParts.slice(1).join(' ');
        preparedData = { ...preparedData, vorname, nachname };
      }
      
      // Wenn es sich um ein Objekt mit Adresse handelt, müssen wir die Felder extrahieren
      if (person.adresse) {
        const { strasse, hausnummer, plz, stadt } = person.adresse;
        preparedData = { ...preparedData, strasse, hausnummer, plz, stadt };
      }
      
      setFormData(preparedData);
    } else {
      setFormData({
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
      });
    }
  }, [person]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    try {
      // Wenn Vorname und Nachname vorhanden sind, kombinieren wir sie zu einem Namen
      const { vorname, nachname, ...rest } = formData;
      let finalData = { ...rest };
      if (vorname || nachname) {
        const name = `${vorname} ${nachname}`.trim();
        finalData = { ...finalData, name };
      }
      await onSubmit(finalData);
      setSuccess(true);
      // Nach erfolgreichem Speichern: Datenliste aktualisieren
      if (typeof fetchData === 'function') {
        await fetchData();
      }
      onCancel();
    } catch (err) {
      setError(err.message || 'Fehler beim Speichern.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg">
      <h3 className="text-xl font-bold mb-6 text-gray-800">{title}</h3>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">Datensatz erfolgreich gespeichert!</div>}
      <div className="space-y-4">
        <select name="anrede" value={formData.anrede} onChange={handleChange} className="input-field w-full">
          <option value="">Anrede</option>
          <option value="Herr">Herr</option>
          <option value="Frau">Frau</option>
        </select>
        <div className="flex gap-4">
          <input type="text" name="vorname" value={formData.vorname} onChange={handleChange} placeholder="Vorname" className="input-field w-1/2" required />
          <input type="text" name="nachname" value={formData.nachname} onChange={handleChange} placeholder="Nachname" className="input-field w-1/2" required />
        </div>
        <div className="flex gap-4">
          <input type="text" name="strasse" value={formData.strasse} onChange={handleChange} placeholder="Straße" className="input-field w-2/3" />
          <input type="text" name="hausnummer" value={formData.hausnummer} onChange={handleChange} placeholder="Nr." className="input-field w-1/3" />
        </div>
        <div className="flex gap-4">
          <input type="text" name="plz" value={formData.plz} onChange={handleChange} placeholder="PLZ" className="input-field w-1/3" />
          <input type="text" name="stadt" value={formData.stadt} onChange={handleChange} placeholder="Stadt" className="input-field w-2/3" />
        </div>
        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="E-Mail-Adresse" className="input-field w-full" />
        <input type="tel" name="telefon" value={formData.telefon} onChange={handleChange} placeholder="Telefonnummer" className="input-field w-full" />
        <input type="text" name="iban" value={formData.iban} onChange={handleChange} placeholder="IBAN" className="input-field w-full" />
        <textarea name="notizen" value={formData.notizen} onChange={handleChange} placeholder="Notizen..." className="input-field w-full h-24"></textarea>
      </div>
      <div className="flex justify-end space-x-4 mt-8">
        <Button type="button" onClick={onCancel} className="bg-gray-300 hover:bg-gray-400 text-gray-800">
          Abbrechen
        </Button>
        <Button type="button" onClick={handleSubmit}>
          Speichern
        </Button>
      </div>
    </form>
  );
};

export default PersonForm;
