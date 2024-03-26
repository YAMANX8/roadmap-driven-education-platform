const express = require('express');
const router = express.Router();

// Import and use the routers from other index.js files
const courseRouter = require('./course/index');
const instructorRouter = require('./instructor/index');
const refreshTokenRouter = require('./refresh-token/index');
const roadmapRouter = require('./roadmap/index');
const studentsRouter = require('./students/index');

// Use the imported routers
router.use(courseRouter);
router.use(instructorRouter);
router.use(refreshTokenRouter);
router.use(roadmapRouter);
router.use(studentsRouter);

module.exports = router;
