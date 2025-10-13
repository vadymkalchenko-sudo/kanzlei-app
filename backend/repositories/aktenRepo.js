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
    const { mandantId, gegnerId, dokumente, aufgaben, notizen, fristen, ...metadaten } = akte;
    const newAkte = {
        id: crypto.randomUUID(),
        mandantId,
        gegnerId,
        metadaten: JSON.stringify(metadaten),
        dokumente: JSON.stringify(dokumente || []),
        aufgaben: JSON.stringify(aufgaben || []),
        notizen: JSON.stringify(notizen || []),
        fristen: JSON.stringify(fristen || []),
    };

    const query = `
        INSERT INTO akten (id, "mandantId", "gegnerId", metadaten, dokumente, aufgaben, notizen, fristen)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
    `;
    const values = [newAkte.id, newAkte.mandantId, newAkte.gegnerId, newAkte.metadaten, newAkte.dokumente, newAkte.aufgaben, newAkte.notizen, newAkte.fristen];

    const result = await pool.query(query, values);
    return unbundleFromJsonb(result.rows[0]);
};

const update = async (id, akte) => {
    const { mandantId, gegnerId, dokumente, aufgaben, notizen, fristen, ...metadaten } = akte;

    const query = `
        UPDATE akten
        SET
            "mandantId" = $2,
            "gegnerId" = $3,
            metadaten = $4,
            dokumente = $5,
            aufgaben = $6,
            notizen = $7,
            fristen = $8
        WHERE id = $1
        RETURNING *
    `;
    const values = [
        id,
        mandantId,
        gegnerId,
        JSON.stringify(metadaten),
        JSON.stringify(dokumente || []),
        JSON.stringify(aufgaben || []),
        JSON.stringify(notizen || []),
        JSON.stringify(fristen || []),
    ];

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