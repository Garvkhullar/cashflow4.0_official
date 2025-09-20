const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.registerTable);
router.post('/login', authController.loginTable);
router.post('/admin-login', authController.loginAdmin);
router.post('/team-login', authController.loginTeam);

module.exports = router;