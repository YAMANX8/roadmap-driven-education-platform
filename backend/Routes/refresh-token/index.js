const router = require('express').Router();
const refreshToken = require('./refresh-token');
const logout = require('./logout');

/*refreshToken*/
// refresh
router.use('/AcademicCompass', refreshToken);

// logout
router.use('/AcademicCompass', logout);

module.exports = router;
