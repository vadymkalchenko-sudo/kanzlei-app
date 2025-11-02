const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Konfiguriere die Verbindung zur lokalen Datenbank
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'kanzlei',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    // Beginne eine Transaktion
    await client.query('BEGIN');

    console.log('Starte Migration der Datenbankstruktur...');

    // 1. Lösche alte Tabellen (wenn sie existieren)
    await client.query('DROP TABLE IF EXISTS akten CASCADE');
    await client.query('DROP TABLE IF EXISTS mandanten CASCADE');
    await client.query('DROP TABLE IF EXISTS gegner CASCADE');
    await client.query('DROP TABLE IF EXISTS dokumente CASCADE');

    // 2. Erstelle neue Tabellen mit der korrekten Struktur
    const createTablesQuery = `
      CREATE TABLE IF NOT EXISTS mandanten (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        stammdaten_pfad TEXT
      );

      CREATE TABLE IF NOT EXISTS gegner (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        akten_id VARCHAR(255),
        stammdaten_pfad TEXT
      );

      CREATE TABLE IF NOT EXISTS akten (
        id VARCHAR(255) PRIMARY KEY,
        aktenzeichen VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        mandanten_id VARCHAR(255),
        dokumente_pfad TEXT
      );

      CREATE TABLE IF NOT EXISTS dokumente (
        id VARCHAR(255) PRIMARY KEY,
        akte_id VARCHAR(255),
        dateiname VARCHAR(255) NOT NULL,
        pfad TEXT NOT NULL,
        hochgeladen_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await client.query(createTablesQuery);
    console.log('Neue Tabellen erfolgreich erstellt.');

    // 3. Datenmigration von alten Tabellen zu neuen Tabellen
    // Mandanten migration
    const mandantenResult = await client.query('SELECT * FROM mandanten_old');
    for (const mandant of mandantenResult.rows) {
      const stammdatenPfad = `mandanten/${mandant.id}.json`;
      await client.query(
        'INSERT INTO mandanten (id, name, status, stammdaten_pfad) VALUES ($1, $2, $3, $4)',
        [mandant.id, mandant.name, mandant.status, stammdatenPfad]
      );
    }
    console.log(`Mandanten: ${mandantenResult.rows.length} Einträge migriert`);

    // Gegner migration
    const gegnerResult = await client.query('SELECT * FROM gegner_old');
    for (const gegner of gegnerResult.rows) {
      const stammdatenPfad = `gegner/${gegner.id}.json`;
      await client.query(
        'INSERT INTO gegner (id, name, akten_id, stammdaten_pfad) VALUES ($1, $2, $3, $4)',
        [gegner.id, gegner.name, gegner.akten_id, stammdatenPfad]
      );
    }
    console.log(`Gegner: ${gegnerResult.rows.length} Einträge migriert`);

    // Akten migration
    const aktenResult = await client.query('SELECT * FROM akten_old');
    for (const akte of aktenResult.rows) {
      const dokumentePfad = `akten/${akte.id}/dokumente`;
      await client.query(
        'INSERT INTO akten (id, aktenzeichen, status, mandanten_id, dokumente_pfad) VALUES ($1, $2, $3, $4, $5)',
        [akte.id, akte.aktenzeichen, akte.status, akte.mandanten_id, dokumentePfad]
      );
    }
    console.log(`Akten: ${aktenResult.rows.length} Einträge migriert`);

    // Transaktion abschließen
    await client.query('COMMIT');
    console.log('Migration erfolgreich abgeschlossen!');

  } catch (err) {
    // Wenn ein Fehler auftritt, die Transaktion rückgängig machen
    await client.query('ROLLBACK');
    console.error('Migration fehlgeschlagen:', err.stack);
    throw err;
  } finally {
    // Verbindung freigeben
    client.release();
    pool.end();
  }
}

// Führe die Migration aus, wenn das Skript direkt ausgeführt wird
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration };