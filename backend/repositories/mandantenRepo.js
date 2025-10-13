const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

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
    const { anrede, name, ...kontakte } = mandant;
    const newMandant = {
        id: crypto.randomUUID(),
        anrede,
        name,
        kontakte: JSON.stringify(kontakte),
        historie: JSON.stringify([])
    };

    const query = `
        INSERT INTO mandanten (id, anrede, name, kontakte, historie)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;
    const values = [newMandant.id, newMandant.anrede, newMandant.name, newMandant.kontakte, newMandant.historie];

    const result = await pool.query(query, values);
    return unbundleFromJsonb(result.rows[0]);
};

const update = async (id, mandant) => {
    const { anrede, name, ...kontakte } = mandant;
    const itemToUpdate = {
        anrede,
        name,
        kontakte: JSON.stringify(kontakte),
    };

    // Filter out undefined values to avoid overwriting existing data with null
    const validKeys = Object.keys(itemToUpdate).filter(key => itemToUpdate[key] !== undefined);
    const columns = validKeys.map((key, i) => `"${key}" = $${i + 2}`).join(', ');
    const values = [id, ...validKeys.map(key => itemToUpdate[key])];

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