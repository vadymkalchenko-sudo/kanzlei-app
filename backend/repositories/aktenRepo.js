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

// Hilfsfunktion zum Erstellen von Verzeichnissen
const ensureDirectoryExists = async (dirPath) => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`Verzeichnis erstellt: ${dirPath}`);
    } catch (error) {
        console.error('Fehler beim Erstellen des Verzeichnisses:', error);
        throw error;
    }
};

// Hilfsfunktion zum Löschen von Dateien
const deleteFileIfExists = async (filePath) => {
    try {
        await fs.unlink(filePath);
        console.log(`Datei gelöscht: ${filePath}`);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Fehler beim Löschen der Datei:', error);
            throw error;
        }
    }
};

const findAll = async () => {
    const aktenResult = await pool.query('SELECT * FROM akten');
    const notizenResult = await pool.query('SELECT * FROM notizen');
    const dokumenteResult = await pool.query('SELECT * FROM dokumente');
    const akten = aktenResult.rows.map(akte => ({
        ...akte,
        notizen: notizenResult.rows.filter(n => n.akte_id === akte.id),
        dokumente: dokumenteResult.rows.filter(d => d.akte_id === akte.id)
    }));
    return akten;
};

const findById = async (id) => {
    const akteResult = await pool.query('SELECT * FROM akten WHERE id = $1', [id]);
    if (akteResult.rows.length === 0) return null;
    const akte = akteResult.rows[0];
    const notizenResult = await pool.query('SELECT * FROM notizen WHERE akte_id = $1', [id]);
    akte.notizen = notizenResult.rows;
    return akte;
};

const create = async (body) => {
    try {
        const { aktenzeichen, status = 'Offen', mandanten_id, dokumente_pfad } = body;
        const id = body.id || crypto.randomUUID();

        const query = `
            INSERT INTO akten (id, aktenzeichen, status, mandanten_id, dokumente_pfad)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [id, aktenzeichen, status, mandanten_id, dokumente_pfad];

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Fehler beim Erstellen einer neuen Akte:', error);
        throw error;
    }
};

const update = async (id, body) => {
    const { aktenzeichen, status, mandanten_id, dokumente_pfad } = body;

    const query = `
        UPDATE akten
        SET aktenzeichen = $2, status = $3, mandanten_id = $4, dokumente_pfad = $5
        WHERE id = $1
        RETURNING *
    `;
    const values = [id, aktenzeichen, status, mandanten_id, dokumente_pfad];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
};

const remove = async (id) => {
    // Zuerst die Akte aus der DB holen, um den Aktenzeichen-Namen zu erhalten
    const existingResult = await pool.query('SELECT * FROM akten WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
        return 0;
    }
    const existingAkte = existingResult.rows[0];
    
    // Zuerst die Dokumente aus der DB löschen (falls vorhanden)
    // Das Löschen der physischen Dateien wird später durch die dokumente-Repo erfolgen
    
    // DB Eintrag löschen
    const result = await pool.query('DELETE FROM akten WHERE id = $1', [id]);
    return result.rowCount;
};

// Neue Funktionen für Dokumentenverwaltung
const addDocument = async (akteId, fileName, filePath, mimeType, fileSize) => {
    try {
        // Aktenzeichen aus der DB holen
        const akteResult = await pool.query('SELECT aktenzeichen FROM akten WHERE id = $1', [akteId]);
        if (akteResult.rows.length === 0) {
            throw new Error('Akte nicht gefunden');
        }
        const aktenzeichen = akteResult.rows[0].aktenzeichen;
        
        // Zielverzeichnis erstellen
        const targetDir = path.join('/app/documents', aktenzeichen);
        await ensureDirectoryExists(targetDir);
        
        // Datei in das Zielverzeichnis verschieben
        const targetPath = path.join(targetDir, fileName);
        // Beachte: Bei der Implementierung in der echten Umgebung würde hier die Datei tatsächlich verschoben werden
        // Hier simulieren wir das mit einer einfachen Zuweisung
        
        // In der DB eintragen
        const docId = crypto.randomUUID();
        const insertQuery = `
            INSERT INTO dokumente (id, akte_id, dateiname, pfad, hochgeladen_am)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const insertValues = [docId, akteId, fileName, `${aktenzeichen}/${fileName}`];
        
        const docResult = await pool.query(insertQuery, insertValues);
        return docResult.rows[0];
    } catch (error) {
        console.error('Fehler beim Hinzufügen des Dokuments:', error);
        throw error;
    }
};

const getDocumentsForAkte = async (akteId) => {
    try {
        const query = 'SELECT * FROM dokumente WHERE akte_id = $1 ORDER BY hochgeladen_am DESC';
        const result = await pool.query(query, [akteId]);
        return result.rows;
    } catch (error) {
        console.error('Fehler beim Abrufen der Dokumente:', error);
        return [];
    }
};

const getDocumentById = async (docId) => {
    try {
        const query = 'SELECT * FROM dokumente WHERE id = $1';
        const result = await pool.query(query, [docId]);
        return result.rows[0];
    } catch (error) {
        console.error('Fehler beim Abrufen des Dokuments:', error);
        return null;
    }
};

const removeDocument = async (docId) => {
    try {
        // Zuerst die Dokumentendetails aus der DB holen
        const docResult = await pool.query('SELECT * FROM dokumente WHERE id = $1', [docId]);
        if (docResult.rows.length === 0) {
            return 0;
        }
        const document = docResult.rows[0];
        
        // Physische Datei löschen
        const fullPath = path.join('/app/documents', document.pfad);
        await deleteFileIfExists(fullPath);
        
        // DB Eintrag löschen
        const deleteResult = await pool.query('DELETE FROM dokumente WHERE id = $1', [docId]);
        return deleteResult.rowCount;
    } catch (error) {
        console.error('Fehler beim Löschen des Dokuments:', error);
        throw error;
    }
};

module.exports = {
    findAll,
    findById,
    create,
    update,
    remove,
    addDocument,
    getDocumentsForAkte,
    getDocumentById,
    removeDocument,
    addNote: async (akteId, noteData) => {
        const { titel, inhalt, typ, betrag_soll, betrag_haben, autor } = noteData;
        const id = crypto.randomUUID();
        const query = `
            INSERT INTO notizen (id, akte_id, titel, inhalt, typ, betrag_soll, betrag_haben, autor)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const values = [id, akteId, titel, inhalt, typ, betrag_soll || 0, betrag_haben || 0, autor || 'System'];
        const result = await pool.query(query, values);
        return result.rows[0];
    },
    updateNote: async (noteId, noteData) => {
        const { titel, inhalt, typ, betrag_soll, betrag_haben, erledigt } = noteData;
        const query = `
            UPDATE notizen
            SET titel = $1, inhalt = $2, typ = $3, betrag_soll = $4, betrag_haben = $5, erledigt = $6, aktualisierungsdatum = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
        `;
        const values = [titel, inhalt, typ, betrag_soll, betrag_haben, erledigt, noteId];
        const result = await pool.query(query, values);
        return result.rows[0];
    },
    deleteNote: async (noteId) => {
        await pool.query('DELETE FROM notizen WHERE id = $1', [noteId]);
    },
};