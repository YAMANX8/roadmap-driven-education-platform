const router = require('express').Router();
const pool = require('../../../database/db');
const authorization = require('../../../middleware/authorization');
const count = require('../../../Utils/dashboard/count-dashboards');
const inprogresInfo = require('../../../Utils/dashboard/courses-inprogres-info');
const completCourseInfo = require('../../../Utils/dashboard/completed-course');
const MyRoadmaps = require('../../../Utils/dashboard/my-roadmaps');
const bringdataQuizETS = require('../../../Utils/dashboard/bringdata-quiz-ets');
const bring_All_Courses_Number = require('../../../Utils/dashboard/bring-all-courses-number');
const checkPermission = require('../../../middleware/check-permissions');

router.get('/', authorization, async (req, res) => {
  try {
    const Id = req.user.userId;
    const roleId = req.user.roleId;
    //permission
    const hasAccess = await checkPermission(
      Id,
      'dashboardAccessToStudent',
      roleId,
    );
    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }
    //get information to student
    const studentInfo = await pool.query(
      'SELECT * FROM student WHERE student_id = $1',
      [Id],
    );
    // get Info about courses count to student
    const countData = await count.GetCoursesNumberInfo(Id); //
    // get TotalPint
    const TotalPoint = await count.GetTotalPoit(Id); //
    // get InprogresInfo
    const InprogresInfo = await inprogresInfo.InProgresCourseInfo(Id);
    // get completionPercentage
    const completionPercentage = await inprogresInfo.completionPercentage(Id);
    // get stars Number
    const strs = await inprogresInfo.starsNumber(Id);
    // get GetCompletedCourse
    const GetCompletedCourse = await completCourseInfo.GetCompletedCourse(Id);
    // get Student Roadmap .
    const MyRoadmap = await MyRoadmaps.MyRoadmapsInfo(Id);
    // get quiz video and artical
    const Get_Quiz_Vedio_Artical = await bringdataQuizETS.qva(Id);
    // get All Courses Number
    const Get_All_Courses_Number =
      await bring_All_Courses_Number.Get_All_Courses_Number(Id);

    // Organize the data as per your desired format
    const profileData = {
      firstName: studentInfo.rows[0].first_name,
      lastName: studentInfo.rows[0].last_name,
      country: studentInfo.rows[0].country,
      city: studentInfo.rows[0].city,
      counts: [
        {
          id: 1,
          count: countData.Data.data[0]?.completed_courses || 0,
        },
        {
          id: 2,
          count: countData.Data.data[0]?.incomplete_courses || 0,
        },
        {
          id: 3,
          count: TotalPoint.Data.data[0]?.total_points || 0,
        },
      ],
    };

    const performance = [
      {
        id: 1,
        count: Get_All_Courses_Number.Data.data.total_enrollments || 0,
      },
      {
        id: 2,
        count: Get_Quiz_Vedio_Artical.Data.data.article_count || 0,
      },
      {
        id: 3,
        count: Get_Quiz_Vedio_Artical.Data.data.quiz_count || 0,
      },
      {
        id: 4,
        count: Get_Quiz_Vedio_Artical.Data.data.video_count || 0,
      },
    ];

    const progressCourses = InprogresInfo.Data.data
      ? InprogresInfo.Data.data.map((course) => ({
          id: course.course_id,
          title: course.course_title,
          subtitle: course.subtitle,
          progress: completionPercentage.Data.data,
          rating: strs.Data.data,
          image: course.course_thumnail,
        }))
      : [];

    const completedCourses = GetCompletedCourse.Data.data
      ? GetCompletedCourse.Data.data.map((course) => ({
          id: course.course_id,
          title: course.course_title,
          subtitle: course.subtitle,
          image: course.course_thumnail,
        }))
      : [];

    const myRoadmaps = MyRoadmap.Data.data
      ? MyRoadmap.Data.data.map((roadmap) => ({
          id: roadmap.roadmap_id,
          title: roadmap.roadmap_title,
        }))
      : [];
    // Combine all data into a single object
    const responseData = {
      profileData,
      performance,
      progressCourses,
      completedCourses,
      myRoadmaps,
    };

    // Send the combined data in the response
    res.status(200).json(responseData);
  } catch (err) {
    console.error(err.message);
    res.status(500).json('Server Error');
  }
});

module.exports = router;
