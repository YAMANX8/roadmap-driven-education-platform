const router = require('express').Router();
const pool = require('../../../database/db');

// todo Here we used dynamic query
router.post('/course', async (req, res) => {
  try {
    const {
      Beginner,
      Intermediate,
      Expert,
      Rating,
      typeName1,
      typeName2,
      typeName3,
      courseTitle,
      courseRank,
    } = req.body;

    let condition1 = '';
    let condition2 = '';
    let condition3 = '';
    let condition4 = '';

    if (
      (Beginner !== '' || Intermediate !== '' || Expert !== '') &&
      (typeName1 !== '' || typeName2 !== '' || typeName3 !== '')
    ) {
      condition1 = `
        (
          (
            l.level_name IS NOT NULL
            AND l.level_name IN ($1, $2, $3)
          )
          AND (
            ct.type_name IS NOT NULL
            AND ct.type_name IN ($4, $5, $6)
          )
        )
      `;
    } else if (Beginner !== '' || Intermediate !== '' || Expert !== '') {
      condition2 = `
        (
          (
            l.level_name IS NOT NULL
            AND l.level_name IN ($1, $2, $3)
          )
          OR (
            ct.type_name IS NOT NULL
            AND ct.type_name IN ($4, $5, $6)
          )
        )
      `;
    } else if (typeName1 !== '' || typeName2 !== '' || typeName3 !== '') {
      condition3 = `
        (
          (
            l.level_name IS NOT NULL
            AND l.level_name IN ($1, $2, $3)
          )
          OR (
            ct.type_name IS NOT NULL
            AND ct.type_name IN ($4, $5, $6)
          )
        )
      `;
    } else if (
      Beginner == '' &&
      Intermediate == '' &&
      Expert == '' &&
      typeName1 == '' &&
      typeName2 == '' &&
      typeName3 == ''
    ) {
      condition4 = `
        (
          (
            l.level_name IS NOT NULL
            AND l.level_name IN ($1, $2, $3)
          )
          OR (
            ct.type_name IS NOT NULL
            AND ct.type_name IN ($4, $5, $6)
          )
        )
      `;
    }

    // بناء الشرط الثاني حسب الحالات الثلاث`**
    let condition5;
    let condition6;
    let values = [];
    if (Rating == '') {
      condition5 = `
        (
          c.course_title IS NOT NULL
          AND c.course_title ILIKE '%' || $7 || '%'
        )
      `;
      condition6 = `
        RC.course_rank > (($8 - 1) * 4)
        AND RC.course_rank <= ($8 * 4)
      `;
      values = [
        Beginner,
        Intermediate,
        Expert,
        typeName1,
        typeName2,
        typeName3,
        courseTitle,
        courseRank,
      ];
    } else {
      condition5 = `
        (
          rt.rating_stars IS NOT NULL
          AND rt.rating_stars >= $7
        )
        AND (
          c.course_title IS NOT NULL
          AND c.course_title ILIKE '%' || $8 || '%'
        )
      `;
      condition6 = `
        RC.course_rank > (($9 - 1) * 4)
        AND RC.course_rank <= ($9 * 4)
      `;
      values = [
        Beginner,
        Intermediate,
        Expert,
        typeName1,
        typeName2,
        typeName3,
        Rating,
        courseTitle,
        courseRank,
      ];
    }

    // دمج الشروط الثلاث حسب الحالة
    let finalCondition = '';
    if (
      condition1 !== '' &&
      condition2 == '' &&
      condition3 == '' &&
      condition4 == ''
    ) {
      finalCondition = `(${condition1}) AND (${condition5})`;
    } else if (
      condition1 == '' &&
      condition2 !== '' &&
      condition3 == '' &&
      condition4 == ''
    ) {
      finalCondition = `(${condition2}) AND (${condition5})`;
    } else if (
      condition1 == '' &&
      condition2 == '' &&
      condition3 !== '' &&
      condition4 == ''
    ) {
      finalCondition = `(${condition3}) AND (${condition5})`;
    } else if (
      condition1 == '' &&
      condition2 == '' &&
      condition3 == '' &&
      condition4 !== ''
    ) {
      finalCondition = `(${condition4}) OR (${condition5})`;
    }

    // بناء الاستعلام النهائي باستخدام الشرط النهائي
    const query = `
      WITH
        RankedCourses AS (
          SELECT DISTINCT
            ON (r.roadmap_id, c.course_id) r.roadmap_id,
            c.course_id,
            DENSE_RANK() OVER (
              ORDER BY
                r.roadmap_id
            ) AS roadmap_rank,
            DENSE_RANK() OVER (
              PARTITION BY
                r.roadmap_id
              ORDER BY
                c.course_id
            ) AS course_rank
          FROM
            Course c
            JOIN Levels l ON c.course_level = l.level_id
            JOIN Courses_Type ct ON c.course_type = ct.type_id
            JOIN Users u ON c.instructor_id = u.user_id
            LEFT JOIN (
              SELECT DISTINCT
                e.course_id,
                AVG(r.stars_number) AS rating_stars
              FROM
                Enrollment e
                JOIN Rating r ON e.enrollment_id = r.enrollment_id
              GROUP BY
                e.course_id
            ) rt ON c.course_id = rt.course_id
            JOIN items i ON c.course_id = i.course_id
            JOIN Topic_level_N TLN ON i.topic_id = TLN.topic_id
            JOIN Topic_level_1 TL1 ON TLN.topic_level1_id = TL1.topic_level1_id
            JOIN roadmap r ON TL1.roadmap_id = r.roadmap_id
          WHERE
            ${finalCondition}
        ),
        TotalCourseCount AS (
          SELECT
            COUNT(DISTINCT course_id) AS total_courses
          FROM
            RankedCourses
        )
      SELECT DISTINCT
        RC.roadmap_id,
        r.roadmap_title,
        RC.course_id,
        c.course_title,
        c.subtitle,
        c.course_duration,
        c.items_count,
        c.course_thumnail,
        l.level_name,
        u.first_name,
        u.last_name,
        COALESCE(rt.rating_stars, 0.0) AS rating_stars,
        ct.type_name,
        TLN.topic_title,
        (
          SELECT
            total_courses
          FROM
            TotalCourseCount
        ) AS total_courses
      FROM
        RankedCourses RC
        JOIN Course c ON RC.course_id = c.course_id
        LEFT JOIN roadmap r ON RC.roadmap_id = r.roadmap_id
        LEFT JOIN Levels l ON c.course_level = l.level_id
        LEFT JOIN Courses_Type ct ON c.course_type = ct.type_id
        LEFT JOIN Users u ON c.instructor_id = u.user_id
        LEFT JOIN (
          SELECT
            e.course_id,
            AVG(r.stars_number) AS rating_stars
          FROM
            Enrollment e
            JOIN Rating r ON e.enrollment_id = r.enrollment_id
          GROUP BY
            e.course_id
        ) rt ON c.course_id = rt.course_id
        LEFT JOIN items i ON c.course_id = i.course_id
        LEFT JOIN Topic_level_N TLN ON i.topic_id = TLN.topic_id
      WHERE
        ${condition6}
        AND c.course_status = 'Active'
    `;
    const result = await pool.query(query, values);
    const courses = [];
    let total_courses = 0;
    // تحويل البيانات من قاعدة البيانات إلى التنسيق المطلوب
    result.rows.forEach((row) => {
      const roadmapId = row.roadmap_id;
      const roadmapTitle = row.roadmap_title;
      const courseId = row.course_id;
      const courseTitle = row.course_title;
      const subtitle = row.subtitle;
      const courseDuration = row.course_duration;
      const courseThumnail = row.course_thumnail;
      const levelName = row.level_name;
      const instructorName = `${row.first_name} ${row.last_name}`;
      const ratingStars = parseFloat(row.rating_stars);
      const itemCount = row.items_count;
      const topicTitle = row.topic_title;
      total_courses = row.total_courses;
      // تحقق مما إذا كانت هناك مسارات مكررة في القائمة أو لا
      let existingRoadmap = courses.find((course) => course.id === roadmapId);

      if (!existingRoadmap) {
        // إذا لم يكن هناك مسار بنفس الهوية، قم بإنشاء واحد جديد
        existingRoadmap = {
          id: roadmapId,
          roadmap: roadmapTitle,
          courseescount: 0,
          courses: [],
        };
        courses.push(existingRoadmap);
      }

      // إنشاء معلومات الكورس
      const courseInfo = {
        id: courseId,
        title: courseTitle,
        subtitle: subtitle,
        ratings: ratingStars,
        duration: courseDuration,
        itemsCount: itemCount,
        level: levelName,
        instructor: instructorName,
        topics: [topicTitle],
        thumnail: courseThumnail,
      };
      // إضافة معلومات الكورس إلى المسار المناسب
      existingRoadmap.courses.push(courseInfo);
      existingRoadmap.courseescount++;
    });
    // إرسال البيانات بالشكل المطلوب
    res.status(200).json({
      status: 'success',
      title: '',
      total_courses: total_courses,
      data: courses,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

//* serch by topc_id
router.post('/topic', async (req, res) => {
  try {
    const {
      Beginner,
      Intermediate,
      Expert,
      Rating,
      typeName1,
      typeName2,
      typeName3,
      topiclevel_N,
      topiclevel_1,
      courseRank,
    } = req.body;

    let condition1 = '';
    let condition2 = '';
    let condition3 = '';
    let condition4 = '';

    if (
      (Beginner !== '' || Intermediate !== '' || Expert !== '') &&
      (typeName1 !== '' || typeName2 !== '' || typeName3 !== '')
    ) {
      condition1 = `
        (
          (
            l.level_name IS NOT NULL
            AND l.level_name IN ($1, $2, $3)
          )
          AND (
            ct.type_name IS NOT NULL
            AND ct.type_name IN ($4, $5, $6)
          )
        )
      `;
    } else if (Beginner !== '' || Intermediate !== '' || Expert !== '') {
      condition2 = `
        (
          (
            l.level_name IS NOT NULL
            AND l.level_name IN ($1, $2, $3)
          )
          OR (
            ct.type_name IS NOT NULL
            AND ct.type_name IN ($4, $5, $6)
          )
        )
      `;
    } else if (typeName1 !== '' || typeName2 !== '' || typeName3 !== '') {
      condition3 = `
        (
          (
            l.level_name IS NOT NULL
            AND l.level_name IN ($1, $2, $3)
          )
          OR (
            ct.type_name IS NOT NULL
            AND ct.type_name IN ($4, $5, $6)
          )
        )
      `;
    } else if (
      Beginner == '' &&
      Intermediate == '' &&
      Expert == '' &&
      typeName1 == '' &&
      typeName2 == '' &&
      typeName3 == ''
    ) {
      condition4 = `
        (
          (
            l.level_name IS NOT NULL
            AND l.level_name IN ($1, $2, $3)
          )
          OR (
            ct.type_name IS NOT NULL
            AND ct.type_name IN ($4, $5, $6)
          )
        )
      `;
    }

    // بناء الشرط الثاني حسب الحالات الثلاث`
    let condition5 = '';
    let condition6 = '';
    let values = [];
    let topicId = 0;
    if (topiclevel_N !== '' && Rating !== '') {
      topicId = topiclevel_N;
      condition5 = `
        (
          rt.rating_stars IS NOT NULL
          AND rt.rating_stars >= $7
        )
        AND (
          TLN.topic_id IS NOT NULL
          AND TLN.topic_id = $8
        )
      `;
      condition6 = `
        RC.course_rank > (($9 - 1) * 4)
        AND RC.course_rank <= ($9 * 4)
      `;
      values = [
        Beginner,
        Intermediate,
        Expert,
        typeName1,
        typeName2,
        typeName3,
        Rating,
        topicId,
        courseRank,
      ];
    } else if (topiclevel_N !== '' && Rating == '') {
      topicId = topiclevel_N;
      condition5 = `
        (
          TLN.topic_id IS NOT NULL
          AND TLN.topic_id = $7
        )
      `;
      condition6 = `
        RC.course_rank > (($8 - 1) * 4)
        AND RC.course_rank <= ($8 * 4)
      `;
      values = [
        Beginner,
        Intermediate,
        Expert,
        typeName1,
        typeName2,
        typeName3,
        topicId,
        courseRank,
      ];
    } else if (topiclevel_1 !== '' && Rating !== '') {
      topicId = topiclevel_1;
      condition5 = `
        (
          rt.rating_stars IS NOT NULL
          AND rt.rating_stars >= $7
        )
        AND (
          TL1.topic_level1_id IS NOT NULL
          AND TL1.topic_level1_id = $8
        )
      `;
      condition6 = `
        RC.course_rank > (($9 - 1) * 4)
        AND RC.course_rank <= ($9 * 4)
      `;
      values = [
        Beginner,
        Intermediate,
        Expert,
        typeName1,
        typeName2,
        typeName3,
        Rating,
        topicId,
        courseRank,
      ];
    } else if (topiclevel_1 !== '' && Rating == '') {
      topicId = topiclevel_1;
      condition5 = `
        (
          TL1.topic_level1_id IS NOT NULL
          AND TL1.topic_level1_id = $7
        )
      `;
      condition6 = `
        RC.course_rank > (($8 - 1) * 4)
        AND RC.course_rank <= ($8 * 4)
      `;
      values = [
        Beginner,
        Intermediate,
        Expert,
        typeName1,
        typeName2,
        typeName3,
        topicId,
        courseRank,
      ];
    }

    // دمج الشروط الثلاث حسب الحالة
    let finalCondition = '';
    if (
      condition1 !== '' &&
      condition2 == '' &&
      condition3 == '' &&
      condition4 == ''
    ) {
      finalCondition = `(${condition1}) AND (${condition5})`;
    } else if (
      condition1 == '' &&
      condition2 !== '' &&
      condition3 == '' &&
      condition4 == ''
    ) {
      finalCondition = `(${condition2}) AND (${condition5})`;
    } else if (
      condition1 == '' &&
      condition2 == '' &&
      condition3 !== '' &&
      condition4 == ''
    ) {
      finalCondition = `(${condition3}) AND (${condition5})`;
    } else if (
      condition1 == '' &&
      condition2 == '' &&
      condition3 == '' &&
      condition4 !== ''
    ) {
      finalCondition = `(${condition4}) OR (${condition5})`;
    }

    // بناء الاستعلام النهائي باستخدام الشرط النهائي
    const query = `
      WITH
        RankedCourses AS (
          SELECT DISTINCT
            ON (r.roadmap_id, c.course_id) r.roadmap_id,
            c.course_id,
            DENSE_RANK() OVER (
              ORDER BY
                r.roadmap_id
            ) AS roadmap_rank,
            DENSE_RANK() OVER (
              PARTITION BY
                r.roadmap_id
              ORDER BY
                c.course_id
            ) AS course_rank
          FROM
            Course c
            JOIN Levels l ON c.course_level = l.level_id
            JOIN Courses_Type ct ON c.course_type = ct.type_id
            JOIN Users u ON c.instructor_id = u.user_id
            LEFT JOIN (
              SELECT DISTINCT
                e.course_id,
                AVG(r.stars_number) AS rating_stars
              FROM
                Enrollment e
                JOIN Rating r ON e.enrollment_id = r.enrollment_id
              GROUP BY
                e.course_id
            ) rt ON c.course_id = rt.course_id
            JOIN items i ON c.course_id = i.course_id
            JOIN Topic_level_N TLN ON i.topic_id = TLN.topic_id
            JOIN Topic_level_1 TL1 ON TLN.topic_level1_id = TL1.topic_level1_id
            JOIN roadmap r ON TL1.roadmap_id = r.roadmap_id
          WHERE
            ${finalCondition}
        ),
        TotalCourseCount AS (
          SELECT
            COUNT(DISTINCT course_id) AS total_courses
          FROM
            RankedCourses
        )
      SELECT DISTINCT
        RC.roadmap_id,
        r.roadmap_title,
        RC.course_id,
        c.course_title,
        c.subtitle,
        c.course_duration,
        c.course_thumnail,
        l.level_name,
        u.first_name,
        u.last_name,
        rt.rating_stars,
        ct.type_name,
        c.items_count,
        TLN.topic_title AS TopicLevelN,
        (
          SELECT
            total_courses
          FROM
            TotalCourseCount
        ) AS total_courses
      FROM
        RankedCourses RC
        JOIN Course c ON RC.course_id = c.course_id
        JOIN roadmap r ON RC.roadmap_id = r.roadmap_id
        JOIN Levels l ON c.course_level = l.level_id
        JOIN Courses_Type ct ON c.course_type = ct.type_id
        JOIN Users u ON c.instructor_id = u.user_id
        LEFT JOIN (
          SELECT DISTINCT
            e.course_id,
            AVG(r.stars_number) AS rating_stars
          FROM
            Enrollment e
            JOIN Rating r ON e.enrollment_id = r.enrollment_id
          GROUP BY
            e.course_id
        ) rt ON c.course_id = rt.course_id
        JOIN items i ON c.course_id = i.course_id
        JOIN Topic_level_N TLN ON i.topic_id = TLN.topic_id
        JOIN Topic_level_1 TL1 ON TLN.topic_level1_id = TL1.topic_level1_id
      WHERE
        ${condition6}
    `;
    let query2 = '';
    let values2;
    if (topiclevel_N !== '') {
      query2 = `
        SELECT
          topic_title
        FROM
          topic_level_N
        WHERE
          topic_id = $1
      `;
      values2 = [topiclevel_N];
    } else if (topiclevel_1 !== '') {
      query2 = `
        SELECT
          topic_title
        FROM
          topic_level_1
        WHERE
          topic_level1_id = $1
      `;
      values2 = [topiclevel_1];
    }

    const result1 = await pool.query(query, values);
    const result2 = await pool.query(query2, values2);
    const courses = [];
    let total_courses = 0;
    // تحويل البيانات من قاعدة البيانات إلى التنسيق المطلوب
    result1.rows.forEach((row) => {
      const roadmapId = row.roadmap_id;
      const roadmapTitle = row.roadmap_title;
      const courseId = row.course_id;
      const courseTitle = row.course_title;
      const subtitle = row.subtitle;
      const courseDuration = row.course_duration;
      const courseThumnail = row.course_thumnail;
      const levelName = row.level_name;
      const instructorName = `${row.first_name} ${row.last_name}`;
      const ratingStars = parseFloat(row.rating_stars);
      const itemNo = row.items_count;
      const topicTitleN = row.topicleveln;
      total_courses = row.total_courses;
      // تحقق مما إذا كانت هناك مسارات مكررة في القائمة أو لا
      let existingRoadmap = courses.find((course) => course.id === roadmapId);

      if (!existingRoadmap) {
        // إذا لم يكن هناك مسار بنفس الهوية، قم بإنشاء واحد جديد
        existingRoadmap = {
          id: roadmapId,
          roadmap: roadmapTitle,
          courseescount: 0,
          courses: [],
        };
        courses.push(existingRoadmap);
      }

      // إنشاء معلومات الكورس
      const courseInfo = {
        id: courseId,
        title: courseTitle,
        subtitle: subtitle,
        ratings: ratingStars,
        duration: courseDuration,
        itemsCount: itemNo,
        level: levelName,
        instructor: instructorName,
        topics: [topicTitleN],
        thumnail: courseThumnail,
      };

      // إضافة معلومات الكورس إلى المسار المناسب
      existingRoadmap.courses.push(courseInfo);
      existingRoadmap.courseescount++;
    });
    // إرسال البيانات بالشكل المطلوب
    res.status(200).json({
      status: 'success',
      topicTitle: result2.rows[0].topic_title,
      total_courses: total_courses,
      data: courses,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
