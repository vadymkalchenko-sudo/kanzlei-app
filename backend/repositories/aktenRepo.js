const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const metadataFields = ['caseNumber', 'betreff', 'status', 'kategorie', 'responsiblePerson', 'createdAt', 'updatedAt', 'schadenDatum'];

const bundleToJsonb = (body) => {
    const newItem = { ...body };
    const metadaten = {};
    metadataFields.forEach(field => {
        if (newItem[field]) {
            metadaten[field] = newItem[field];
            delete newItem[field];
        }
    });
    if (Object.keys(metadaten).length > 0) {
        newItem.metadaten = JSON.stringify(metadaten);
    }
    return newItem;
};

const unbundleFromJsonb = (item) => {
    const result = { ...item };
    if (result.metadaten) {
        Object.assign(result, result.metadaten);
        delete result.metadaten;
    }
    return result;
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

const create = async (akte) => {
    const newItem = bundleToJsonb(akte);
    if (!newItem.id) {
        newItem.id = crypto.randomUUID();
    }

    const columns = Object.keys(newItem).map(key => `"${key}"`).join(', ');
    const values = Object.values(newItem);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const query = `INSERT INTO akten (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);
    return unbundleFromJsonb(result.rows[0]);
};

const update = async (id, akte) => {
    const itemToUpdate = bundleToJsonb(akte);
    delete itemToUpdate.id;

    const columns = Object.keys(itemToUpdate).map((key, i) => `"${key}" = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(itemToUpdate)];

    const query = `UPDATE akten SET ${columns} WHERE id = $1 RETURNING *`;
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