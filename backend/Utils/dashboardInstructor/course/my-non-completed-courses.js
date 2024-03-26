const pool = require('../../../database/db');

// Bring Non-completed Courses .
const My_Non_completed_Courses = async (instructoer_id) => {
  try {
    const value = [instructoer_id];

    const query = `
      SELECT
        course_id,
        course_title,
        course_thumnail,
        progress
      FROM
        (
          SELECT
            c.course_id,
            c.course_title,
            c.course_thumnail,
            CASE
              WHEN c.course_title IS NOT NULL THEN 1
              ELSE 0
            END + CASE
              WHEN c.subtitle IS NOT NULL THEN 1
              ELSE 0
            END + CASE
              WHEN c.course_description IS NOT NULL THEN 1
              ELSE 0
            END + CASE
              WHEN c.course_status = 'true' THEN 1
              ELSE 0
            END + CASE
              WHEN c.course_level IS NOT NULL THEN 1
              ELSE 0
            END + CASE
              WHEN c.course_type IS NOT NULL THEN 1
              ELSE 0
            END + CASE
              WHEN c.course_thumnail IS NOT NULL THEN 1
              ELSE 0
            END + CASE
              WHEN COUNT(
                CASE
                  WHEN lt.type_name = 'In this course you will learn the following' THEN cl.list_id
                END
              ) >= 1 THEN 1
              ELSE 0
            END + CASE
              WHEN COUNT(
                CASE
                  WHEN lt.type_name = 'Who this course is for:' THEN cl.list_id
                END
              ) >= 1 THEN 1
              ELSE 0
            END + CASE
              WHEN COUNT(
                CASE
                  WHEN lt.type_name = 'Requirements' THEN cl.list_id
                END
              ) >= 1 THEN 1
              ELSE 0
            END + CASE
              WHEN COUNT(DISTINCT I.item_id) >= 3 THEN 1
              ELSE 0
            END + CASE
              WHEN (
                COUNT(
                  DISTINCT CASE
                    WHEN v.item_id IS NOT NULL THEN I.item_id
                  END
                ) >= 1
                AND COUNT(
                  DISTINCT CASE
                    WHEN a.item_id IS NOT NULL THEN I.item_id
                  END
                ) >= 1
                AND COUNT(
                  DISTINCT CASE
                    WHEN q.item_id IS NOT NULL THEN I.item_id
                  END
                ) >= 1
              ) THEN 1
              ELSE 0
            END AS progress
          FROM
            Course c
            LEFT JOIN Course_Lists cl ON c.course_id = cl.course_id
            LEFT JOIN List_Type lt ON cl.list_type = lt.type_id
            LEFT JOIN Items I ON c.course_id = I.course_id
            LEFT JOIN Video v ON I.item_id = v.item_id
            LEFT JOIN Article a ON I.item_id = a.item_id
            LEFT JOIN Quiz q ON I.item_id = q.item_id
          WHERE
            c.instructor_id = $1
          GROUP BY
            c.course_id,
            c.course_title
        ) AS subquery
      WHERE
        progress < 12;
    `;
    const result = await pool.query(query, value);
    console.log(result);
    return {
      status: 'success',
      Data: {
        Non_completed_Courses: result.rows,
      },
    };
  } catch (err) {
    console.error('Error: ', err);
    return {
      status: 'error',
      message: 'Field',
    };
  }
};
module.exports = {
  My_Non_completed_Courses,
};
