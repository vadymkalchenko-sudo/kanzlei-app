require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const app = express();
const port = 3001;

// PostgreSQL connection details
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    connectionTimeoutMillis: 5000, // Add a timeout to avoid long hangs
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Temporary login bypass
app.post('/api/login', (req, res) => {
    res.json({
        success: true,
        user: {
            name: 'Test User',
            roles: ['admin']
        }
    });
});

const createCrudEndpoints = (router, tableName, jsonbColumns = []) => {
    // POST create
    router.post('/', async (req, res) => {
        try {
            const newItem = req.body;
            if (!newItem.id) {
                newItem.id = crypto.randomUUID();
            }

            // Stringify JSONB columns before insert
            jsonbColumns.forEach(key => {
                if (newItem[key] && typeof newItem[key] === 'object') {
                    newItem[key] = JSON.stringify(newItem[key]);
                }
            });

            const columns = Object.keys(newItem).map(key => `"${key}"`).join(', ');
            const values = Object.values(newItem);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

            const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
            const result = await pool.query(query, values);


            console.log(`${tableName} erfolgreich erstellt:`, result.rows[0]);
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error(`Fehler beim Erstellen von ${tableName}:`, err);
            res.status(500).json({ error: `Fehler beim Erstellen von ${tableName}`, details: err.message });
        }
    });

    // GET all
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query(`SELECT * FROM ${tableName}`);
            res.json(result.rows);
        } catch (err) {
            console.error(`Fehler beim Lesen der ${tableName}:`, err);
            res.status(500).json({ error: `Fehler beim Lesen der ${tableName}` });
        }
    });

    // GET by id
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: `${tableName} nicht gefunden` });
            }
            res.json(result.rows[0]);
        } catch (err) {
            console.error(`Fehler beim Lesen von ${tableName}:`, err);
            res.status(500).json({ error: `Fehler beim Lesen von ${tableName}` });
        }
    });

    // PUT update
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const itemFromRequest = req.body;
            delete itemFromRequest.id;

            // Stringify JSONB columns before update
            jsonbColumns.forEach(key => {
                if (itemFromRequest[key] && typeof itemFromRequest[key] === 'object') {
                    itemFromRequest[key] = JSON.stringify(itemFromRequest[key]);
                }
            });

            const columns = Object.keys(itemFromRequest).map((key, i) => `"${key}" = $${i + 2}`).join(', ');
            const values = [id, ...Object.values(itemFromRequest)];

            const query = `UPDATE ${tableName} SET ${columns} WHERE id = $1 RETURNING *`;
            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: `${tableName} nicht gefunden` });
            }

            const updatedItem = result.rows[0];

            console.log(`${tableName} erfolgreich aktualisiert:`, updatedItem);
            res.json(result.rows[0]);
        } catch (err) {
            console.error(`Fehler beim Aktualisieren von ${tableName}:`, err);
            res.status(500).json({ error: `Fehler beim Aktualisieren von ${tableName}` });
        }
    });

    // DELETE
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;


            const result = await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
            if (result.rowCount === 0) {
                return res.status(404).json({ error: `${tableName} nicht gefunden` });
            }
            console.log(`${tableName} erfolgreich gelöscht: id ${id}`);
            res.status(204).send();
        } catch (err) {
            console.error(`Fehler beim Löschen von ${tableName}:`, err);
            res.status(500).json({ error: `Fehler beim Löschen von ${tableName}` });
        }
    });
};

// Erstelle Router für jeden Entitätstyp
const aktenRouter = express.Router();
createCrudEndpoints(aktenRouter, 'akten', ['dokumente', 'aufgaben', 'notizen', 'fristen']);
app.use('/api/records', aktenRouter);

const mandantenRouter = express.Router();
createCrudEndpoints(mandantenRouter, 'mandanten', ['kontakte', 'historie']);
app.use('/api/mandanten', mandantenRouter);

const dritteRouter = express.Router();
createCrudEndpoints(dritteRouter, 'gegner', ['kontakte', 'historie']);
app.use('/api/dritte-beteiligte', dritteRouter);

