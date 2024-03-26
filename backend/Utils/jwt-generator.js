const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

function jwtGenerator(user_id, roleid) {
  const payload = {
    userId: user_id,
    roleId: roleid,
  };

  //access token
  // eslint-disable-next-line no-undef
  const token = jwt.sign(payload, process.env.jwtSecret, {
    expiresIn: '30d',
  });
  // eslint-disable-next-line no-undef
  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: '1d',
  });

  return { token, refreshToken };
}
module.exports = jwtGenerator;
