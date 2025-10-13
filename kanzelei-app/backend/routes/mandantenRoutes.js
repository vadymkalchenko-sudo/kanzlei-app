const express = require('express');
const router = express.Router();
const { getMandanten, createMandant } = require('../controllers/mandantenController');

// Route für GET /api/mandanten
router.get('/', getMandanten);

// Route für POST /api/mandanten
router.post('/', createMandant);

// Hier können später weitere Routen hinzugefügt werden.

module.exports = router;