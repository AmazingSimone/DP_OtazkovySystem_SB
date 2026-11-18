const express = require("express");
const router = express.Router();
const pointController = require("../controllers/pointController");

// Get routes - Available to authenticated users
router.get("/user/:userId", pointController.getUserPoints);
router.get("/user/:userId/summary", pointController.getUserPointsSummary);
router.post("/users/summary", pointController.getUsersPointsSummary);

// The three batch award endpoints are retired. Points for the question flow are awarded at the
// moment a student creates, reviews or publishes a question, and awarding them again in bulk
// would break the rules of the three weeks (see services/questionFlow.js).
const retired = (req, res) =>
    res.status(410).json({
        success: false,
        message: "Points for questions are awarded automatically; this endpoint is no longer available.",
    });
router.post("/award/week1", retired);
router.post("/award/week2", retired);
router.post("/award/week3", retired);
// Custom points
router.post("/award/custom", pointController.awardCustomPoints);

// Update and delete point records - Only available to teachers
router.put("/:pointId", pointController.updatePoint);
router.delete("/:pointId", pointController.deletePoint);

module.exports = router;