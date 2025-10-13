const aktenRepo = require('../repositories/aktenRepo');
const ApiError = require('../utils/ApiError');

// @desc    Alle Akten abrufen
// @route   GET /api/records
// @access  Private
const getAkten = (req, res, next) => {
    console.log("Controller: getAkten");
    // Zukünftige Logik hier...
    res.status(200).json({ message: "Route für getAkten erreicht" });
};

// @desc    Eine neue Akte erstellen
// @route   POST /api/records
// @access  Private
const createAkte = (req, res, next) => {
    console.log("Controller: createAkte");
    // Validierte Daten sind in req.body verfügbar
    // Zukünftige Logik hier...
    res.status(201).json({ message: "Route für createAkte erreicht", data: req.body });
};

module.exports = {
    getAkten,
    createAkte,
};