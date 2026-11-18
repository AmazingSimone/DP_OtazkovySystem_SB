/**
 * The teacher's final review of published questions.
 *
 * Only an approved question enters the pool that tests draw from. A question rejected as
 * abuse also costs its author, and the reviewer who approved it, the points they earned on it.
 */
const { awardPoint, removePoints } = require("../services/questionFlow");

const Question = require("../models/question");
const Module = require("../models/modul");
const User = require("../models/user");
const Point = require("../models/point");

const deny = (res, status, message) => res.status(status).json({ message });
const DECISIONS = ["approved", "rejected", "abuse"];
const PERSON_FIELDS = "name surname email groupNumber studentNumber";

/**
 * GET /question/subject/:subjectId/published
 * Published student questions of a subject with real names, the review, the author's answer
 * and the original text if the author corrected it.
 *
 * Optional filters: modulId, authorId, status (pending|approved|rejected|abuse),
 * tag (missing_reviewer|reviewer_no_response|none), verdict (valid|fault),
 * agreed (true|false), edited (true|false).
 */
exports.getPublishedQuestionsBySubject = async (req, res) => {
    if (!req.user.is_teacher) return deny(res, 403, "Iba pre učiteľov.");

    const { modulId, authorId, status, tag, verdict, agreed, edited } = req.query;

    const moduleFilter = { subject: req.params.subjectId };
    if (modulId) moduleFilter._id = modulId;
    const modules = await Module.find(moduleFilter).select("_id title");

    const filter = { modul: { $in: modules.map((m) => m._id) }, published: true };
    if (authorId) filter.createdBy = authorId;
    if (status === "pending") filter.teacher_status = { $in: ["pending", null] };
    else if (status) filter.teacher_status = status;
    if (tag === "none") filter.review_tag = null;
    else if (tag) filter.review_tag = tag;
    if (verdict === "valid") filter.validated = true;
    if (verdict === "fault") filter.validated = false;
    if (agreed === "true" || agreed === "false") filter["user_agreement.agreed"] = agreed === "true";
    if (edited === "true") filter.original = { $ne: null };
    if (edited === "false") filter.original = null;

    const questions = await Question.find(filter).sort({ published_at: -1 });

    const personIds = [...new Set(questions.flatMap((q) => [q.createdBy, q.validated_by]).filter(Boolean).map(String))];
    const people = new Map(
        (await User.find({ _id: { $in: personIds } }).select(PERSON_FIELDS)).map((p) => [String(p._id), p])
    );
    const moduleOf = new Map(modules.map((m) => [String(m._id), { _id: m._id, title: m.title }]));

    res.status(200).json(
        questions.map((q) => ({
            ...q.toObject(),
            createdBy: people.get(String(q.createdBy)) || null,
            reviewer: q.validated_by ? people.get(String(q.validated_by)) || null : null,
            modul: moduleOf.get(String(q.modul)) || null,
        }))
    );
};

/** Sum of the points a student earned on one question in the given categories. */
const earnedOnQuestion = async (studentId, questionId, categories) => {
    const points = await Point.find({
        student: studentId,
        category: { $in: categories },
        "related_entity.entity_id": questionId,
    }).select("points");
    return points.reduce((sum, p) => sum + p.points, 0);
};

/**
 * Deducts what the author earned by creating and publishing the question and, if a student
 * reviewed it as valid, what that reviewer earned for the review. `extra` is added for each.
 */
const applyAbusePenalties = async (question, { comment, extra, teacherId }) => {
    const modul = await Module.findById(question.modul).select("subject");
    const deduct = async (studentId, earned, reason) => {
        const amount = earned + extra;
        if (amount <= 0) return;
        await awardPoint({
            student: studentId,
            subject: modul?.subject || null,
            points: -amount,
            category: "question_penalty",
            reason: `${reason}: ${comment}`,
            entityId: question._id,
            assignedBy: teacherId,
        });
    };

    if (await User.exists({ _id: question.createdBy })) {
        const earned = await earnedOnQuestion(question.createdBy, question._id, [
            "question_creation",
            "question_reparation",
        ]);
        await deduct(question.createdBy, earned, "Penalty for a question rejected as abuse");
    }

    const approvedByStudent = question.validated_by && question.validated === true && !question.review_tag;
    if (approvedByStudent) {
        const earned = await earnedOnQuestion(question.validated_by, question._id, ["question_validation"]);
        await deduct(question.validated_by, earned, "Penalty for approving a question rejected as abuse");
    }
};

/**
 * POST /question/:id/teacher-validate
 *   { status: "approved" | "rejected" | "abuse", comment: string, extraPenalty?: number }
 * The older shape { validated_by_teacher: boolean, validated_by_teacher_comment } still works.
 * A decision can be changed; penalties always reflect the latest one.
 */
exports.teacherReviewQuestion = async (req, res) => {
    if (!req.user.is_teacher) return deny(res, 403, "Iba pre učiteľov.");

    let { status, comment } = req.body;
    if (status === undefined && typeof req.body.validated_by_teacher === "boolean") {
        status = req.body.validated_by_teacher ? "approved" : "rejected";
        comment = req.body.validated_by_teacher_comment;
    }
    if (!DECISIONS.includes(status)) {
        return deny(res, 400, "validated_by_teacher field must be a boolean.");
    }
    comment = typeof comment === "string" ? comment.trim() : "";
    if (!comment) return deny(res, 400, "Teacher validation comment is required.");

    const extra = req.body.extraPenalty === undefined ? 0 : Number(req.body.extraPenalty);
    if (!Number.isFinite(extra) || extra < 0) {
        return deny(res, 400, "Extra penalty must be zero or a positive number.");
    }

    const question = await Question.findById(req.params.id);
    if (!question) return deny(res, 404, "Question not found.");

    question.teacher_status = status;
    question.validated_by_teacher = status === "approved";
    question.validated_by_teacher_comment = comment;
    question.validated_by_teacher_at = new Date();
    question.teacher_reviewed_by = req.user.user_id;
    await question.save();

    // Start clean every time so a repeated or changed decision is applied exactly once
    await removePoints({ category: "question_penalty", "related_entity.entity_id": question._id });
    if (status === "abuse") {
        await applyAbusePenalties(question, { comment, extra, teacherId: req.user.user_id });
    }

    res.status(200).json({
        message: "Teacher validation saved successfully.",
        question,
    });
};
