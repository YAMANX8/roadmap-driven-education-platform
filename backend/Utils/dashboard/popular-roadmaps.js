const pool = require('../../database/db');

const popularRoadmapsInfo = async () => {
  try {
    const query = `
      SELECT
        Roadmap.roadmap_id,
        Roadmap.roadmap_title,
        Roadmap.roadmap_description,
        Roadmap.image_path,
        COUNT(DISTINCT Enrollment.enrollment_id) AS enrollment_count
      FROM
        Roadmap
        JOIN Topic_Level_1 ON Roadmap.roadmap_id = Topic_Level_1.roadmap_id
        JOIN Topic_Level_N ON Topic_Level_1.topic_level1_id = Topic_Level_N.topic_level1_id
        JOIN Items ON Topic_Level_N.topic_id = Items.topic_id
        JOIN Course ON Items.course_id = Course.course_id
        JOIN Enrollment ON Course.course_id = Enrollment.course_id
      GROUP BY
        Roadmap.roadmap_id,
        Roadmap.roadmap_title,
        Roadmap.roadmap_description,
        Roadmap.image_path
      ORDER BY
        enrollment_count DESC
      LIMIT
        3;
    `;
    const result = await pool.query(query);
    // فك ترميز اسماء الملفات قبل إرجاع البيانات
    const decodedData = result.rows.map((row) => {
      const decodedImagePath = decodeURIComponent(row.image_path);
      return {
        ...row,
        image_path: `http://localhost:5000/image/${decodedImagePath}`,
      };
    });

    return {
      status: 'success',
      results: decodedData.length,
      Data: {
        data: decodedData,
      },
    };
  } catch (error) {
    console.error('Error Get Returns the first three maps:', error);
    return {
      status: 'error',
      message: 'Get Returns the first three maps is Filed',
    };
  }
};

module.exports = {
  popularRoadmapsInfo,
};
