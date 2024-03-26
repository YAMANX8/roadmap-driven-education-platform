const router = require('express').Router();
const pool = require('../../database/db');
const authorization = require('../../middleware/authorization');
const checkPermission = require('../../middleware/check-permissions');

//  Insert And Update
router.post('/edit_review/:course_id', authorization, async (req, res) => {
  try {
    const { stars_number, review } = req.body;
    const courseId = req.params.course_id;
    const studentId = req.user.userId;
    const roleId = req.user.roleId;
    //permission
    const hasAccess = await checkPermission(studentId, 'addReview', roleId);
    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }
    // Get Enrollment_id.
    const enrollmentQuery = `
      SELECT
        enrollment_id
      FROM
        enrollment
      WHERE
        student_id = $1
        AND course_id = $2;
    `;
    const enrollmentValues = [studentId, courseId];
    const enrollmentResult = await pool.query(
      enrollmentQuery,
      enrollmentValues,
    );

    if (enrollmentResult.rows.length !== 0) {
      const enrollmentId = enrollmentResult.rows[0].enrollment_id;

      // Get Rating_id.
      const ratingQuery = `
        SELECT
          rating_id
        FROM
          rating
        WHERE
          enrollment_id = $1;
      `;
      const ratingValues = [enrollmentId];
      const ratingResult = await pool.query(ratingQuery, ratingValues);

      if (ratingResult.rows.length !== 0) {
        const ratingId = ratingResult.rows[0].rating_id;

        // Update the review.
        const updateReviewQuery = `
          UPDATE rating
          SET
            review = $1,
            stars_number = $2
          WHERE
            rating_id = $3
            AND enrollment_id = $4;
        `;
        const updateReviewValues = [
          review,
          stars_number,
          ratingId,
          enrollmentId,
        ];
        await pool.query(updateReviewQuery, updateReviewValues);

        return res.status(200).json({ status: 'Success, Updated Rating' });
      } else {
        // Insert a new review.
        const insertReviewQuery = `
          INSERT INTO
            rating (stars_number, review, enrollment_id)
          VALUES
            ($1, $2, $3);
        `;
        const insertReviewValues = [stars_number, review, enrollmentId];
        await pool.query(insertReviewQuery, insertReviewValues);

        return res.status(200).json({ status: 'Success, Inserted Rating' });
      }
    } else {
      return res
        .status(401)
        .json({ message: "You Didn't Enroll in This Course" });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//  Show Review
router.get('/show_review/:course_id', authorization, async (req, res) => {
  try {
    const course_id = req.params.course_id;
    const studentId = req.user.userId;
    const roleId = req.user.roleId;
    //permission
    const hasAccess = await checkPermission(studentId, 'addReview', roleId);
    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }
    const show_review = `
      SELECT
        Rating.stars_number AS rating,
        Rating.review,
        Student.first_name,
        Student.last_name,
        Student.picture
      FROM
        course
        LEFT JOIN enrollment ON course.course_id = enrollment.course_id
        JOIN Student ON enrollment.student_id = Student.student_id
        JOIN rating ON enrollment.enrollment_id = rating.enrollment_id
      WHERE
        course.course_id = $1
        AND enrollment.student_id = $2;
    `;
    const values = [course_id, studentId];
    const show_review_result = await pool.query(show_review, values);
    const result = show_review_result.rows[0];
    if (show_review_result.rows.length === 0) {
      const jsonResult = {
        rating: null,
        review: '',
      };
      res.status(404).json(jsonResult);
      return;
    }
    const jsonResult = {
      rating: result.rating,
      review: result.review,
    };
    res.status(200).json(jsonResult);
  } catch (err) {
    console.log(err);
    res.status(500).json({ status: 'error' });
  }
});

// * Delete Rview
router.delete('/delete_review/:course_id', authorization, async (req, res) => {
  try {
    const studentId = req.user.userId;
    const courseId = req.params.course_id;
    const roleId = req.user.roleId;
    //permission
    const hasAccess = await checkPermission(studentId, 'addReview', roleId);
    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }
    const enrollmentQuery = `
      SELECT
        enrollment_id
      FROM
        enrollment
      WHERE
        student_id = $1
        AND course_id = $2;
    `;
    const enrollmentValues = [studentId, courseId];
    const enrollmentResult = await pool.query(
      enrollmentQuery,
      enrollmentValues,
    );

    if (enrollmentResult.rows.length !== 0) {
      const enrollmentId = enrollmentResult.rows[0].enrollment_id;

      const ratingQuery = `
        SELECT
          rating_id
        FROM
          rating
        WHERE
          enrollment_id = $1;
      `;
      const ratingValues = [enrollmentId];
      const ratingResult = await pool.query(ratingQuery, ratingValues);

      if (ratingResult.rows.length !== 0) {
        const ratingId = ratingResult.rows[0].rating_id;

        const deleteReviewQuery = `
          DELETE FROM rating
          WHERE
            enrollment_id = $1
            AND rating_id = $2;
        `;
        const deleteReviewValues = [enrollmentId, ratingId];
        await pool.query(deleteReviewQuery, deleteReviewValues);

        res.json({ status: 'Success, Review Deleted' });
      } else {
        res.status(500).json({
          status: 'error',
          message: 'No rating found for this enrollment',
        });
      }
    } else {
      res.status(401).json({ message: "You Didn't Enroll in This Course" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'An error occurred' });
  }
});

module.exports = router;
