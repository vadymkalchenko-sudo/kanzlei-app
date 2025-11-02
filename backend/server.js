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

        // Lese das korrekte Schema aus der init.sql-Datei
        const initSqlPath = path.join(__dirname, './init.sql');
        const initSql = fs.readFileSync(initSqlPath, 'utf-8');
        
        // Tabellen zwangsweise löschen für einen sauberen Start
        await client.query('DROP TABLE IF EXISTS dokumente, akten, gegner, mandanten, users CASCADE;');
        console.log('Alte Tabellen gelöscht.');

        // Führe die SQL-Befehle aus der Datei aus
        await client.query(initSql);
        console.log('Datenbankschema aus init.sql erfolgreich angewendet.');

        // Erstelle die 'users'-Tabelle separat, da sie nicht Teil der Anwendungsdaten-Persistenz ist
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL
            );
        `);
        console.log('Tabelle "users" erstellt oder existiert bereits.');

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
            console.error('[CREATE-FEHLER]', err); // Detailliertes Logging
            res.status(500).json({ message: err.message, stack: err.stack }); // Mehr Details in der Antwort
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

// Authentifizierungs-Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Router anwenden (jetzt mit Authentifizierung)
app.use('/api/records', authenticateToken, createRouter(aktenRepo));
app.use('/api/mandanten', authenticateToken, createRouter(mandantenRepo));
app.use('/api/dritte-beteiligte', authenticateToken, createRouter(gegnerRepo));

// --- Spezifische Routen für Notizen ---
app.post('/api/records/:recordId/notes', authenticateToken, async (req, res) => {
    try {
        const newNote = await aktenRepo.addNote(req.params.recordId, req.body);
        res.status(201).json(newNote);
    } catch (err) {
        console.error('[CREATE-NOTE-FEHLER]', err);
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/records/:recordId/notes/:noteId', authenticateToken, async (req, res) => {
    try {
        const updatedNote = await aktenRepo.updateNote(req.params.noteId, req.body);
        res.json(updatedNote);
    } catch (err) {
        console.error('[UPDATE-NOTE-FEHLER]', err);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/records/:recordId/notes/:noteId', authenticateToken, async (req, res) => {
    try {
        await aktenRepo.deleteNote(req.params.noteId);
        res.status(204).send();
    } catch (err) {
        console.error('[DELETE-NOTE-FEHLER]', err);
        res.status(500).json({ message: err.message });
    }
});


// Datei-Upload-Route
app.post('/api/records/:recordId/documents', authenticateToken, upload.array('documents'), async (req, res) => {
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
        const newDocuments = [];

        for (const file of files) {
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

                // Physisches Speichern der Datei im korrekten Verzeichnis
                const aktenzeichen = record.aktenzeichen;
                const targetDir = path.join('/app/documents', aktenzeichen);
                
                // Sicherstellen, dass das Verzeichnis existiert
                await fs.mkdir(targetDir, { recursive: true });
                
                // Datei speichern
                const targetPath = path.join(targetDir, file.originalname);
                await fs.writeFile(targetPath, file.buffer);
                console.log('[UPLOAD DATEI GESPEICHERT]', { path: targetPath });
                
                // Dokument in DB eentragen (mit relativem Pfad)
                const relativePath = path.join(aktenzeichen, file.originalname);
                const doc = await aktenRepo.addDocument(
                    recordId,
                    file.originalname,
                    relativePath,
                    file.mimetype,
                    file.size
                );
                
                newDocuments.push(doc);
            } catch (e) {
                console.error('[UPLOAD KRITISCH] Fehler beim Speichern der Datei', file?.originalname, e);
                throw e;
            }
        }

        console.log('[UPLOAD DB]', { recordId, documentsToStore: newDocuments.length });

        // Antwort senden
        console.log('[UPLOAD END]', { recordId, totalDocuments: newDocuments.length });
        res.status(201).json(newDocuments);
    } catch (error) {
        console.error('Fehler beim Datei-Upload:', error);
        if (error && error.status === 400) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Interner Serverfehler beim Upload' });
    }
});

// Route zum Abrufen eines Dokuments
app.get('/api/documents/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        const document = await aktenRepo.getDocumentById(documentId);
        
        if (!document) {
            return res.status(404).json({ error: 'Dokument nicht gefunden' });
        }
        
        // Datei vom Dateisystem laden und streamen
        const filePath = path.join('/app/documents', document.pfad);
        console.log('[DOWNLOAD FILE]', { path: filePath });
        
        // Überprüfen, ob die Datei existiert
        try {
            await fs.access(filePath);
            
            // Datei streamen
            res.setHeader('Content-Disposition', `inline; filename="${document.dateiname}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            
            fileStream.on('error', (err) => {
                console.error('Fehler beim Streamen der Datei:', err);
                res.status(500).json({ error: 'Fehler beim Laden der Datei' });
            });
            
            fileStream.on('end', () => {
                console.log('[DOWNLOAD COMPLETE]', { documentId });
            });
        } catch (err) {
            console.error('Datei nicht gefunden:', filePath);
            res.status(404).json({ error: 'Datei nicht gefunden' });
        }
    } catch (error) {
        console.error('Fehler beim Abrufen des Dokuments:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// Route zum Löschen eines Dokuments
app.delete('/api/documents/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        const deletedCount = await aktenRepo.removeDocument(documentId);
        
        if (deletedCount === 0) {
            return res.status(404).json({ error: 'Dokument nicht gefunden' });
        }
        
        res.status(204).send();
    } catch (error) {
        console.error('Fehler beim Löschen des Dokuments:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
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