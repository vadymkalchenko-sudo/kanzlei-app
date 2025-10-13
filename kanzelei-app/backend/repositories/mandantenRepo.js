const pool = require('../config/db');

// Leere Kapsel für Mandanten-Repository
// Zukünftige Datenbankoperationen für Mandanten werden hier implementiert.

const findAll = () => {
    console.log("Repository: findAll Mandanten (MOCK)");
    return [];
};

const create = (mandant) => {
    console.log("Repository: create Mandant (MOCK)", mandant);
    return { ...mandant, id: 'mock-id-mandant' };
};

module.exports = {
    findAll,
    create,
};