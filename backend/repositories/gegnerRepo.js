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
        return { ...item, ...item.metadaten };
    }
    return item;
};

const findAll = async () => {
    const result = await pool.query('SELECT * FROM gegner');
    return result.rows.map(unbundleFromJsonb);
};

const findById = async (id) => {
    const result = await pool.query('SELECT * FROM gegner WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        return null;
    }
    return unbundleFromJsonb(result.rows[0]);
};

const create = async (body) => {
    const { name, akten_id, ...metadaten } = body;
    const id = body.id || crypto.randomUUID();

    const query = `
        INSERT INTO gegner (id, name, akten_id, metadaten)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;
    const values = [id, name, akten_id, JSON.stringify(metadaten)];

    const result = await pool.query(query, values);
    return unbundleFromJsonb(result.rows[0]);
};

const update = async (id, body) => {
    const { name, akten_id, ...metadaten } = body;

    const query = `
        UPDATE gegner
        SET name = $2, akten_id = $3, metadaten = $4
        WHERE id = $1
        RETURNING *
    `;
    const values = [id, name, akten_id, JSON.stringify(metadaten)];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
        return null;
    }
    return unbundleFromJsonb(result.rows[0]);
};

const remove = async (id) => {
    const result = await pool.query('DELETE FROM gegner WHERE id = $1', [id]);
    return result.rowCount;
};

module.exports = {
    findAll,
    findById,
    create,
    update,
    remove,
};