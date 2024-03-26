const express = require('express');
const router = express.Router();
const refreshTokenMiddleware = require('../../middleware/refresh-token');

router.get('/refresh', refreshTokenMiddleware);

module.exports = router;
