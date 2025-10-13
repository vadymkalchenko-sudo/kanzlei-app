const express = require('express');
const router = express.Router();
const { getAkten, createAkte } = require('../controllers/aktenController');

// Route für GET /api/records
router.get('/', getAkten);

// Route für POST /api/records
router.post('/', createAkte);

// Hier können später weitere Routen (PUT, DELETE, GET by ID) hinzugefügt werden.

module.exports = router;