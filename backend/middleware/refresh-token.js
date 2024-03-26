const jwt = require('jsonwebtoken');
const jwtGenerator = require('../Utils/jwt-generator');
const dotenv = require('dotenv');
dotenv.config();

// Middleware to handle token refresh
async function refreshTokenMiddleware(req, res) {
  const refreshToken = req.cookies.jwt;
  console.log(refreshToken);

  if (!refreshToken) {
    return res.status(403).json('Not Authorized');
  }
  try {
    // eslint-disable-next-line no-undef
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const { token } = jwtGenerator(payload.userId, payload.roleId);

    // Respond with the new access token
    return res.json({ token });
  } catch (error) {
    console.error(error.message);
    return res.status(403).json('Not Authorized');
  }
}

module.exports = refreshTokenMiddleware;
