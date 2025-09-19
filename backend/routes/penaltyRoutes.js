const express = require('express');
const router = express.Router();
const { getPenalties } = require('../controllers/penaltyController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getPenalties);

module.exports = router;
