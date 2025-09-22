require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// The pool is initialized as null and will be created on demand.
let pool = null;

// Middleware to check if the database is connected
const checkDbConnected = (req, res, next) => {
  if (pool === null) {
    return res.status(503).json({ error: 'Datenbankverbindung nicht hergestellt. Bitte zuerst verbinden.' });
  }
  next();
};

// Endpoint to create the database connection
app.post('/api/db-connect', async (req, res) => {
  if (pool) {
    return res.status(200).json({ status: 'ok', message: 'Verbindung besteht bereits.' });
  }

  try {
    const dbConfig = {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      connectionTimeoutMillis: 5000,
    };

    pool = new Pool(dbConfig);

    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    res.json({ status: 'ok', message: 'Verbindung erfolgreich hergestellt.' });
  } catch (err) {
    // If connection fails, reset the pool to null
    pool = null;
    console.error('Database connection failed:', err);
    res.status(500).json({ status: 'error', message: 'Verbindungsfehler', error: err.message });
  }
});

// Endpoint to check the status of the connection
app.get('/api/db-status', async (req, res) => {
  if (pool === null) {
    return res.json({ status: 'disconnected', message: 'Keine Verbindung.' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    res.json({ status: 'ok', message: 'Verbindung aktiv.' });
  } catch (err) {
    // If the check fails, assume the connection is lost and reset the pool
    pool = null;
    console.error('Database status check failed:', err);
    res.status(500).json({ status: 'error', message: 'Verbindung verloren.', error: err.message });
  } finally {
    if (client) client.release();
  }
});


// Existing endpoint, now protected by the connection check middleware
app.get('/api/kanzlei-daten', checkDbConnected, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT * FROM kanzlei_daten', []);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching kanzlei-daten:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  } finally {
    if (client) client.release();
  }
});

app.listen(port, () => {
  console.log(`API-Server läuft auf http://localhost:${port}`);
});
