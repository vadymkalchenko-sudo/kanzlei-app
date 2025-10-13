require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is not defined. Please set it in your .env file');
            return res.status(500).json({ error: 'Internal server error: JWT secret not configured.' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            jwtSecret,
            { expiresIn: '1h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
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
// createCrudEndpoints(mandantenRouter, 'mandanten', ['kontakte', 'historie']); // Replaced with specific handlers
app.use('/api/mandanten', mandantenRouter);

const mandantenRepo = require('./repositories/mandantenRepo');

// GET all Mandanten
mandantenRouter.get('/', async (req, res) => {
    try {
        const mandanten = await mandantenRepo.findAll();
        res.json(mandanten);
    } catch (err) {
        console.error('Fehler beim Lesen der Mandanten:', err);
        res.status(500).json({ error: 'Fehler beim Lesen der Mandanten' });
    }
});

// GET Mandant by ID
mandantenRouter.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const mandant = await mandantenRepo.findById(id);
        if (!mandant) {
            return res.status(404).json({ error: 'Mandant nicht gefunden' });
        }
        res.json(mandant);
    } catch (err) {
        console.error('Fehler beim Lesen von Mandant:', err);
        res.status(500).json({ error: 'Fehler beim Lesen von Mandant' });
    }
});

// POST new Mandant
mandantenRouter.post('/', async (req, res) => {
    try {
        const newMandant = await mandantenRepo.create(req.body);
        res.status(201).json(newMandant);
    } catch (err) {
        console.error('Fehler beim Erstellen von Mandant:', err);
        res.status(500).json({ error: 'Fehler beim Erstellen von Mandant', details: err.message });
    }
});

// PUT update Mandant
mandantenRouter.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedMandant = await mandantenRepo.update(id, req.body);
        if (!updatedMandant) {
            return res.status(404).json({ error: 'Mandant nicht gefunden' });
        }
        res.json(updatedMandant);
    } catch (err) {
        console.error('Fehler beim Aktualisieren von Mandant:', err);
        res.status(500).json({ error: 'Fehler beim Aktualisieren von Mandant' });
    }
});

// DELETE Mandant
mandantenRouter.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const rowCount = await mandantenRepo.remove(id);
        if (rowCount === 0) {
            return res.status(404).json({ error: 'Mandant nicht gefunden' });
        }
        res.status(204).send();
    } catch (err) {
        console.error('Fehler beim Löschen von Mandant:', err);
        res.status(500).json({ error: 'Fehler beim Löschen von Mandant' });
    }
});


const dritteRouter = express.Router();
app.use('/api/dritte-beteiligte', dritteRouter);

const gegnerRepo = require('./repositories/gegnerRepo');

// GET all Gegner
dritteRouter.get('/', async (req, res) => {
    try {
        const gegner = await gegnerRepo.findAll();
        res.json(gegner);
    } catch (err) {
        console.error('Fehler beim Lesen der Gegner:', err);
        res.status(500).json({ error: 'Fehler beim Lesen der Gegner' });
    }
});

// GET Gegner by ID
dritteRouter.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const gegner = await gegnerRepo.findById(id);
        if (!gegner) {
            return res.status(404).json({ error: 'Gegner nicht gefunden' });
        }
        res.json(gegner);
    } catch (err) {
        console.error('Fehler beim Lesen von Gegner:', err);
        res.status(500).json({ error: 'Fehler beim Lesen von Gegner' });
    }
});

// POST new Gegner
dritteRouter.post('/', async (req, res) => {
    try {
        const newGegner = await gegnerRepo.create(req.body);
        res.status(201).json(newGegner);
    } catch (err) {
        console.error('Fehler beim Erstellen von Gegner:', err);
        res.status(500).json({ error: 'Fehler beim Erstellen von Gegner', details: err.message });
    }
});

// PUT update Gegner
dritteRouter.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedGegner = await gegnerRepo.update(id, req.body);
        if (!updatedGegner) {
            return res.status(404).json({ error: 'Gegner nicht gefunden' });
        }
        res.json(updatedGegner);
    } catch (err) {
        console.error('Fehler beim Aktualisieren von Gegner:', err);
        res.status(500).json({ error: 'Fehler beim Aktualisieren von Gegner' });
    }
});

// DELETE Gegner
dritteRouter.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const rowCount = await gegnerRepo.remove(id);
        if (rowCount === 0) {
            return res.status(404).json({ error: 'Gegner nicht gefunden' });
        }
        res.status(204).send();
    } catch (err) {
        console.error('Fehler beim Löschen von Gegner:', err);
        res.status(500).json({ error: 'Fehler beim Löschen von Gegner' });
    }
});


const initializeDatabase = async () => {
    let client;
    try {
        client = await pool.connect();

        // Harmonized Schemas
        await client.query(`
            CREATE TABLE IF NOT EXISTS mandanten (
                id TEXT PRIMARY KEY,
                anrede TEXT,
                name TEXT,
                kontakte JSONB,
                historie JSONB
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS gegner (
                id TEXT PRIMARY KEY,
                anrede TEXT,
                name TEXT,
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

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL
            );
        `);
        console.log('Database tables are ready.');

        // Schema Migration Logic
        const mandantenCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'mandanten'");
        const mandantenColNames = mandantenCols.rows.map(r => r.column_name);
        if (mandantenColNames.includes('strasse')) await client.query('ALTER TABLE mandanten RENAME COLUMN strasse TO street;');
        if (mandantenColNames.includes('hausnummer')) await client.query('ALTER TABLE mandanten RENAME COLUMN hausnummer TO street_number;');
        if (mandantenColNames.includes('plz')) await client.query('ALTER TABLE mandanten RENAME COLUMN plz TO zip_code;');
        if (mandantenColNames.includes('ort')) await client.query('ALTER TABLE mandanten RENAME COLUMN ort TO city;');
        if (mandantenColNames.includes('mailadresse')) await client.query('ALTER TABLE mandanten RENAME COLUMN mailadresse TO email;');
        if (mandantenColNames.includes('telefonnummer')) await client.query('ALTER TABLE mandanten RENAME COLUMN telefonnummer TO phone;');

        await client.query('ALTER TABLE mandanten ADD COLUMN IF NOT EXISTS kontakte JSONB;');
        await client.query('ALTER TABLE gegner ADD COLUMN IF NOT EXISTS kontakte JSONB;');

        const columnsToDropMandanten = ['street', 'street_number', 'zip_code', 'city', 'email', 'phone'];
        for (const col of columnsToDropMandanten) {
            if (mandantenColNames.includes(col)) {
                 await client.query(`ALTER TABLE mandanten DROP COLUMN ${col};`);
            }
        }

        const gegnerCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'gegner'");
        const gegnerColNames = gegnerCols.rows.map(r => r.column_name);
        const columnsToDropGegner = ['street', 'zipCode', 'city', 'email'];
         for (const col of columnsToDropGegner) {
            if (gegnerColNames.includes(col)) {
                 await client.query(`ALTER TABLE gegner DROP COLUMN ${col};`);
            }
        }

        console.log('Schema migration for existing tables completed.');

        // Create initial admin user
        const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
        if (adminPassword) {
            const result = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
            if (result.rows.length === 0) {
                const hashedPassword = await bcrypt.hash(adminPassword, 10);
                const userId = crypto.randomUUID();
                await client.query(
                    'INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, $4)',
                    [userId, 'admin', hashedPassword, 'admin']
                );
                console.log('Initial admin user created.');
            }
        } else {
            console.log('ADMIN_INITIAL_PASSWORD not set, skipping admin creation.');
        }

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