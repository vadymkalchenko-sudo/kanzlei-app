const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = 3001;

app.use(cors()); // Allow all origins
app.use(express.json({ limit: '50mb' }));

const basePath = '/app/kanzlei-data';
console.log('Application will write to:', basePath);

const initializeData = () => {
    const initialDataPath = path.join(__dirname, 'initial-data');
    const directories = ['records', 'mandanten', 'dritte-beteiligte'];

    directories.forEach(dir => {
        const fullPath = path.join(basePath, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
    });

    const copyInitialFile = (sourceFile, destFile) => {
        const sourcePath = path.join(initialDataPath, sourceFile);
        const destPath = path.join(basePath, destFile);
        if (!fs.existsSync(destPath) && fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
        }
    }

    copyInitialFile('mandant1.json', path.join('mandanten', 'mandant-1.json'));
    copyInitialFile('gegner1.json', path.join('dritte-beteiligte', 'gegner-1.json'));
    copyInitialFile('akte1.json', path.join('records', 'akte-1.json'));
    copyInitialFile('akte2.json', path.join('records', 'akte-2.json'));
    copyInitialFile('akte3.json', path.join('records', 'akte-3.json'));

    console.log('Initial data successfully loaded into the file system.');
};

initializeData();

// Generische CRUD-Fabrik für alle Entitäten (Records, Mandanten, Dritte Beteiligte)
const createCrudEndpoints = (router, storageDir, entityName) => {
    // POST create
    router.post('/', (req, res) => {
        try {
            const newItem = req.body;
            if (!newItem.id) {
                newItem.id = crypto.randomUUID();
            }
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

    // GET by id
    router.get('/:id', (req, res) => {
        try {
            const filePath = path.join(storageDir, `${req.params.id}.json`);
            if (fs.existsSync(filePath)) {
                const item = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                res.json(item);
            } else {
                res.status(404).json({ error: `${entityName} nicht gefunden` });
            }
        } catch (err) {
            console.error(`Fehler beim Lesen von ${entityName}:`, err);
            res.status(500).json({ error: `Fehler beim Lesen von ${entityName}` });
        }
    });

    // PUT update
    router.put('/:id', (req, res) => {
        try {
            const filePath = path.join(storageDir, `${req.params.id}.json`);
            if (fs.existsSync(filePath)) {
                const updatedItem = req.body;
                updatedItem.id = req.params.id;
                fs.writeFileSync(filePath, JSON.stringify(updatedItem, null, 2), 'utf-8');
                console.log(`${entityName} erfolgreich aktualisiert: ${filePath}`);
                res.json(updatedItem);
            } else {
                res.status(404).json({ error: `${entityName} nicht gefunden` });
            }
        } catch (err) {
            console.error(`Fehler beim Aktualisieren von ${entityName}:`, err);
            res.status(500).json({ error: `Fehler beim Aktualisieren von ${entityName}` });
        }
    });

    // DELETE
    router.delete('/:id', (req, res) => {
        try {
            const filePath = path.join(storageDir, `${req.params.id}.json`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`${entityName} erfolgreich gelöscht: ${filePath}`);
                res.status(204).send();
            } else {
                res.status(404).json({ error: `${entityName} nicht gefunden` });
            }
        } catch (err) {
            console.error(`Fehler beim Löschen von ${entityName}:`, err);
            res.status(500).json({ error: `Fehler beim Löschen von ${entityName}` });
        }
    });
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
