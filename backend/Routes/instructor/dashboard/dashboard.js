const router = require('express').Router();
const authorization = require('../../../middleware/authorization');
const checkPermission = require('../../../middleware/check-permissions');
const getMyPerformanceNumber = require('../../../Utils/dashboardInstructor/my-performance');
const getMyProfile = require('../../../Utils/dashboardInstructor/my-profile');
const get_Non_completed_Courses = require('../../../Utils/dashboardInstructor/course/my-non-completed-courses');
const get_Completed_Courses = require('../../../Utils/dashboardInstructor/course/completed-courses');
const getMyTopics = require('../../../Utils/dashboardInstructor/my-topics');

router.get('/', authorization, async (req, res) => {
  try {
    const Id = req.user.userId;
    const roleId = req.user.roleId;
    //permission
    const hasAccess = await checkPermission(
      Id,
      'dashboardAccessToInstructor',
      roleId,
    );
    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }
    // get my performance number
    const myPerformance =
      await getMyPerformanceNumber.GetALlPerformanceNumber(Id);
    // Get Genral Info About Instructor .
    const myProfile = await getMyProfile.myProfile(Id);
    // Get My_Non_completed_Courses .
    const My_Non_completed_Courses =
      await get_Non_completed_Courses.My_Non_completed_Courses(Id);
    // Get Completed_Courses .
    const Completed_Courses = await get_Completed_Courses.Completed_Courses(Id);
    //Get My topics
    const myTopics = await getMyTopics.GetMyTopics(Id);

    // Response data
    const formattedData = {
      instructor_rating: parseFloat(myProfile.Data.Instructoer_Rating.avg),
      performance: [
        {
          id: 1,
          title: 'Total Enrollments',
          count: parseInt(myPerformance.Data.totalEnrollments),
        },
        {
          id: 2,
          title: 'Total Reviews',
          count: parseInt(myPerformance.Data.totalReviews),
        },
        {
          id: 3,
          title: 'Total Courses',
          count: parseInt(myPerformance.Data.totalCourses),
        },
        {
          id: 4,
          title: 'Total Students',
          count: parseInt(myPerformance.Data.totalStudents),
        },
      ],
      topics: myTopics.Data.mytopic.map((topic) => ({
        id: topic.topic_level1_id,
        roadmap_id: topic.roadmap_id,
        title: topic.topic_title,
      })),
      non_completed_courses:
        My_Non_completed_Courses.Data.Non_completed_Courses.map((course) => ({
          id: course.course_id,
          title: course.course_title,
          progress: ((course.progress * 100) / 12).toFixed(1),
          thumnail: course.course_thumnail,
        })),
      completed_courses: Completed_Courses.Data.Completed_Courses.map(
        (course) => ({
          id: course.course_id,
          title: course.course_title,
          subtitle: course.subtitle,
          thumnail: course.course_thumnail,
        }),
      ),
    };

    res.status(200).json(formattedData);
  } catch (err) {
    console.error(err.message);
    res.status(500).json('Server Error');
  }
});

module.exports = router;
