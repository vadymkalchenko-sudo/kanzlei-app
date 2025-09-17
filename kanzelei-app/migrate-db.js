require('dotenv').config();
const { Pool } = require('pg');

// Konfiguriere die Verbindung zur CLOUD-Datenbank
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
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
    const insertDataQuery = `
      INSERT INTO kanzlei_daten (mandant_name, fall_status)
      VALUES ($1, $2), ($3, $4)
      ON CONFLICT (id) DO NOTHING;
    `;
    const values = ['Max Mustermann', 'aktiv', 'Erika Mustermann', 'in Bearbeitung'];
    await client.query(insertDataQuery, values);
    console.log('Daten erfolgreich eingefügt.');

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
