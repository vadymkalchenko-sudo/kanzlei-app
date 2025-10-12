import React from 'react';

const getDeadlineStatus = (record) => {
  if (!record.notizen || record.notizen.length === 0) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  let closestDeadline = null;

  for (const note of record.notizen) {
    if (note.datum && !note.erledigt) {
      const deadlineDate = new Date(note.datum);
      if (!closestDeadline || deadlineDate < closestDeadline) {
        closestDeadline = deadlineDate;
      }
    }
  }

  if (!closestDeadline) {
    return null;
  }

  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);

  if (closestDeadline <= today) {
    return 'urgent'; // Red
  }
  if (closestDeadline <= sevenDaysFromNow) {
    return 'warning'; // Yellow
  }

  return null;
};

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
            const deadlineStatus = getDeadlineStatus(record);
            return (
              <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                  {deadlineStatus && (
                    <span className={`mr-2 ${deadlineStatus === 'urgent' ? 'text-red-500' : 'text-yellow-500'}`} title={deadlineStatus === 'urgent' ? 'Frist heute oder überfällig' : 'Frist in weniger als 7 Tagen'}>
                      ⏰
                    </span>
                  )}
                  {record.caseNumber}
                </td>
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