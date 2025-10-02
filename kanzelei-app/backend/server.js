const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = 3001;

app.use(cors()); // Allow all origins
app.use(express.json({ limit: '50mb' }));

const basePath = process.env.DATA_PATH || '/app/kanzlei-data';
console.log('Application will write to:', basePath);

const initializeData = () => {
    const initialDataPath = path.join(__dirname, 'initial-data');
    const directories = [
        'akten',
        'stammdaten/mandanten',
        'stammdaten/dritteBeteiligte'
    ];

    directories.forEach(dir => {
        const fullPath = path.join(basePath, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
    });

    const copyInitialFile = (sourceFile, destDir, destFile) => {
        const sourcePath = path.join(initialDataPath, sourceFile);
        const destPath = path.join(basePath, destDir, destFile);
        if (!fs.existsSync(destPath) && fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
        }
    }

    copyInitialFile('mandant1.json', 'stammdaten/mandanten', 'mandant-1.json');
    copyInitialFile('gegner1.json', 'stammdaten/dritteBeteiligte', 'gegner-1.json');
    copyInitialFile('akte1.json', 'akten', 'akte-1.json');
    copyInitialFile('akte2.json', 'akten', 'akte-2.json');
    copyInitialFile('akte3.json', 'akten', 'akte-3.json');

    console.log('Initial data successfully loaded into the file system.');
};

initializeData();

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

// Generische CRUD-Fabrik für alle Entitäten
const createCrudEndpoints = (router, storageDir, entityName) => {
    const fsp = require('fs').promises;

    // POST create
    router.post('/', async (req, res) => {
        try {
            await fsp.mkdir(storageDir, { recursive: true });
            const newItem = req.body;
            if (!newItem.id) {
                newItem.id = crypto.randomUUID();
            }
            const filePath = path.join(storageDir, `${newItem.id}.json`);
            await fsp.writeFile(filePath, JSON.stringify(newItem, null, 2), 'utf-8');
            console.log(`${entityName} erfolgreich erstellt: ${filePath}`);
            res.status(201).json(newItem);
        } catch (err) {
            console.error(`Fehler beim Erstellen von ${entityName}:`, err);
            res.status(500).json({ error: `Fehler beim Erstellen von ${entityName}`, details: err.message });
        }
    });

    // GET all
    router.get('/', async (req, res) => {
        try {
            const files = await fsp.readdir(storageDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            const items = await Promise.all(jsonFiles.map(async (file) => {
                const filePath = path.join(storageDir, file);
                const fileContent = await fsp.readFile(filePath, 'utf-8');
                return JSON.parse(fileContent);
            }));
            res.json(items);
        } catch (err) {
            if (err.code === 'ENOENT') {
                // If directory doesn't exist, return an empty array.
                return res.json([]);
            }
            console.error(`Fehler beim Lesen der ${entityName}:`, err);
            res.status(500).json({ error: `Fehler beim Lesen der ${entityName}` });
        }
    });

    // GET by id
    router.get('/:id', async (req, res) => {
        try {
            const filePath = path.join(storageDir, `${req.params.id}.json`);
            const fileContent = await fsp.readFile(filePath, 'utf-8');
            res.json(JSON.parse(fileContent));
        } catch (err) {
            if (err.code === 'ENOENT') {
                res.status(404).json({ error: `${entityName} nicht gefunden` });
            } else {
                console.error(`Fehler beim Lesen von ${entityName}:`, err);
                res.status(500).json({ error: `Fehler beim Lesen von ${entityName}` });
            }
        }
    });

    // PUT update
    router.put('/:id', async (req, res) => {
        try {
            const filePath = path.join(storageDir, `${req.params.id}.json`);
            await fsp.access(filePath); // Check if file exists
            const updatedItem = req.body;
            updatedItem.id = req.params.id;
            await fsp.writeFile(filePath, JSON.stringify(updatedItem, null, 2), 'utf-8');
            console.log(`${entityName} erfolgreich aktualisiert: ${filePath}`);
            res.json(updatedItem);
        } catch (err) {
            if (err.code === 'ENOENT') {
                res.status(404).json({ error: `${entityName} nicht gefunden` });
            } else {
                console.error(`Fehler beim Aktualisieren von ${entityName}:`, err);
                res.status(500).json({ error: `Fehler beim Aktualisieren von ${entityName}` });
            }
        }
    });

    // DELETE
    router.delete('/:id', async (req, res) => {
        try {
            const filePath = path.join(storageDir, `${req.params.id}.json`);
            await fsp.unlink(filePath);
            console.log(`${entityName} erfolgreich gelöscht: ${filePath}`);
            res.status(204).send();
        } catch (err) {
            if (err.code === 'ENOENT') {
                res.status(404).json({ error: `${entityName} nicht gefunden` });
            } else {
                console.error(`Fehler beim Löschen von ${entityName}:`, err);
                res.status(500).json({ error: `Fehler beim Löschen von ${entityName}` });
            }
        }
    });
};

// Erstelle Router für jeden Entitätstyp
const aktenRouter = express.Router();
createCrudEndpoints(aktenRouter, path.join(basePath, 'akten'), 'Akte');
app.use('/api/akten', aktenRouter);

const mandantenRouter = express.Router();
createCrudEndpoints(mandantenRouter, path.join(basePath, 'stammdaten/mandanten'), 'Mandant');
app.use('/api/stammdaten/mandanten', mandantenRouter);

const dritteRouter = express.Router();
createCrudEndpoints(dritteRouter, path.join(basePath, 'stammdaten/dritteBeteiligte'), 'Dritter Beteiligter');
app.use('/api/stammdaten/dritteBeteiligte', dritteRouter);

app.listen(port, () => {
    console.log(`API-Server läuft auf http://localhost:${port}`);
});
