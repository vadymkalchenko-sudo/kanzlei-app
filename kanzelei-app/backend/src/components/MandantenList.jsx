import React from 'react';

/**
 * Eine Komponente zur Anzeige der Mandantenliste in einer Tabelle.
 * @param {object[]} mandanten - Die Liste der anzuzeigenden Mandanten.
 * @param {function} onEdit - Die Callback-Funktion zum Bearbeiten eines Mandanten.
 * @param {function} onDelete - Die Callback-Funktion zum Löschen eines Mandanten.
 */
export const MandantenList = ({ mandanten, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <table className="min-w-full table-auto">
        <thead className="bg-gray-200 border-b border-gray-300">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
              E-Mail
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
              Aktionen
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {mandanten.map((mandant) => (
            <tr key={mandant.id} className="hover:bg-gray-50 transition-colors duration-200">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {mandant.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {mandant.email}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onEdit(mandant)}
                  className="text-indigo-600 hover:text-indigo-900 font-semibold px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors duration-200 mr-2"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => onDelete(mandant.id)}
                  className="text-red-600 hover:text-red-900 font-semibold px-2 py-1 rounded-lg hover:bg-red-100 transition-colors duration-200"
                >
                  Löschen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MandantenList;