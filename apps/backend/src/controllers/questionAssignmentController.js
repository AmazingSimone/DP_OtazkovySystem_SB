const { throwError } = require("../util/universal");
const QuestionAssignment = require("../models/questionAssignment");

// Dealing and reading of review assignments lives in services/questionReview.js and
// controllers/questionReviewController.js. Only the teacher statistics remain here.

/**
 * Get statistics about question assignments for a module
 */
exports.getAssignmentStats = async (req, res) => {
    if (!req.user.is_teacher) {
        return res.status(403).json({ message: "Iba pre učiteľov." });
    }
    try {
        const { modulId } = req.params;
        const weekNumber = 2;

        const stats = await QuestionAssignment.aggregate([
            { $match: { modul: modulId, weekNumber } },
            {
                $group: {
                    _id: '$question',
                    count: { $sum: 1 },
                    validators: { $push: '$assignedTo' }
                }
            },
            {
                $lookup: {
                    from: 'questions',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'questionDetails'
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (err) {
        throwError(`Error fetching assignment stats: ${err.message}`, 500);
    }
};
