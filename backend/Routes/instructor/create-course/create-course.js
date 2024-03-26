const router = require('express').Router();
const pool = require('../../../database/db');
const checkPermission = require('../../../middleware/check-permissions');
const authorization = require('../../../middleware/authorization');

router.post('/', authorization, async (req, res) => {
  try {
    const { title, levelId, typeId } = req.body;
    const instructorId = req.user.userId;
    const roleId = req.user.roleId;
    //permission
    const hasAccess = await checkPermission(
      instructorId,
      'createCourse',
      roleId,
    );
    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }
    const query = `
      INSERT INTO
        Course (
          course_title,
          instructor_id,
          course_level,
          course_type
        )
      VALUES
        ($1, $2, $3, $4)
      RETURNING
        *
    `;
    const value = [title, instructorId, levelId, typeId];
    const result = await pool.query(query, value);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json('Server Error');
  }
});

// Get course data
router.get('/', authorization, async (req, res) => {
  try {
    const instructorId = req.user.userId;
    const roleId = req.user.roleId;

    // Permission check
    const hasAccess = await checkPermission(
      instructorId,
      'createCourse',
      roleId,
    );

    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }

    // Get levels data
    const getLevelsQuery = `
      SELECT
        level_id as id,
        level_name as title
      FROM
        Levels
    `;
    const levelsResult = await pool.query(getLevelsQuery);

    // Get Courses_Type data
    const getCoursesTypeQuery = `
      SELECT
        type_id as id,
        type_name as title
      FROM
        Courses_Type
    `;
    const coursesTypeResult = await pool.query(getCoursesTypeQuery);

    const jsonResponse = {
      levels: levelsResult.rows,
      types: coursesTypeResult.rows,
    };

    res.status(200).json(jsonResponse);
  } catch (err) {
    console.error(err.message);
    res.status(500).json('Server Error');
  }
});

module.exports = router;
