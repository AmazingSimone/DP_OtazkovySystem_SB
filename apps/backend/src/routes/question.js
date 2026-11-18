const express = require("express");
const {
    createQuestion,
    editQuestion,
    deleteQuestion,
} = require("../controllers/questionFlowController");

const {
    getAllQuestions,
    getQuestionById,
    getQuestionsByModuleId,
    getQuestionsBySubjectId,
    getQuestionByUserId,
} = require("../controllers/questionReadController");

const {
    getQuestionAssignmentsByUser,
    reviewQuestion,
    respondToReview,
    publishQuestion,
    syncModuleNow,
} = require("../controllers/questionReviewController");

const {
    getPublishedQuestionsBySubject,
    teacherReviewQuestion,
} = require("../controllers/questionTeacherController");

const { getValidatedQuestionsWithAgreementBySubject } = require("../controllers/questionController");
const { getAssignmentStats } = require("../controllers/questionAssignmentController");

const router = express.Router();

// Reading
router.get("/subject/:subjectId", getQuestionsBySubjectId);
router.get("/subject/:subjectId/published", getPublishedQuestionsBySubject); // teacher: questions waiting for final review
router.get("/subject/:subjectId/validated-with-agreement", getValidatedQuestionsWithAgreementBySubject);
router.get("/module/:moduleId", getQuestionsByModuleId);
router.get("/user/:userId", getQuestionByUserId);

// Week 2: questions dealt to a student for review
router.post("/assignments/bulk/:modulId", syncModuleNow); // legacy trigger, now only syncs the module
router.get("/assignments/stats/:modulId", getAssignmentStats);
router.get("/assignments/:userId/:modulId", getQuestionAssignmentsByUser);

router.get("/:id", getQuestionById);
router.get("/", getAllQuestions);

// Week 1: creating, and correcting where the rules allow it
router.post("/", createQuestion);
router.put("/:id", editQuestion);
router.delete("/:id", deleteQuestion);

router.post("/:id/validate", reviewQuestion);                 // week 2: review an assigned question
router.post("/:id/respond", respondToReview);                 // week 3: author answers the review
router.post("/:id/publish", publishQuestion);                 // week 3: author sends it to the teacher
router.post("/:id/teacher-validate", teacherReviewQuestion);  // teacher: approve, reject, reject as abuse

module.exports = router;
