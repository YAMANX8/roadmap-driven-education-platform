const pool = require('../../database/db');

// * Get all roadmap for student
const MyRoadmapsInfo = async (student_id) => {
  try {
    const query =
      'SELECT DISTINCT R.roadmap_id,R.roadmap_title FROM Roadmap R JOIN Topic_Level_1 TL1 ON R.roadmap_id = TL1.roadmap_id JOIN Topic_Level_N TLN ON TL1.topic_level1_id = TLN.topic_level1_id JOIN Items I ON TLN.topic_id = I.topic_id JOIN Course C ON I.course_id = C.course_id JOIN Enrollment E ON C.course_id = E.course_id WHERE E.student_id = $1;';
    const values = [student_id];
    const result = await pool.query(query, values);
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
  MyRoadmapsInfo,
};
