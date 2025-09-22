import React from 'react';

/**
 * Eine Komponente zur Anzeige der Aktenliste in einer Tabelle.
 * @param {object[]} records - Die Liste der anzuzeigenden Akten.
 * @param {object[]} mandanten - Die Liste der Mandanten zum Verknüpfen der Namen.
 * @param {function} onEdit - Die Callback-Funktion zum Bearbeiten einer Akte.
 * @param {function} onDelete - Die Callback-Funktion zum Löschen einer Akte.
 */
export const AktenList = ({ records, mandanten, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <table className="min-w-full table-auto">
        <thead className="bg-gray-200 border-b border-gray-300">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
              Aktenzeichen
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
              Mandant
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
              Beschreibung
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
              Aktionen
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {records.map((record) => {
            const mandant = mandanten.find(m => m.id === record.mandantId);
            return (
              <tr key={record.id} className="hover:bg-gray-50 transition-colors duration-200">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {record.caseNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {mandant ? mandant.name : 'Unbekannt'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onEdit(record)}
                    className="text-indigo-600 hover:text-indigo-900 font-semibold px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors duration-200 mr-2"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => onDelete(record.id)}
                    className="text-red-600 hover:text-red-900 font-semibold px-2 py-1 rounded-lg hover:bg-red-100 transition-colors duration-200"
                  >
                    Löschen
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