const pool = require('../../database/db');

// Bring All Performance Number
const GetALlPerformanceNumber = async (instructoer_id) => {
  try {
    const value = [instructoer_id];
    //1- total enrollments
    const query1 = `
      SELECT
        SUM(total_enrollments) AS total
      FROM
        (
          SELECT
            Course.course_id,
            COUNT(Enrollment.course_id) AS total_enrollments
          FROM
            Course
            LEFT JOIN Enrollment ON Course.course_id = Enrollment.course_id
          WHERE
            Course.instructor_id = $1
          GROUP BY
            Course.course_id
        ) subquery
      WHERE
        total_enrollments > 0
    `;
    const result1 = await pool.query(query1, value);
    //2- total reviews
    const query2 = `
      SELECT
        SUM(total_reviews) AS total
      FROM
        (
          SELECT
            Course.course_id,
            COUNT(rating.rating_id) AS total_reviews
          FROM
            Course
            LEFT JOIN Enrollment e ON Course.course_id = e.course_id
            LEFT JOIN rating ON e.enrollment_id = rating.enrollment_id
          WHERE
            Course.instructor_id = $1
          GROUP BY
            Course.course_id
        ) subquery
      WHERE
        total_reviews > 0
    `;
    const result2 = await pool.query(query2, value);
    //3- total courses
    const query3 = `
      SELECT
        SUM(total_courses) AS total
      FROM
        (
          SELECT
            COUNT(Course.course_id) AS total_courses
          FROM
            Course
          WHERE
            Course.instructor_id = $1
          GROUP BY
            Course.course_id
        ) subquery
      WHERE
        total_courses > 0
    `;
    const result3 = await pool.query(query3, value);
    //4- total students
    const query4 = `
      SELECT
        COUNT(DISTINCT Enrollment.student_id) AS total_student
      FROM
        Course
        JOIN Users ON Course.instructor_id = Users.user_id
        JOIN Enrollment ON Course.course_id = Enrollment.course_id
      where
        user_id = $1
    `;
    const result4 = await pool.query(query4, value);
    return {
      status: 'success',
      Data: {
        totalEnrollments: result1.rows[0].total,
        totalReviews: result2.rows[0].total,
        totalCourses: result3.rows[0].total,
        totalStudents: result4.rows[0].total_student,
      },
    };
  } catch (err) {
    console.error('Error Get All Courses Number : ', err);
    return {
      status: 'error',
      message: 'Error Get All Courses Number Is Field',
    };
  }
};

module.exports = {
  GetALlPerformanceNumber,
};
