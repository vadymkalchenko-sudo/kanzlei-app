const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const contactFields = ['strasse', 'hausnummer', 'plz', 'ort', 'mailadresse', 'telefonnummer', 'iban'];

const bundleToJsonb = (body) => {
    const newItem = { ...body };
    const kontakte = {};
    contactFields.forEach(field => {
        if (newItem[field]) {
            kontakte[field] = newItem[field];
            delete newItem[field];
        }
    });
    if (Object.keys(kontakte).length > 0) {
        newItem.kontakte = JSON.stringify(kontakte);
    }
    return newItem;
};

const unbundleFromJsonb = (item) => {
    const result = { ...item };
    if (result.kontakte) {
        Object.assign(result, result.kontakte);
    }
    return result;
};

const findAll = async () => {
    const result = await pool.query('SELECT * FROM mandanten');
    return result.rows.map(unbundleFromJsonb);
};

const findById = async (id) => {
    const result = await pool.query('SELECT * FROM mandanten WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        return null;
    }
    return unbundleFromJsonb(result.rows[0]);
};

const create = async (mandant) => {
    const newItem = bundleToJsonb(mandant);
    if (!newItem.id) {
        newItem.id = crypto.randomUUID();
    }
    if (newItem.historie && typeof newItem.historie === 'object') {
        newItem.historie = JSON.stringify(newItem.historie);
    }

    const columns = Object.keys(newItem).map(key => `"${key}"`).join(', ');
    const values = Object.values(newItem);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const query = `INSERT INTO mandanten (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);
    return unbundleFromJsonb(result.rows[0]);
};

const update = async (id, mandant) => {
    const itemToUpdate = bundleToJsonb(mandant);
    delete itemToUpdate.id;

    if (itemToUpdate.historie && typeof itemToUpdate.historie === 'object') {
        itemToUpdate.historie = JSON.stringify(itemToUpdate.historie);
    }

    const columns = Object.keys(itemToUpdate).map((key, i) => `"${key}" = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(itemToUpdate)];

    const query = `UPDATE mandanten SET ${columns} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
        return null;
    }
    return unbundleFromJsonb(result.rows[0]);
};

const remove = async (id) => {
    const result = await pool.query('DELETE FROM mandanten WHERE id = $1', [id]);
    return result.rowCount;
};

module.exports = {
    findAll,
    findById,
    create,
    update,
    remove,
};