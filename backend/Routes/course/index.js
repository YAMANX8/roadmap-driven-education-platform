const router = require('express').Router();
const article = require('./article');
const course = require('./course');
const review = require('./review');
const video = require('./video');

/*Course*/
// Article
router.use('/AcademicCompass/article', article);

// course
router.use('/AcademicCompass/course', course);

// review
router.use('/AcademicCompass/review', review);

// video
router.use('/AcademicCompass/video', video);

module.exports = router;
