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
        const initSqlPath = path.join(__dirname, '../init.sql');
        const initSql = fs.readFileSync(initSqlPath, 'utf-8');
        
        // Tabellen zwangsweise löschen für einen sauberen Start
        // Das Löschen der Tabellen wurde entfernt, um die Datenpersistenz gemäß DR-Fähigkeit zu gewährleisten.
        // await client.query('DROP TABLE IF EXISTS dokumente, akten, gegner, mandanten, users CASCADE;');
        // console.log('Alte Tabellen gelöscht.');

        // Führe die SQL-Befehle aus der Datei aus
        await client.query(initSql);
        console.log('Datenbankschema aus init.sql erfolgreich angewendet.');

        // Erstelle die 'users'-Tabelle separat, da sie nicht Teil der Anwendungsdaten-Persistenz ist
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) REFERENCES roles(name) DEFAULT 'admin' -- Standardmäßig 'admin' Rolle
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
    let token = authHeader && authHeader.split(' ')[1];

    if (!token && req.query.token) {
        token = req.query.token;
    }

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
        if (err) return res.sendStatus(403);

        try {
            // Benutzerdetails und Rollenname abrufen
            const userResult = await pool.query(
                'SELECT u.id, u.username, r.name AS role_name FROM users u JOIN roles r ON u.role = r.name WHERE u.id = $1',
                [user.userId]
            );
            if (userResult.rows.length === 0) {
                return res.sendStatus(403); // Benutzer nicht gefunden oder Rolle nicht zugeordnet
            }
            const fullUser = userResult.rows[0];

            // Berechtigungen für die Rolle abrufen
            const permissionsResult = await pool.query(
                `SELECT p.name FROM permissions p
                 JOIN role_permissions rp ON p.id = rp.permission_id
                 WHERE rp.role_id = (SELECT id FROM roles WHERE name = $1)`,
                [fullUser.role_name]
            );
            const permissions = permissionsResult.rows.map(row => row.name);

            req.user = {
                userId: fullUser.id,
                username: fullUser.username,
                role: fullUser.role_name,
                permissions: permissions
            };
            next();
        } catch (dbError) {
            console.error('Fehler beim Abrufen der Benutzerberechtigungen:', dbError);
            res.sendStatus(500);
        }
    });
};

// Autorisierungs-Middleware
const authorize = (requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions) {
            return res.sendStatus(401); // Nicht authentifiziert
        }

        const hasPermission = requiredPermissions.some(permission =>
            req.user.permissions.includes(permission)
        );

        if (hasPermission) {
            next();
        } else {
            res.sendStatus(403); // Keine Berechtigung
        }
    };
};

// Router anwenden (jetzt mit Authentifizierung und Autorisierung)
app.use('/api/records', authenticateToken, authorize(['akten:read']), createRouter(aktenRepo));
app.use('/api/mandanten', authenticateToken, authorize(['mandanten:read']), createRouter(mandantenRepo));
app.use('/api/dritte-beteiligte', authenticateToken, authorize(['gegner:read']), createRouter(gegnerRepo));


