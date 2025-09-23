require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = 3001;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

const basePath = process.env.STORAGE_PATH || path.join(__dirname, 'kanzlei-data');
console.log('Anwendung versucht zu schreiben in:', basePath);

const initializeStorage = (req, res, next) => {
    const directories = ['records', 'mandanten', 'dritte-beteiligte'];
    directories.forEach(dir => {
        const fullPath = path.join(basePath, dir);
        try {
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                console.log(`Ordner '${fullPath}' wurde erstellt.`);
            }
        } catch (error) {
            console.error(`Fehler beim Erstellen des Ordners '${fullPath}':`, error);
        }
    });
    next();
};

app.use(initializeStorage);

// Generische CRUD-Fabrik für alle Entitäten (Records, Mandanten, Dritte Beteiligte)
const createCrudEndpoints = (router, storageDir, entityName) => {
    // POST create
    router.post('/', (req, res) => {
        try {
            const newItem = req.body;
            newItem.id = crypto.randomUUID();
            const filePath = path.join(storageDir, `${newItem.id}.json`);
            fs.writeFileSync(filePath, JSON.stringify(newItem, null, 2), 'utf-8');
            console.log(`${entityName} erfolgreich erstellt: ${filePath}`);
            res.status(201).json(newItem);
        } catch (err) {
            console.error(`Fehler beim Erstellen von ${entityName}:`, err);
            res.status(500).json({ error: `Fehler beim Erstellen von ${entityName}`, details: err.message });
        }
    });

    // GET all
    router.get('/', (req, res) => {
        try {
            const files = fs.readdirSync(storageDir).filter(file => file.endsWith('.json'));
            const items = files.map(file => {
                const filePath = path.join(storageDir, file);
                return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            });
            res.json(items);
        } catch (err) {
            console.error(`Fehler beim Lesen der ${entityName}:`, err);
            res.status(500).json({ error: `Fehler beim Lesen der ${entityName}` });
        }
    });

    // ... weitere Endpunkte wie PUT und DELETE können hier hinzugefügt werden
};

// Erstelle Router für jeden Entitätstyp
const recordsRouter = express.Router();
createCrudEndpoints(recordsRouter, path.join(basePath, 'records'), 'Akte');
app.use('/api/records', recordsRouter);

const mandantenRouter = express.Router();
createCrudEndpoints(mandantenRouter, path.join(basePath, 'mandanten'), 'Mandant');
app.use('/api/mandanten', mandantenRouter);

const dritteRouter = express.Router();
createCrudEndpoints(dritteRouter, path.join(basePath, 'dritte-beteiligte'), 'Dritter Beteiligter');
app.use('/api/dritte-beteiligte', dritteRouter);

app.listen(port, () => {
    console.log(`API-Server läuft auf http://localhost:${port}`);
});