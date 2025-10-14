const { Pool } = require('pg');

// Konfiguriere die Verbindung zur CLOUD-Datenbank
const pool = new Pool({
  user: 'postgres',
  host: '34.141.107.98',
  database: 'kanzlei',
  password: 'Techniker0!', // <--- HIER IHR PASSWORT EINTRAGEN
  port: 5432,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    // Beginne eine Transaktion
    await client.query('BEGIN');

    // 1. Tabelle erstellen
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS kanzlei_daten (
        id SERIAL PRIMARY KEY,
        mandant_name VARCHAR(255) NOT NULL,
        fall_status VARCHAR(50) NOT NULL
      );
    `;
    await client.query(createTableQuery);
    console.log('Tabelle "kanzlei_daten" erfolgreich erstellt oder existiert bereits.');

    // 2. Daten einfügen
    /*
    const insertDataQuery = `
      INSERT INTO kanzlei_daten (mandant_name, fall_status)
      VALUES
      ('Max Mustermann', 'aktiv'),
      ('Erika Mustermann', 'in Bearbeitung')
      ON CONFLICT (id) DO NOTHING;
    `;
    await client.query(insertDataQuery);
    console.log('Daten erfolgreich eingefügt.');
    */

    // Transaktion abschließen
    await client.query('COMMIT');
    console.log('Migration erfolgreich abgeschlossen!');

  } catch (err) {
    // Wenn ein Fehler auftritt, die Transaktion rückgängig machen
    await client.query('ROLLBACK');
    console.error('Migration fehlgeschlagen:', err.stack);
  } finally {
    // Verbindung freigeben
    client.release();
    pool.end();
  }
}

runMigration();
