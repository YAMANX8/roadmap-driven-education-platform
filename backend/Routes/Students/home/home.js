const router = require('express').Router();
const pool = require('../../../database/db');
const popularRoadmaps = require('../../../Utils/dashboard/popular-roadmaps');

// * we don't need authorization in home page
// todo we need to change role_id
router.get('/', async (req, res) => {
  try {
    //get information to home page
    const enrollment = await pool.query(`
      SELECT
        COUNT(*)
      FROM
        Enrollment
    `);
    const roadmap = await pool.query(`
      SELECT
        COUNT(*)
      FROM
        roadmap
    `);
    const course = await pool.query(`
      SELECT
        COUNT(*)
      FROM
        course
    `);
    const instructor = await pool.query(`
      SELECT
        COUNT(*)
      FROM
        users
      WHERE
        role_id = 1
    `);
    const popularRoadmap = await popularRoadmaps.popularRoadmapsInfo();
    const responseData = {
      count: {
        enrollment: enrollment.rows[0],
        roadmap: roadmap.rows[0],
        course: course.rows[0],
        instructor: instructor.rows[0],
        popularRoadmap: popularRoadmap.Data.data,
      },
    };
    res.status(200).json(responseData);
  } catch (err) {
    console.error(err.message);
    res.status(500).json('Server Error');
  }
});

module.exports = router;