// Überschreibe die Standard-Endpunkte für Akten mit spezifischer Logik
aktenRouter.post('/', async (req, res) => {
    try {
        const newItem = { ...req.body, id: req.body.id || crypto.randomUUID() };
        const jsonbColumns = ['dokumente', 'aufgaben', 'notizen', 'fristen'];
        jsonbColumns.forEach(key => {
            if (newItem[key] && typeof newItem[key] === 'object') {
                newItem[key] = JSON.stringify(newItem[key]);
            }
        });

        const columns = Object.keys(newItem).map(key => `"${key}"`).join(', ');
        const values = Object.values(newItem);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO akten (${columns}) VALUES (${placeholders}) RETURNING *`;

        const result = await pool.query(query, values);
        const newCase = result.rows[0];

        // Physischen Ordner erstellen
        const caseDirectory = path.join(__dirname, 'documents', newCase.id);
        await fs.mkdir(caseDirectory, { recursive: true });
        console.log(`Verzeichnis für Akte erstellt: ${caseDirectory}`);

        res.status(201).json(newCase);
    } catch (err) {
        console.error(`Fehler beim Erstellen der Akte:`, err);
        // Spezifische Fehlerbehandlung für die Verzeichniserstellung
        if (err.code === 'EEXIST') {
            res.status(500).json({ error: 'Fehler beim Erstellen des Aktenverzeichnisses: Verzeichnis existiert bereits.' });
        } else {
            res.status(500).json({ error: 'Fehler beim Erstellen der Akte', details: err.message });
        }
    }
});

aktenRouter.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const itemFromRequest = { ...req.body };
        delete itemFromRequest.id;

        const jsonbColumns = ['dokumente', 'aufgaben', 'notizen', 'fristen'];
        jsonbColumns.forEach(key => {
            if (itemFromRequest[key] && typeof itemFromRequest[key] === 'object') {
                itemFromRequest[key] = JSON.stringify(itemFromRequest[key]);
            }
        });

        const columns = Object.keys(itemFromRequest).map((key, i) => `"${key}" = $${i + 2}`).join(', ');
        const values = [id, ...Object.values(itemFromRequest)];
        const query = `UPDATE akten SET ${columns} WHERE id = $1 RETURNING *`;

        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Akte nicht gefunden' });
        }
        const updatedItem = result.rows[0];

        // Archivierungslogik
        if (itemFromRequest.status === 'geschlossen' && updatedItem.mandantId) {
            const mandantRes = await pool.query('SELECT * FROM mandanten WHERE id = $1', [updatedItem.mandantId]);
            if (mandantRes.rows.length > 0) {
                const archivePath = path.join(__dirname, 'documents', updatedItem.id, 'mandant_archiv.json');
                await fs.writeFile(archivePath, JSON.stringify(mandantRes.rows[0], null, 2));
                console.log(`Mandant-Snapshot für Akte ${updatedItem.id} archiviert.`);
            }
        }

        res.json(updatedItem);
    } catch (err) {
        console.error(`Fehler beim Aktualisieren der Akte:`, err);
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Akte', details: err.message });
    }
});

aktenRouter.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Zuerst den Datenbankeintrag löschen, um bei einem Fehler hier nicht den Ordner zu löschen
        const result = await pool.query(`DELETE FROM akten WHERE id = $1 RETURNING *`, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Akte nicht gefunden' });
        }

        // Physischen Ordner löschen
        const caseDirectory = path.join(__dirname, 'documents', id);
        try {
            await fs.rm(caseDirectory, { recursive: true, force: true });
            console.log(`Verzeichnis für Akte gelöscht: ${caseDirectory}`);
        } catch (dirError) {
            // Wenn das Löschen des Ordners fehlschlägt, ist das ein sekundärer Fehler.
            // Der Haupt-Request war erfolgreich. Wir loggen den Fehler für die spätere Überprüfung.
            console.error(`Konnte das Verzeichnis für die gelöschte Akte ${id} nicht entfernen:`, dirError);
        }

        console.log(`Akte erfolgreich gelöscht: id ${id}`);
        res.status(204).send();
    } catch (err) {
        console.error(`Fehler beim Löschen der Akte:`, err);
        res.status(500).json({ error: 'Fehler beim Löschen der Akte', details: err.message });
    }
});

const initializeDatabase = async () => {
    let client;
    try {
        client = await pool.connect();

        await client.query(`
            CREATE TABLE IF NOT EXISTS mandanten (
                id TEXT PRIMARY KEY,
                anrede TEXT,
                name TEXT,
                strasse TEXT,
                plz TEXT,
                ort TEXT,
                mailadresse TEXT,
                telefonnummer TEXT,
                kontakte JSONB,
                historie JSONB
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS gegner (
                id TEXT PRIMARY KEY,
                anrede TEXT,
                name TEXT,
                street TEXT,
                "zipCode" TEXT,
                city TEXT,
                email TEXT,
                kontakte JSONB,
                historie JSONB
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS akten (
                id TEXT PRIMARY KEY,
                "caseNumber" TEXT,
                "mandantId" TEXT,
                "gegnerId" TEXT,
                betreff TEXT,
                status TEXT,
                kategorie TEXT,
                "responsiblePerson" TEXT,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                dokumente JSONB,
                aufgaben JSONB,
                notizen JSONB,
                fristen JSONB
            );
        `);
        console.log('Database tables are ready.');

        // Ensure backward compatibility by adding missing columns to existing tables
        await client.query('ALTER TABLE gegner ADD COLUMN IF NOT EXISTS kontakte JSONB;');
        await client.query('ALTER TABLE gegner ADD COLUMN IF NOT EXISTS historie JSONB;');
        console.log('Schema migration for existing tables completed.');

    } catch (err) {
        console.error('Could not initialize database:', err.message);
        console.log('This is expected if the external database is not running. The application will start, but API calls will fail.');
    } finally {
        if (client) client.release();
    }
};

const { testSchreibzugriff } = require('./repositories/mandantenRepo');

initializeDatabase().then(() => {
    app.listen(port, () => {
        console.log(`API-Server läuft auf http://localhost:${port}`);
        // Führe den Test-Schreibzugriff nach dem Serverstart aus
        testSchreibzugriff(pool);
    });
});