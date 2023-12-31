const router = require("express").Router();
const authorization = require("../../../middleware/authorization");
const checkPermission = require("../../../middleware/checkPermissions");
const getMyPerformanceNumber = require("../../../Utils/dashboardInstructor/myPerformance");
const getMyProfile = require("../../../Utils/dashboardInstructor/MyProfile");
const get_Non_completed_Courses = require("../../../Utils/dashboardInstructor/course/My Non-completed Courses");
const get_Completed_Courses = require("../../../Utils/dashboardInstructor/course/completed Courses");
const getMyTopics = require("../../../Utils/dashboardInstructor/myTopics");
router.get("/", authorization, async (req, res, next) => {
  try {
    const Id = req.user.userId;
    const roleId = req.user.roleId;
    console.log(roleId);
    //permission
    const hasAccess = await checkPermission(
      Id,
      "dashboardAccessToInstructor",
      roleId
    );
    if (!hasAccess) {
      return res.status(403).json("Access denied");
    }
    // get my performance number
    const myPerformance = await getMyPerformanceNumber.GetALlPerformanceNumber(
      Id
    );
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
          title: "Total Enrollments",
          count: parseInt(myPerformance.Data.totalEnrollments),
        },
        {
          id: 2,
          title: "Total Reviews",
          count: parseInt(myPerformance.Data.totalReviews),
        },
        {
          id: 3,
          title: "Total Courses",
          count: parseInt(myPerformance.Data.totalCourses),
        },
        {
          id: 4,
          title: "Total Students",
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
          progress: (course.progress * 100) / 10,
          thumnail: course.course_thumnail,
        })),
      completed_courses: Completed_Courses.Data.Completed_Courses.map(
        (course) => ({
          id: course.course_id,
          title: course.course_title,
          subtitle: course.subtitle,
          thumnail: course.course_thumnail,
        })
      ),
    };

    res.status(200).json(formattedData);
  } catch (err) {
    console.error(err.message);
    res.status(500).json("Server Error");
  }
});

module.exports = router;
`const json = {
    instructor_rating: 4.5,
    performance: [
      {
        id: 1,
        title: "Total Enrollments",
        count: 10, 
      },
      {
        id: 2,
        title: "Total Reviews",
        count: 20, 
      },
      {
        id: 3,
        title: "Total Courses",
        count: 30, 
      },
      {
        id: 4,
        title: "Total Students",
        count: 10, 
      },
    ],
    topics: [
      {
        id: 1,
        roadmap_id: 18,
        title: "HTML",
      },
      {
        id: 2,
        roadmap_id: 18,
        title: "CSS",
      },
    ],
    non_completed_courses: [
      {
        id: 1,
        title:
          "course title goes here course title goes here course title goes here",
        progress: 10, 
        thumnail: "url_to_image.png",
      },
      {
        id: 1,
        title:
          "course title goes here course title goes here course title goes here",
        progress: 10, 
        thumnail: "url_to_image.png",
      },
      {
        id: 1,
        title:
          "course title goes here course title goes here course title goes here",
        progress: 10,
        thumnail: "url_to_image.png",
      },
      {
        id: 2,
        title:
          "course title goes here course title goes here course title goes here",
        progress: 50,
        thumnail: "url_to_image.png",
      },
    ],
    completed_courses: [
      {
        id: 1,
        title:
          "course title goes here course title goes here course title goes here",
        subtitle:
          "course title goes herecourse title goes herecourse title goes herecourse title goes herecourse title goes herecourse tit",
        thumnail: "url_to_image.png",
      },
      {
        id: 2,
        title:
          "course title goes here course title goes here course title goes here",
        subtitle:
          "course title goes herecourse title goes herecourse title goes herecourse title goes herecourse title goes herecourse tit",
        thumnail: "url_to_image.png",
      },
    ],
  };`;
