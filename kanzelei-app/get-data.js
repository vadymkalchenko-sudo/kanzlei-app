require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3001; // Ein neuer Port für die API

// Verbindungsdetails zur Cloud-Datenbank
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.use(cors());

app.get('/api/kanzlei-daten', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM kanzlei_daten', []);
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.listen(port, () => {
  console.log(`API-Server läuft auf http://localhost:${port}`);
});
