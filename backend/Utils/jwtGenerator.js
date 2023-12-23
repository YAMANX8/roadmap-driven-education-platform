const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

function jwtGenerator(user_id,roleid) {
  const payload = {
    userId: user_id,
    roleId: roleid
  };

  //access token
  const accessToken = jwt.sign(payload, process.env.jwtSecret, {
    expiresIn: "30s",
  }); 
  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "1d",
  });

  return { accessToken, refreshToken };
}
module.exports = jwtGenerator;
