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

// Sicherstellen, dass das Upload-Verzeichnis existiert
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer-Konfiguration für Datei-Uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

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
            const updatedItem = await repo.update(req.params.id, req.body);
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
    try {
        const record = await aktenRepo.findById(recordId);
        if (!record) {
            return res.status(404).json({ error: 'Akte nicht gefunden' });
        }

        const newDocuments = req.files.map(file => ({
            id: crypto.randomUUID(),
            name: file.originalname,
            path: file.path,
            mimetype: file.mimetype,
            size: file.size,
            createdAt: new Date().toISOString(),
        }));

        const currentDocuments = record.dokumente || [];
        const updatedDocuments = [...currentDocuments, ...newDocuments];

        const updatedRecord = await aktenRepo.update(recordId, { ...record, dokumente: updatedDocuments });

        res.status(201).json(updatedRecord);
    } catch (error) {
        console.error('Fehler beim Datei-Upload:', error);
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