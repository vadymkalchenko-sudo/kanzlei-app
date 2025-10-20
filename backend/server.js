require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer-Konfiguration: Speicher im RAM, KEIN Schreiben auf Festplatte
const upload = multer({ storage: multer.memoryStorage() });

// Repositories importieren
const aktenRepo = require('./repositories/aktenRepo');
const mandantenRepo = require('./repositories/mandantenRepo');
const gegnerRepo = require('./repositories/gegnerRepo');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Datenbank-Pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Datenbank-Initialisierung
const initializeDatabase = async () => {
    let client;
    try {
        client = await pool.connect();
        console.log('Datenbankverbindung erfolgreich.');

        // FIX: DROP TABLE Befehl MUSS auskommentiert bleiben.
        // await client.query('DROP TABLE IF EXISTS users, mandanten, akten, gegner CASCADE;');
        // console.log('Existing tables dropped.');

        // CREATE TABLE IF NOT EXISTS Befehle müssen bleiben.
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL
            );
        `);
        console.log('Tabelle "users" erstellt oder existiert bereits.');

        await client.query(`
            CREATE TABLE IF NOT EXISTS mandanten (
                id UUID PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                status VARCHAR(255),
                metadaten JSONB
            );
        `);
        console.log('Tabelle "mandanten" erstellt oder existiert bereits.');

        await client.query(`
            CREATE TABLE IF NOT EXISTS akten (
                id UUID PRIMARY KEY,
                aktenzeichen VARCHAR(255) UNIQUE NOT NULL,
                status VARCHAR(255),
                mandanten_id UUID REFERENCES mandanten(id),
                metadaten JSONB
            );
        `);
        console.log('Tabelle "akten" erstellt oder existiert bereits.');

        await client.query(`
            CREATE TABLE IF NOT EXISTS gegner (
                id UUID PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                akten_id UUID REFERENCES akten(id) ON DELETE CASCADE,
                metadaten JSONB
            );
        `);
        console.log('Tabelle "gegner" erstellt oder existiert bereits.');

        // Hinzufügen von GIN-Indizes für JSONB-Spalten zur Performance-Optimierung
        await client.query('CREATE INDEX IF NOT EXISTS idx_gin_mandanten_metadaten ON mandanten USING GIN (metadaten jsonb_path_ops);');
        console.log('GIN-Index für "mandanten.metadaten" erstellt oder existiert bereits.');

        await client.query('CREATE INDEX IF NOT EXISTS idx_gin_akten_metadaten ON akten USING GIN (metadaten jsonb_path_ops);');
        console.log('GIN-Index für "akten.metadaten" erstellt oder existiert bereits.');

        await client.query('CREATE INDEX IF NOT EXISTS idx_gin_gegner_metadaten ON gegner USING GIN (metadaten jsonb_path_ops);');
        console.log('GIN-Index für "gegner.metadaten" erstellt oder existiert bereits.');

        // Initialen Admin-Benutzer erstellen, falls nicht vorhanden
        const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
        if (adminPassword) {
            const adminExists = await client.query("SELECT * FROM users WHERE username = 'admin'");
            if (adminExists.rows.length === 0) {
                const passwordHash = await bcrypt.hash(adminPassword, 10);
                const adminId = crypto.randomUUID();
                await client.query(
                    'INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, $4)',
                    [adminId, 'admin', passwordHash, 'admin']
                );
                console.log('Initialer Admin-Benutzer erstellt.');
            }
        }

    } catch (err) {
        console.error('Fehler bei der Datenbankinitialisierung:', err.stack);
        process.exit(1); // Prozess beenden, wenn DB-Initialisierung fehlschlägt
    } finally {
        if (client) client.release();
    }
};

// Generische Router-Factory
const createRouter = (repo) => {
    const router = express.Router();

    router.get('/', async (req, res) => {
        try {
            const items = await repo.findAll();
            res.json(items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/', async (req, res) => {
        try {
            console.log('[DEBUG-PATH] Aktuelles Arbeitsverzeichnis:', process.cwd());
            const newItem = await repo.create(req.body);
            res.status(201).json(newItem);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/:id', async (req, res) => {
        try {
            const item = await repo.findById(req.params.id);
            if (!item) return res.status(404).json({ error: 'Nicht gefunden' });
            res.json(item);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/:id', async (req, res) => {
        try {
            let body = req.body;
            // Wenn Status auf 'geschlossen' gesetzt ist: Mandanten-Snapshot ziehen und in metadaten.mandantenSnapshot speichern
            if (body && body.status === 'geschlossen') {
                const akteId = req.params.id;
                // Aktuelle Akte abrufen, um mandanten_id zu bekommen (falls nicht im Body enthalten)
                const currentAkte = await repo.findById(akteId);
                const mandantenId = body.mandanten_id || currentAkte?.mandanten_id;
                if (mandantenId) {
                    // Mandanten-Datensatz laden (inkl. metadaten)
                    const { rows } = await pool.query('SELECT * FROM mandanten WHERE id = $1', [mandantenId]);
                    if (rows.length > 0) {
                        const mandantRow = rows[0];
                        // JSONB unbundling analog zu Repo: feste Felder + metadaten zusammenführen
                        const mandantSnapshot = mandantRow.metadaten
                            ? { ...mandantRow, ...mandantRow.metadaten }
                            : mandantRow;
                        if (mandantSnapshot.metadaten) delete mandantSnapshot.metadaten;

                        // Body so erweitern, dass mandantenSnapshot im JSONB-Feld metadaten landet
                        const { aktenzeichen, status, mandanten_id, ...restMeta } = body;
                        body = {
                            aktenzeichen,
                            status,
                            mandanten_id: mandantenId,
                            ...restMeta,
                            mandantenSnapshot,
                        };
                    }
                }
            }

            const updatedItem = await repo.update(req.params.id, body);
            if (!updatedItem) return res.status(404).json({ error: 'Nicht gefunden' });
            res.json(updatedItem);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            const count = await repo.remove(req.params.id);
            if (count === 0) return res.status(404).json({ error: 'Nicht gefunden' });
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};

// Router anwenden
app.use('/api/records', createRouter(aktenRepo));
app.use('/api/mandanten', createRouter(mandantenRepo));
app.use('/api/dritte-beteiligte', createRouter(gegnerRepo));

// Datei-Upload-Route
app.post('/api/records/:recordId/documents', upload.array('documents'), async (req, res) => {
    const { recordId } = req.params;
    console.log('[UPLOAD START]', { recordId, filesCount: req.files ? req.files.length : 0 });
    try {
        console.log('[DEBUG-PATH] Aktuelles Arbeitsverzeichnis:', process.cwd());
        const record = await aktenRepo.findById(recordId);
        if (!record) {
            console.error('[UPLOAD KRITISCH] Akte nicht gefunden', { recordId });
            return res.status(404).json({ error: 'Akte nicht gefunden' });
        }

        const files = req.files || [];
        const newDocuments = files.map(file => {
            try {
                const bufferLength = file && Buffer.isBuffer(file.buffer) ? file.buffer.length : 0;
                console.log('[UPLOAD DATEI]', {
                    name: file?.originalname,
                    size: file?.size,
                    bufferLength,
                    mimetype: file?.mimetype,
                });

                const hasValidBuffer = file && Buffer.isBuffer(file.buffer) && file.buffer.length > 0;
                if (!hasValidBuffer) {
                    if (file && typeof file.size === 'number' && file.size > 0) {
                        console.error('[UPLOAD KRITISCH] Puffer leer trotz Dateigröße > 0', {
                            name: file.originalname,
                            size: file.size,
                            bufferLength,
                        });
                        const err = new Error(`Upload-Fehler: Datei-Puffer fehlt oder ist leer für ${file.originalname}`);
                        err.status = 400;
                        throw err;
                    }
                }

                const dataB64 = hasValidBuffer ? file.buffer.toString('base64') : '';
                console.log('[UPLOAD KONV]', { name: file?.originalname, base64Length: dataB64.length });

                return {
                    id: crypto.randomUUID(),
                    name: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    createdAt: new Date().toISOString(),
                    data_b64: dataB64,
                };
            } catch (e) {
                console.error('[UPLOAD KRITISCH] Fehler bei Base64-Kodierung der Datei', file?.originalname, e);
                throw e;
            }
        });

        console.log('[UPLOAD DB]', { recordId, documentsToStore: newDocuments.length });

        const currentDocuments = record.dokumente || [];
        const updatedDocuments = [...currentDocuments, ...newDocuments];

        const updatedRecord = await aktenRepo.update(recordId, { ...record, dokumente: updatedDocuments });

        console.log('[UPLOAD END]', { recordId, totalDocuments: updatedDocuments.length });
        res.status(201).json(updatedRecord);
    } catch (error) {
        console.error('Fehler beim Datei-Upload:', error);
        if (error && error.status === 400) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Interner Serverfehler beim Upload' });
    }
});

// Auth-Routen
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Ungültige Anmeldeinformationen' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Ungültige Anmeldeinformationen' });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token, role: user.role });

    } catch (err) {
        console.error('Login-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// Server starten
const startServer = async () => {
    await initializeDatabase();
    app.listen(port, () => {
        console.log(`Server läuft auf http://localhost:${port}`);
    });
};

startServer();