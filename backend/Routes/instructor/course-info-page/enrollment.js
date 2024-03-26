const router = require('express').Router();
const pool = require('../../../database/db');
const checkPermission = require('../../../middleware/check-permissions');
const authorization = require('../../../middleware/authorization');

router.get('/', authorization, async (req, res) => {
  try {
    const instructorId = req.user.userId;
    const roleId = req.user.roleId;

    // Permission check
    const hasAccess = await checkPermission(
      instructorId,
      'showCourseInfoPage',
      roleId,
    );

    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }

    const show_enrollment_query = `
      SELECT
        Student.student_id AS id,
        Student.first_name,
        Student.last_name,
        Student.picture,
        enrollment.strting_date,
        Student.country
      FROM
        Users
        LEFT JOIN course ON Users.user_id = course.instructor_id
        JOIN enrollment ON course.course_id = enrollment.course_id
        JOIN student ON enrollment.student_id = Student.student_id
      WHERE
        users.user_id = 1;
    `;

    const show_enrollment_result = await pool.query(show_enrollment_query, [
      instructorId,
    ]);

    // تنظيم النتائج في الشكل المطلوب
    const enrollmentData = show_enrollment_result.rows.map((row) => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      picture: `'http://localhost:5000/image/${row.picture}`,
      enroll_date: row.strting_date,
      country: row.country,
    }));

    res.status(200).json(enrollmentData);
  } catch (err) {
    console.error(err.message);
    res.status(500).json('Server Error');
  }
});

module.exports = router;
