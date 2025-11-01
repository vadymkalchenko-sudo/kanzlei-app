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
        const query = 'SELECT * FROM gegner';
        const result = await pool.query(query);
        
        // Für jeden Gegner die JSON-Datei lesen und Daten kombinieren
        const gegnerWithDetails = [];
        for (const gegner of result.rows) {
            if (gegner.stammdaten_pfad) {
                try {
                    const jsonData = await readJsonFile(path.join('/app/master_data', gegner.stammdaten_pfad));
                    gegnerWithDetails.push({ ...gegner, ...jsonData });
                } catch (error) {
                    console.error(`Fehler beim Lesen der Gegner-Datei ${gegner.stammdaten_pfad}:`, error);
                    gegnerWithDetails.push(gegner);
                }
            } else {
                gegnerWithDetails.push(gegner);
            }
        }
        return gegnerWithDetails;
    } catch (error) {
        console.error('Fehler beim Abrufen aller Gegner:', error);
        return [];
    }
};

const findById = async (id) => {
    try {
        const result = await pool.query('SELECT * FROM gegner WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return null;
        }
        const gegner = result.rows[0];
        
        // JSON-Datei lesen und Daten kombinieren
        if (gegner.stammdaten_pfad) {
            try {
                const jsonData = await readJsonFile(path.join('/app/master_data', gegner.stammdaten_pfad));
                return { ...gegner, ...jsonData };
            } catch (error) {
                console.error(`Fehler beim Lesen der Gegner-Datei ${gegner.stammdaten_pfad}:`, error);
                return gegner;
            }
        }
        return gegner;
    } catch (error) {
        console.error(`Fehler beim Abrufen des Gegners mit ID ${id}:`, error);
        return null;
    }
};

const create = async (body) => {
    try {
        const { name, akten_id, ...stammdaten } = body;
        const id = body.id || crypto.randomUUID();
        
        // JSON-Datei schreiben
        const jsonFilePath = `gegner/${id}.json`;
        const fullPath = path.join('/app/master_data', jsonFilePath);
        await writeJsonFile(fullPath, stammdaten);
        
        // Pfad in DB speichern
        const query = `
            INSERT INTO gegner (id, name, akten_id, stammdaten_pfad)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const values = [id, name, akten_id, jsonFilePath];

        const result = await pool.query(query, values);
        const dbResult = result.rows[0];
        
        // Kombinierte Daten zurückgeben
        return { ...dbResult, ...stammdaten };
    } catch (error) {
        console.error('Fehler beim Erstellen eines neuen Gegners:', error);
        return null;
    }
};

const update = async (id, body) => {
    try {
        const { name, akten_id, ...stammdaten } = body;

        // Zuerst die bestehenden Daten aus der DB holen
        const existingResult = await pool.query('SELECT * FROM gegner WHERE id = $1', [id]);
        if (existingResult.rows.length === 0) {
            return null;
        }
        const existingGegner = existingResult.rows[0];
        
        // JSON-Datei aktualisieren oder erstellen
        let jsonFilePath = existingGegner.stammdaten_pfad;
        if (!jsonFilePath) {
            jsonFilePath = `gegner/${id}.json`;
        }
        const fullPath = path.join('/app/master_data', jsonFilePath);
        await writeJsonFile(fullPath, stammdaten);
        
        // DB aktualisieren
        const query = `
            UPDATE gegner
            SET name = $2, akten_id = $3, stammdaten_pfad = $4
            WHERE id = $1
            RETURNING *
        `;
        const values = [id, name, akten_id, jsonFilePath];

        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            return null;
        }
        const dbResult = result.rows[0];
        
        // Kombinierte Daten zurückgeben
        return { ...dbResult, ...stammdaten };
    } catch (error) {
        console.error(`Fehler beim Aktualisieren des Gegners mit ID ${id}:`, error);
        return null;
    }
};

const remove = async (id) => {
    try {
        // Zuerst die Gegner-Daten aus der DB holen
        const existingResult = await pool.query('SELECT * FROM gegner WHERE id = $1', [id]);
        if (existingResult.rows.length === 0) {
            return 0;
        }
        const existingGegner = existingResult.rows[0];
        
        // JSON-Datei löschen, falls vorhanden
        if (existingGegner.stammdaten_pfad) {
            try {
                const fullPath = path.join('/app/master_data', existingGegner.stammdaten_pfad);
                await fs.unlink(fullPath);
                console.log(`JSON-Datei gelöscht: ${fullPath}`);
            } catch (error) {
                console.error(`Fehler beim Löschen der Gegner-Datei ${existingGegner.stammdaten_pfad}:`, error);
            }
        }
        
        // DB Eintrag löschen
        const result = await pool.query('DELETE FROM gegner WHERE id = $1', [id]);
        return result.rowCount;
    } catch (error) {
        console.error(`Fehler beim Löschen des Gegners mit ID ${id}:`, error);
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