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

    // First query: Total item count
    const itemQuery = `
      SELECT
        COUNT(items.item_id) AS item_count
      FROM
        Users
        JOIN Course ON Users.user_id = course.instructor_id
        JOIN items ON course.course_id = items.course_id
      WHERE
        Users.user_id = $1
    `;
    const itemResult = await pool.query(itemQuery, [instructorId]);
    const totalItemCount = itemResult.rows[0].item_count;

    // Second query: Total enrollments
    const enrollmentQuery = `
      SELECT
        COUNT(enrollment.enrollment_id) AS total_enrollments
      FROM
        Course
        LEFT JOIN Enrollment ON Course.course_id = Enrollment.course_id
      WHERE
        Course.instructor_id = $1
    `;
    const enrollmentResult = await pool.query(enrollmentQuery, [instructorId]);
    const totalEnrollments = enrollmentResult.rows[0].total_enrollments;

    // Third query: Total reviews
    const reviewQuery = `
      SELECT
        COUNT(rating.rating_id) AS total_reviews
      FROM
        Course
        LEFT JOIN Enrollment e ON Course.course_id = e.course_id
        LEFT JOIN rating ON e.enrollment_id = rating.enrollment_id
      WHERE
        Course.instructor_id = $1
    `;
    const reviewResult = await pool.query(reviewQuery, [instructorId]);
    const totalReviews = reviewResult.rows[0].total_reviews;

    // Create JSON response
    const responseJSON = {
      items: totalItemCount,
      enrollments: totalEnrollments,
      reviews: totalReviews,
    };

    res.status(200).json(responseJSON);
  } catch (err) {
    console.error(err.message);
    res.status(500).json('Server Error');
  }
});

module.exports = router;
