const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Unbundles the 'metadaten' JSONB field into the main object
const unbundleFromJsonb = (item) => {
    if (item && item.metadaten) {
        // Create a new object to avoid modifying the original item
        const unbundled = { ...item, ...item.metadaten };
        delete unbundled.metadaten; // Clean up the redundant field
        return unbundled;
    }
    return item;
};

const findAll = async () => {
    const result = await pool.query('SELECT * FROM akten');
    return result.rows.map(unbundleFromJsonb);
};

const findById = async (id) => {
    const result = await pool.query('SELECT * FROM akten WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        return null;
    }
    return unbundleFromJsonb(result.rows[0]);
};

const create = async (body) => {
    const { aktenzeichen, status, mandanten_id, ...metadaten } = body;
    const id = body.id || crypto.randomUUID();

    const query = `
        INSERT INTO akten (id, aktenzeichen, status, mandanten_id, metadaten)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;
    const values = [id, aktenzeichen, status, mandanten_id, JSON.stringify(metadaten)];

    const result = await pool.query(query, values);
    return unbundleFromJsonb(result.rows[0]);
};

const update = async (id, body) => {
    const { aktenzeichen, status, mandanten_id, ...metadaten } = body;

    const query = `
        UPDATE akten
        SET aktenzeichen = $2, status = $3, mandanten_id = $4, metadaten = $5
        WHERE id = $1
        RETURNING *
    `;
    const values = [id, aktenzeichen, status, mandanten_id, JSON.stringify(metadaten)];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
        return null;
    }
    return unbundleFromJsonb(result.rows[0]);
};

const remove = async (id) => {
    const result = await pool.query('DELETE FROM akten WHERE id = $1', [id]);
    return result.rowCount;
};

module.exports = {
    findAll,
    findById,
    create,
    update,
    remove,
};