// --- Spezifische Routen für Notizen ---
app.post('/api/records/:recordId/notes', authenticateToken, authorize(['notes:create']), async (req, res) => {
    try {
        const newNote = await aktenRepo.addNote(req.params.recordId, req.body);
        res.status(201).json(newNote);
    } catch (err) {
        console.error('[CREATE-NOTE-FEHLER]', err);
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/records/:recordId/notes/:noteId', authenticateToken, authorize(['notes:update']), async (req, res) => {
    try {
        const updatedNote = await aktenRepo.updateNote(req.params.noteId, req.body);
        res.json(updatedNote);
    } catch (err) {
        console.error('[UPDATE-NOTE-FEHLER]', err);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/records/:recordId/notes/:noteId', authenticateToken, authorize(['notes:delete']), async (req, res) => {
    try {
        await aktenRepo.deleteNote(req.params.noteId);
        res.status(204).send();
    } catch (err) {
        console.error('[DELETE-NOTE-FEHLER]', err);
        res.status(500).json({ message: err.message });
    }
});

// Aggregations-Endpunkt für Akten
app.put('/api/records/:recordId/aggregate', authenticateToken, authorize(['akten:update']), async (req, res) => {
    try {
        const { recordId } = req.params;
        
        // Akte mit Dokumenten und Notizen abrufen
        const akte = await aktenRepo.findById(recordId);
        if (!akte) {
            return res.status(404).json({ error: 'Akte nicht gefunden' });
        }

        // Soll- und Haben-Beträge aggregieren
        let gesamt_forderung_soll = 0;
        let gesamt_zahlung_haben = 0;

        // Dokumente durchgehen
        if (akte.dokumente) {
            for (const doc of akte.dokumente) {
                const soll = parseFloat(doc.betrag_soll) || 0;
                const haben = parseFloat(doc.betrag_haben) || 0;
                gesamt_forderung_soll += soll;
                gesamt_zahlung_haben += haben;
            }
        }

        // Notizen durchgehen
        if (akte.notizen) {
            for (const note of akte.notizen) {
                const soll = parseFloat(note.betrag_soll) || 0;
                const haben = parseFloat(note.betrag_haben) || 0;
                gesamt_forderung_soll += soll;
                gesamt_zahlung_haben += haben;
            }
        }

        // Prüfen, ob Zahlungseingang vorhanden ist (Haben > 0)
        const hat_zahlungseingang = gesamt_zahlung_haben > 0;

        // Aggregierte Werte in der Akte aktualisieren
        const updatedAkte = await aktenRepo.update(recordId, {
            ...akte,
            metadata: {
                ...akte.metadata,
                gesamt_forderung_soll,
                gesamt_zahlung_haben,
                hat_zahlungseingang
            }
        });

        res.json(updatedAkte);
    } catch (error) {
        console.error('Fehler bei der Aggregation:', error);
        res.status(500).json({ error: 'Interner Serverfehler bei der Aggregation' });
    }
});


// Datei-Upload-Route
app.post('/api/records/:recordId/documents', authenticateToken, authorize(['documents:upload']), upload.array('documents'), async (req, res) => {
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
                await fs.promises.mkdir(targetDir, { recursive: true });
                
                // Datei speichern
                const targetPath = path.join(targetDir, file.originalname);
                await fs.promises.writeFile(targetPath, file.buffer);
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
app.get('/api/documents/:documentId', authenticateToken, authorize(['documents:read']), async (req, res) => {
    try {
        const { documentId } = req.params;
        const document = await aktenRepo.getDocumentById(documentId);
        
        if (!document) {
            return res.status(404).json({ error: 'Dokument nicht gefunden' });
        }
        
        // Datei als Base64-String senden, damit das Frontend sie verarbeiten kann
        const filePath = path.join('/app/documents', document.pfad);
        try {
            const fileBuffer = await fs.promises.readFile(filePath);
            const base64Data = fileBuffer.toString('base64');
            res.json({
                ...document,
                data_b64: base64Data,
            });
        } catch (err) {
            console.error('Datei nicht gefunden oder Lesefehler:', filePath, err);
            res.status(404).json({ error: 'Physische Datei nicht gefunden' });
        }
    } catch (error) {
        console.error('Fehler beim Abrufen des Dokuments:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// Route zum Löschen eines Dokuments
app.delete('/api/documents/:documentId', authenticateToken, authorize(['documents:delete']), async (req, res) => {
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
            console.log('Login-Fehler: Passwort stimmt nicht überein für Benutzer:', username);
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

// Benutzer-Management Routen (nur für admin oder power_user)
app.get('/api/users', authenticateToken, authorize(['users:manage']), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.username, r.name as role_name
            FROM users u
            JOIN roles r ON u.role = r.name
            ORDER BY u.username
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Fehler beim Abrufen der Benutzer:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

app.post('/api/users', authenticateToken, authorize(['users:manage']), async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ error: 'Benutzername, Passwort und Rolle sind erforderlich' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID();

        await pool.query(
            'INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, $4)',
            [userId, username, hashedPassword, role]
        );

        res.status(201).json({ id: userId, username, role });
    } catch (err) {
        console.error('Fehler beim Erstellen des Benutzers:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

app.put('/api/users/:id', authenticateToken, authorize(['users:manage']), async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, role } = req.body;

        let query = 'UPDATE users SET ';
        const values = [];
        let paramIndex = 1;

        if (username !== undefined) {
            query += `username = $${paramIndex++}, `;
            values.push(username);
        }

        if (password !== undefined) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += `password_hash = $${paramIndex++}, `;
            values.push(hashedPassword);
        }

        if (role !== undefined) {
            query += `role = $${paramIndex++}, `;
            values.push(role);
        }

        // Entferne das letzte ", " und füge WHERE hinzu
        query = query.slice(0, -2) + ' WHERE id = $' + paramIndex + ' RETURNING id, username, role';
        values.push(id);

        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        }

        res.json({ message: 'Benutzer erfolgreich aktualisiert' });
    } catch (err) {
        console.error('Fehler beim Aktualisieren des Benutzers:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

app.delete('/api/users/:id', authenticateToken, authorize(['users:manage']), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Admin-Benutzer darf nicht gelöscht werden
        const adminCheck = await pool.query('SELECT * FROM users WHERE id = $1 AND role = $2', [id, 'admin']);
        if (adminCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Admin-Benutzer kann nicht gelöscht werden' });
        }

        const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        }

        res.json({ message: 'Benutzer erfolgreich gelöscht' });
    } catch (err) {
        console.error('Fehler beim Löschen des Benutzers:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// Rollen-Management Routen (nur für admin)
app.get('/api/roles', authenticateToken, authorize(['roles:manage']), async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM roles ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error('Fehler beim Abrufen der Rollen:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

app.get('/api/permissions', authenticateToken, authorize(['roles:manage']), async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM permissions ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error('Fehler beim Abrufen der Berechtigungen:', err);
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