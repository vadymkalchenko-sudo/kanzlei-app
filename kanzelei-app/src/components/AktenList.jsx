import React from 'react';

/**
 * Eine Komponente zur Anzeige der Aktenliste in einer Tabelle.
 * @param {object[]} records - Die Liste der anzuzeigenden Akten.
 * @param {object[]} mandanten - Die Liste der Mandanten zum Verknüpfen der Namen.
 * @param {function} onEdit - Die Callback-Funktion zum Bearbeiten einer Akte.
 * @param {function} onDelete - Die Callback-Funktion zum Löschen einer Akte.
 */
export const AktenList = ({ records, mandanten, onEdit }) => {
  // onDelete prop is removed as per requirements
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-md">
      <table className="min-w-full table-auto">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Aktenzeichen</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mandant</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Gegner</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Schaden-Datum</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kennzeichen</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Aktionen</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {records.map((record) => {
            const mandant = mandanten.find(m => m.id === record.mandantId);
            return (
              <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{record.caseNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{mandant ? mandant.name : 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                   <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.status === 'offen' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {record.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.gegner || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.schadenDatum || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.kennzeichen || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onEdit(record)}
                    className="text-indigo-600 hover:text-indigo-900 font-semibold"
                  >
                    Bearbeiten
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AktenList;