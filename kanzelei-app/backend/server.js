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
    user: 'kanzlei_user',
    host: '192.168.178.82',
    database: 'kanzlei_db',
    password: 'IHR_SICHERES_PASSWORT',
    port: 5432,
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

const createCrudEndpoints = (router, tableName) => {
    // POST create
    router.post('/', async (req, res) => {
        try {
            const newItem = req.body;
            if (!newItem.id) {
                newItem.id = crypto.randomUUID();
            }

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

            const columns = Object.keys(itemFromRequest).map((key, i) => `"${key}" = $${i + 2}`).join(', ');
            const values = [id, ...Object.values(itemFromRequest)];

            const query = `UPDATE ${tableName} SET ${columns} WHERE id = $1 RETURNING *`;
            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: `${tableName} nicht gefunden` });
            }

            console.log(`${tableName} erfolgreich aktualisiert:`, result.rows[0]);
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
createCrudEndpoints(aktenRouter, 'akten');
app.use('/api/records', aktenRouter);

const mandantenRouter = express.Router();
createCrudEndpoints(mandantenRouter, 'mandanten');
app.use('/api/mandanten', mandantenRouter);

const dritteRouter = express.Router();
createCrudEndpoints(dritteRouter, 'gegner');
app.use('/api/dritte-beteiligte', dritteRouter);

const initializeDatabase = async () => {
    let client;
    try {
        client = await pool.connect();

        await client.query(`
            CREATE TABLE IF NOT EXISTS mandanten (
                id TEXT PRIMARY KEY, name TEXT, street TEXT, "zipCode" TEXT, city TEXT, email TEXT
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS gegner (
                id TEXT PRIMARY KEY, name TEXT, street TEXT, "zipCode" TEXT, city TEXT, email TEXT
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS akten (
                id TEXT PRIMARY KEY, "caseNumber" TEXT, "mandantId" TEXT, "gegnerId" TEXT, dokumente JSONB, aufgaben JSONB, notizen JSONB, fristen JSONB
            );
        `);
        console.log('Database tables are ready.');

        const res = await client.query('SELECT COUNT(*) FROM mandanten');
        if (res.rows[0].count > 0) {
            console.log('Database already contains data.');
            return;
        }

        console.log('Database is empty, seeding initial data...');
        const initialDataPath = path.join(__dirname, 'initial-data');
        const readFile = (fileName) => fs.readFile(path.join(initialDataPath, fileName), 'utf-8').then(JSON.parse);

        const mandant1 = await readFile('mandant1.json');
        await client.query('INSERT INTO mandanten (id, name, street, "zipCode", city, email) VALUES ($1, $2, $3, $4, $5, $6)', [mandant1.id, mandant1.name, mandant1.street, mandant1.zipCode, mandant1.city, mandant1.email]);

        const gegner1 = await readFile('gegner1.json');
        await client.query('INSERT INTO gegner (id, name, street, "zipCode", city, email) VALUES ($1, $2, $3, $4, $5, $6)', [gegner1.id, gegner1.name, gegner1.street, gegner1.zipCode, gegner1.city, gegner1.email]);

        const akten = await Promise.all([readFile('akte1.json'), readFile('akte2.json'), readFile('akte3.json')]);
        for (const akte of akten) {
            await client.query('INSERT INTO akten (id, "caseNumber", "mandantId", "gegnerId", dokumente) VALUES ($1, $2, $3, $4, $5)', [akte.id, akte.caseNumber, akte.mandantId, akte.gegnerId, JSON.stringify(akte.dokumente)]);
        }

        console.log('Initial data successfully seeded.');

    } catch (err) {
        console.error('Could not initialize database:', err.message);
        console.log('This is expected if the external database is not running. The application will start, but API calls will fail.');
    } finally {
        if (client) client.release();
    }
};

initializeDatabase().then(() => {
    app.listen(port, () => {
        console.log(`API-Server läuft auf http://localhost:${port}`);
    });
});