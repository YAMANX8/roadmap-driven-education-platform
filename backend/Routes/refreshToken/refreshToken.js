const express = require("express");
const router = express.Router();
const refreshTokenMiddleware = require("../../../backend/middleware/refreshToken");

router.get("/refresh", refreshTokenMiddleware);

module.exports = router;
