import React from 'react';
import { Button } from './ui/Button.jsx';

export const Aktenansicht = ({ record, mandant, onGoBack }) => {
  if (!record || !mandant) {
    return (
      <div>
        <p>Lade Akte...</p>
        <Button onClick={onGoBack}>Zurück zur Übersicht</Button>
      </div>
    );
  }

  const handleDocDoubleClick = (doc) => {
    alert(`Dokument "${doc.beschreibung}" wird geöffnet... (Simulation)`);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <h2 className="text-2xl font-semibold text-gray-800">
          Aktenansicht: {record.caseNumber}
        </h2>
        <Button onClick={onGoBack}>Zurück zur Übersicht</Button>
      </div>

      {/* Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold text-lg mb-2">Mandant</h3>
          <p>{mandant.name}</p>
          <p>{mandant.street}, {mandant.zipCode} {mandant.city}</p>
          <p>{mandant.email}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold text-lg mb-2">Gegner</h3>
          <p>{record.gegner || 'N/A'}</p>
          <p>Kennzeichen: {record.gegnerKennzeichen || 'N/A'}</p>
        </div>
      </div>

      {/* Document Management Section */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Dokumenten- und Zahlungsverwaltung</h3>

        {/* Drag and Drop Placeholder */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6 bg-gray-50 hover:bg-gray-100 cursor-pointer">
          <p className="text-gray-500">Dateien hierher ziehen oder klicken zum Hochladen</p>
        </div>

        {/* Documents Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 border">Datum</th>
                <th className="px-4 py-2 border">Beschreibung</th>
                <th className="px-4 py-2 border">Format</th>
                <th className="px-4 py-2 border text-right">Soll</th>
                <th className="px-4 py-2 border text-right">Haben</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {(record.dokumente || []).map((doc, index) => (
                <tr key={index} onDoubleClick={() => handleDocDoubleClick(doc)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-2 border">{doc.datum}</td>
                  <td className="px-4 py-2 border">{doc.beschreibung}</td>
                  <td className="px-4 py-2 border">{doc.format}</td>
                  <td className="px-4 py-2 border text-right">{doc.soll?.toFixed(2)} €</td>
                  <td className="px-4 py-2 border text-right">{doc.haben?.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Aktenansicht;
