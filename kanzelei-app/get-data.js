require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = 3001;

// Base path for storage, configurable via environment variable
const basePath = process.env.STORAGE_PATH || path.join(__dirname, 'kanzlei-data');
const recordsPath = path.join(basePath, 'records');
const mandantenPath = path.join(basePath, 'mandanten');
const dritteBeteiligtePath = path.join(basePath, 'dritte-beteiligte');

// Ensure all storage directories exist
[basePath, recordsPath, mandantenPath, dritteBeteiligtePath].forEach(dir => {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (error) {
    console.error(`Error creating storage directory at ${dir}:`, error);
    process.exit(1);
  }
});
console.log(`Storage directories are ready at: ${basePath}`);

app.use(cors());
app.use(express.json());

// Generic CRUD factory
const createCrudEndpoints = (router, storageDir, entityName) => {
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
      console.error(`Error reading ${entityName}s:`, err);
      res.status(500).json({ error: `Fehler beim Lesen der ${entityName}` });
    }
  });

  // POST create
  router.post('/', (req, res) => {
    try {
      const newItem = req.body;
      newItem.id = crypto.randomUUID();
      const filePath = path.join(storageDir, `${newItem.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(newItem, null, 2), 'utf-8');
      res.status(201).json(newItem);
    } catch (err) {
      console.error(`Error creating ${entityName}:`, err);
      res.status(500).json({ error: `Fehler beim Erstellen von ${entityName}` });
    }
  });

  // PUT update
  router.put('/:id', (req, res) => {
    try {
      const { id } = req.params;
      const filePath = path.join(storageDir, `${id}.json`);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: `${entityName} nicht gefunden.` });
      }
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const updated = { ...existing, ...req.body };
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
      res.json(updated);
    } catch (err) {
      console.error(`Error updating ${entityName}:`, err);
      res.status(500).json({ error: `Fehler beim Aktualisieren von ${entityName}` });
    }
  });

  // DELETE
  router.delete('/:id', (req, res) => {
    try {
      const { id } = req.params;
      const filePath = path.join(storageDir, `${id}.json`);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: `${entityName} nicht gefunden.` });
      }
      fs.unlinkSync(filePath);
      res.status(200).json({ message: `${entityName} erfolgreich gelöscht` });
    } catch (err) {
      console.error(`Error deleting ${entityName}:`, err);
      res.status(500).json({ error: `Fehler beim Löschen von ${entityName}` });
    }
  });
};

// Create routers for each entity type
const recordsRouter = express.Router();
createCrudEndpoints(recordsRouter, recordsPath, 'Akte');
app.use('/api/records', recordsRouter);

const mandantenRouter = express.Router();
createCrudEndpoints(mandantenRouter, mandantenPath, 'Mandant');
app.use('/api/mandanten', mandantenRouter);

const dritteRouter = express.Router();
createCrudEndpoints(dritteRouter, dritteBeteiligtePath, 'Dritter Beteiligter');
app.use('/api/dritte-beteiligte', dritteRouter);

// --- Backup/Restore Endpoints ---

// GET /api/export - Export all data as a single JSON object
app.get('/api/export', (req, res) => {
  try {
    const exportData = {
      mandanten: [],
      records: [],
      dritteBeteiligte: [],
    };

    const readDataFromDir = (dirPath) => {
      const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.json'));
      return files.map(file => {
        const filePath = path.join(dirPath, file);
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      });
    };

    exportData.mandanten = readDataFromDir(mandantenPath);
    exportData.records = readDataFromDir(recordsPath);
    exportData.dritteBeteiligte = readDataFromDir(dritteBeteiligtePath);

    res.json(exportData);
  } catch (err) {
    console.error('Error exporting data:', err);
    res.status(500).json({ error: 'Fehler beim Exportieren der Daten' });
  }
});

// POST /api/import - Import data from a JSON object
app.post('/api/import', (req, res) => {
  try {
    const data = req.body;

    // Helper to clear a directory
    const clearDir = (dirPath) => {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        fs.unlinkSync(path.join(dirPath, file));
      }
    };

    // Helper to write data to a directory
    const writeDataToDir = (dirPath, items) => {
      if (items && Array.isArray(items)) {
        items.forEach(item => {
          if (!item.id) item.id = crypto.randomUUID(); // Ensure ID exists
          const filePath = path.join(dirPath, `${item.id}.json`);
          fs.writeFileSync(filePath, JSON.stringify(item, null, 2), 'utf-8');
        });
      }
    };

    // Clear existing data
    clearDir(mandantenPath);
    clearDir(recordsPath);
    clearDir(dritteBeteiligtePath);

    // Write new data
    writeDataToDir(mandantenPath, data.mandanten);
    writeDataToDir(recordsPath, data.records);
    writeDataToDir(dritteBeteiligtePath, data.dritteBeteiligte);

    res.status(200).json({ message: 'Daten erfolgreich importiert' });
  } catch (err) {
    console.error('Error importing data:', err);
    res.status(500).json({ error: 'Fehler beim Importieren der Daten' });
  }
});

app.listen(port, () => {
  console.log(`API-Server läuft auf http://localhost:${port}`);
});
