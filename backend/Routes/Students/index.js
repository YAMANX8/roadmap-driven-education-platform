const router = require('express').Router();
const home = require('./home/home.js');
const studentDashboard = require('./dashboard-student/dashboard.js');
const studentRegister = require('./register/jwt-auth.js');
const search = require('./search/search.js');
const settings = require('./settings/setting.js');

/*Student*/
// Home
router.use('/AcademicCompass/home', home);

// studentDashboard
router.use('/AcademicCompass/studentDashboard', studentDashboard);

// studentRegister
router.use('/AcademicCompass/auth', studentRegister);

// search
router.use('/AcademicCompass/search', search);

// seetings for student
router.use('/AcademicCompass/student/setting', settings);

module.exports = router;
