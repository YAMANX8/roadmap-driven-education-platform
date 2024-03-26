const express = require('express');
const router = express.Router();
const logoutMiddleware = require('../../../backend/middleware/logout');

router.get('/logout', logoutMiddleware);

module.exports = router;
