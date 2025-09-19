const express = require('express');
const router = express.Router();
const { getChances } = require('../controllers/chanceController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getChances);

module.exports = router;
