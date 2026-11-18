const { throwError } = require("../util/universal");

const Question = require("../models/question");
const Module = require("../models/modul");
const User = require("../models/user");
const Teacher = require("../models/teacher");

// The question flow now lives in questionFlowController (create, edit, delete),
// questionReviewController (review, respond, publish), questionReadController (reads)
// and questionTeacherController (teacher review). Only this older listing remains here.

/**
 * GET validated questions with user agreement by subject ID
 */
exports.getValidatedQuestionsWithAgreementBySubject = async (req, res) => {
    // Names of authors and reviewers are for teachers only; students work anonymously.
    if (!req.user.is_teacher) {
        return res.status(403).json({ message: "Iba pre učiteľov." });
    }
    try {
        // Find modules with the given subject ID
        const modules = await Module.find({ subject: req.params.subjectId }).select('_id');
        const moduleIds = modules.map(m => m._id);

        // Get filter from query params (all, student, teacher)
        const filter = req.query.filter || 'all';

        // Build query based on filter
        let query = {
            modul: { $in: moduleIds },
            validated: true
        };

        if (filter === 'student') {
            // Only student questions with user agreement
            const students = await User.find({}).select('_id');
            const studentIds = students.map(s => s._id);
            query.createdBy = { $in: studentIds };
            query['user_agreement.agreed'] = true;
        } else if (filter === 'teacher') {
            // Only teacher-created questions
            const teachers = await Teacher.find({}).select('_id');
            const teacherIds = teachers.map(t => t._id);
            query.createdBy = { $in: teacherIds };
            query.validated_by_teacher = true;
        } else {
            // All: both student questions with agreement OR teacher questions
            query.$or = [
                { 'user_agreement.agreed': true },
                { 'validated_by_teacher': true }
            ];
        }

        // Find questions that match the filter
        const questions = await Question.find(query)
            .populate('modul', 'title ')
            .populate('validated_by', 'name surname email')
            .sort({ createdAt: -1 });

        // Manually populate createdBy from both User and Teacher collections
        const populatedQuestions = await Promise.all(
            questions.map(async (question) => {
                const questionObj = question.toObject();

                if (questionObj.createdBy) {
                    // Try to find in User collection first
                    let creator = await User.findById(questionObj.createdBy).select('name surname email');

                    // If not found in User, try Teacher collection
                    if (!creator) {
                        creator = await Teacher.findById(questionObj.createdBy).select('name surname email');
                    }

                    questionObj.createdBy = creator;
                }

                return questionObj;
            })
        );

        res.status(200).json(populatedQuestions);
    } catch (err) {
        throwError(`Error fetching validated questions with agreement: ${err.message}`, 500);
    }
};
