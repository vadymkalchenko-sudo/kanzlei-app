const mandantenRepo = require('../repositories/mandantenRepo');
const ApiError = require('../utils/ApiError');

// @desc    Alle Mandanten abrufen
// @route   GET /api/mandanten
// @access  Private
const getMandanten = (req, res, next) => {
    console.log("Controller: getMandanten");
    // Zukünftige Logik hier...
    res.status(200).json({ message: "Route für getMandanten erreicht" });
};

// @desc    Einen neuen Mandant erstellen
// @route   POST /api/mandanten
// @access  Private
const createMandant = (req, res, next) => {
    console.log("Controller: createMandant");
    // Validierte Daten sind in req.body verfügbar
    // Zukünftige Logik hier...
    res.status(201).json({ message: "Route für createMandant erreicht", data: req.body });
};

module.exports = {
    getMandanten,
    createMandant,
};