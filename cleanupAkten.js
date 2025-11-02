const { Pool } = require('pg');

// Sicherstellen, dass die Umgebungsvariablen geladen wurden
if (!process.env.DB_USER || !process.env.DB_HOST || !process.env.DB_DATABASE || !process.env.DB_PASSWORD || !process.env.DB_PORT) {
    console.error('Fehler: Nicht alle erforderlichen Umgebungsvariablen für die Datenbankverbindung sind gesetzt.');
    console.error('Diese müssen beim Aufruf des Skripts übergeben werden (z.B. DB_USER=user node script.js).');
    process.exit(1);
}

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const cleanup = async () => {
    let client;
    try {
        client = await pool.connect();
        console.log('Datenbankverbindung für Bereinigung hergestellt.');

        // Zuerst die betroffenen Zeilen anzeigen (Trockenlauf)
        const selectQuery = "SELECT id, aktenzeichen FROM akten WHERE aktenzeichen IS NULL OR aktenzeichen = ''";
        const { rows } = await client.query(selectQuery);

        if (rows.length === 0) {
            console.log('Keine fehlerhaften Akten zum Bereinigen gefunden.');
            return;
        }

        console.log(`Gefundene fehlerhafte Akten (${rows.length}):`);
        rows.forEach(row => {
            console.log(`- ID: ${row.id}, Aktenzeichen: '${row.aktenzeichen}'`);
        });

        // Löschvorgang durchführen
        const deleteQuery = "DELETE FROM akten WHERE aktenzeichen IS NULL OR aktenzeichen = ''";
        const result = await client.query(deleteQuery);

        console.log(`Bereinigung erfolgreich. ${result.rowCount} fehlerhafte Akte(n) wurden gelöscht.`);

    } catch (err) {
        console.error('Fehler während der Bereinigung:', err.stack);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
        console.log('Datenbankverbindung geschlossen.');
    }
};

cleanup();