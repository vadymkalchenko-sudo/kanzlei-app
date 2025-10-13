const { Pool } = require('pg');

// PostgreSQL connection details
const pool = new Pool({
    user: 'kanzlei_user',
    host: '192.168.178.82',
    database: 'kanzlei_db',
    password: 'IHR_SICHERES_PASSWORT',
    port: 5432,
    connectionTimeoutMillis: 5000,
});

module.exports = pool;