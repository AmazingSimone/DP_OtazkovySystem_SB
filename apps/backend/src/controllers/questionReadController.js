/**
 * Reading questions.
 *
 * Teachers see everything. A student sees only their own questions (with the review hidden
 * until week 3 and the reviewer always hidden) and the questions dealt to them for review
 * (without the author).
 */
const { getCurrentPhase } = require("../util/modulePhase");
const { reviewerView, authorView } = require("../services/questionViews");
const { syncModule } = require("../services/questionReview");

const Question = require("../models/question");
const QuestionAssignment = require("../models/questionAssignment");
const Module = require("../models/modul");

const deny = (res, status, message) => res.status(status).json({ message });

/** Turns a student's own questions into what they are allowed to see of them. */
const asAuthorViews = async (questions) => {
    const moduleIds = [...new Set(questions.map((q) => String(q.modul)))];
    const modules = await Module.find({ _id: { $in: moduleIds } });
    const phaseOf = new Map(modules.map((m) => [String(m._id), getCurrentPhase(m)]));
    return questions.map((q) => authorView(q, phaseOf.get(String(q.modul)) ?? 0));
};

/** Sends all questions matching `filter` to a teacher, or only the student's own ones. */
const sendQuestions = async (req, res, filter) => {
    if (req.user.is_teacher) {
        return res.status(200).json(await Question.find(filter));
    }
    const own = await Question.find({ ...filter, createdBy: req.user.user_id });
    res.status(200).json(await asAuthorViews(own));
};

/** GET /question */
exports.getAllQuestions = (req, res) => sendQuestions(req, res, {});

/**
 * GET /question/module/:moduleId
 * Also brings the module up to date, so an author opening week 3 finds every review in place.
 */
exports.getQuestionsByModuleId = async (req, res) => {
    const modul = await Module.findById(req.params.moduleId);
    if (modul) await syncModule(modul);
    return sendQuestions(req, res, { modul: req.params.moduleId });
};

/** GET /question/subject/:subjectId */
exports.getQuestionsBySubjectId = async (req, res) => {
    const moduleIds = await Module.find({ subject: req.params.subjectId }).distinct("_id");
    return sendQuestions(req, res, { modul: { $in: moduleIds } });
};

/** GET /question/user/:userId */
exports.getQuestionByUserId = async (req, res) => {
    if (!req.user.is_teacher && String(req.params.userId) !== String(req.user.user_id)) {
        return deny(res, 403, "Môžeš vidieť iba vlastné otázky.");
    }
    return sendQuestions(req, res, { createdBy: req.params.userId });
};

/** GET /question/:id */
exports.getQuestionById = async (req, res) => {
    const question = await Question.findById(req.params.id);
    if (!question) return deny(res, 404, "Question not found.");

    if (req.user.is_teacher) return res.status(200).json(question);

    if (String(question.createdBy) === String(req.user.user_id)) {
        const [view] = await asAuthorViews([question]);
        return res.status(200).json(view);
    }

    const assigned = await QuestionAssignment.exists({ question: question._id, assignedTo: req.user.user_id });
    if (assigned) return res.status(200).json(reviewerView(question));

    return deny(res, 403, "Túto otázku nemôžeš zobraziť.");
};
