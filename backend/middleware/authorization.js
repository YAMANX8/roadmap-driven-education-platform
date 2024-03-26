const jwt = require('jsonwebtoken');
require('dotenv').config();

//this middleware will on continue on if the token is inside the local storage
module.exports = function (req, res, next) {
  try {
    const jwtToken = req.header('token');
    if (!jwtToken) {
      return res.status(401).json('Not Authorize');
    }
    // eslint-disable-next-line no-undef
    const payload = jwt.verify(jwtToken, process.env.jwtSecret);
    req.user = {
      userId: payload.userId,
      roleId: payload.roleId,
    };
  } catch (error) {
    console.error(error.message);
    return res.status(401).json('Not Authorize');
  }
  next();
};
