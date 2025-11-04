const { Pool } = require('pg');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Hilfsfunktion zum Schreiben von JSON-Dateien
const writeJsonFile = async (filePath, data) => {
    try {
        // Sicherstellen, dass das Verzeichnis existiert
        const dirname = path.dirname(filePath);
        await fs.mkdir(dirname, { recursive: true });

        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        console.log(`JSON-Datei geschrieben: ${filePath}`);
    } catch (error) {
        console.error('Fehler beim Schreiben der JSON-Datei:', error);
        throw error;
    }
};

// Hilfsfunktion zum Lesen von JSON-Dateien
const readJsonFile = async (filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Fehler beim Lesen der JSON-Datei:', error);
        throw error;
    }
};

const findAll = async () => {
    try {
        const query = 'SELECT * FROM mandanten';
        const result = await pool.query(query);
        
        // Für jede Mandanten-Instanz die JSON-Datei lesen und Daten kombinieren
        const mandantenWithDetails = [];
        for (const mandant of result.rows) {
            if (mandant.stammdaten_pfad) {
                try {
                    const jsonData = await readJsonFile(path.join(__dirname, '../master_data', mandant.stammdaten_pfad));
                    mandantenWithDetails.push({ ...mandant, ...jsonData });
                } catch (error) {
                    console.error(`Fehler beim Lesen der Mandanten-Datei ${mandant.stammdaten_pfad}:`, error);
                    mandantenWithDetails.push(mandant);
                }
            } else {
                mandantenWithDetails.push(mandant);
            }
        }
        return mandantenWithDetails;
    } catch (error) {
        console.error('Fehler beim Abrufen aller Mandanten:', error);
        return [];
    }
};

const findById = async (id) => {
    try {
        const result = await pool.query('SELECT * FROM mandanten WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return null;
        }
        const mandant = result.rows[0];
        
        // JSON-Datei lesen und Daten kombinieren
        if (mandant.stammdaten_pfad) {
            try {
                const jsonData = await readJsonFile(path.join(__dirname, '../master_data', mandant.stammdaten_pfad));
                return { ...mandant, ...jsonData };
            } catch (error) {
                console.error(`Fehler beim Lesen der Mandanten-Datei ${mandant.stammdaten_pfad}:`, error);
                return mandant;
            }
        }
        return mandant;
    } catch (error) {
        console.error(`Fehler beim Abrufen des Mandanten mit ID ${id}:`, error);
        return null;
    }
};

const create = async (mandantData) => {
    try {
        const { id: bodyId, ...stammdaten_json } = mandantData;
        const id = bodyId || crypto.randomUUID();

        // Name Sicherstellung
        const name = (stammdaten_json.vorname && stammdaten_json.nachname)
            ? `${stammdaten_json.vorname} ${stammdaten_json.nachname}`
            : `Mandant-${id.substring(0, 8)}`;

        // Status Sicherstellung
        const status = stammdaten_json.status || 'Aktiv';
        
        // JSON-Datei schreiben
        const jsonFilePath = `mandanten/${id}.json`;
        const fullPath = path.join(__dirname, '../master_data', jsonFilePath);
        await writeJsonFile(fullPath, stammdaten_json);
        
        // Pfad in DB speichern
        const query = `
            INSERT INTO mandanten (id, name, status, stammdaten_pfad)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const values = [id, name, status, jsonFilePath];

        const result = await pool.query(query, values);
        const dbResult = result.rows[0];
        
        // Kombinierte Daten zurückgeben
        return { ...dbResult, ...stammdaten_json };
    } catch (error) {
        console.error('Fehler beim Erstellen eines neuen Mandanten:', error);
        throw error;
    }
};

const update = async (id, body) => {
    try {
        const { name, status, ...stammdaten } = body;

        // Zuerst die bestehenden Daten aus der DB holen
        const existingResult = await pool.query('SELECT * FROM mandanten WHERE id = $1', [id]);
        if (existingResult.rows.length === 0) {
            return null;
        }
        const existingMandant = existingResult.rows[0];
        
        // JSON-Datei aktualisieren oder erstellen
        let jsonFilePath = existingMandant.stammdaten_pfad;
        if (!jsonFilePath) {
            jsonFilePath = `mandanten/${id}.json`;
        }
        const fullPath = path.join(__dirname, '../master_data', jsonFilePath);
        await writeJsonFile(fullPath, stammdaten);
        
        // DB aktualisieren
        const query = `
            UPDATE mandanten
            SET name = $2, status = $3, stammdaten_pfad = $4
            WHERE id = $1
            RETURNING *
        `;
        const values = [id, name, status, jsonFilePath];

        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            return null;
        }
        const dbResult = result.rows[0];
        
        // Kombinierte Daten zurückgeben
        return { ...dbResult, ...stammdaten };
    } catch (error) {
        console.error(`Fehler beim Aktualisieren des Mandanten mit ID ${id}:`, error);
        return null;
    }
};

const remove = async (id) => {
    try {
        // Zuerst die Mandanten-Daten aus der DB holen
        const existingResult = await pool.query('SELECT * FROM mandanten WHERE id = $1', [id]);
        if (existingResult.rows.length === 0) {
            return 0;
        }
        const existingMandant = existingResult.rows[0];
        
        // JSON-Datei löschen, falls vorhanden
        if (existingMandant.stammdaten_pfad) {
            try {
                const fullPath = path.join(__dirname, '../master_data', existingMandant.stammdaten_pfad);
                await fs.unlink(fullPath);
                console.log(`JSON-Datei gelöscht: ${fullPath}`);
            } catch (error) {
                console.error(`Fehler beim Löschen der Mandanten-Datei ${existingMandant.stammdaten_pfad}:`, error);
            }
        }
        
        // DB Eintrag löschen
        const result = await pool.query('DELETE FROM mandanten WHERE id = $1', [id]);
        return result.rowCount;
    } catch (error) {
        console.error(`Fehler beim Löschen des Mandanten mit ID ${id}:`, error);
        return 0;
    }
};

module.exports = {
    findAll,
    findById,
    create,
    update,
    remove,
};