/**
 * Weeks 2 and 3 of the question flow: students review the questions they were dealt,
 * then authors answer the review and publish.
 */
const { getCurrentPhase } = require("../util/modulePhase");
const { awardPoint, shortText } = require("../services/questionFlow");
const { syncModule } = require("../services/questionReview");
const { reviewerView, authorView } = require("../services/questionViews");

const Question = require("../models/question");
const QuestionAssignment = require("../models/questionAssignment");
const Module = require("../models/modul");
const Point = require("../models/point");

const deny = (res, status, message) => res.status(status).json({ message });

/**
 * GET /question/assignments/:userId/:modulId
 * The questions a student has to review in a module, always the same ones in the same order.
 * Also brings the module up to date first, so the deal exists from the first second of week 2.
 */
exports.getQuestionAssignmentsByUser = async (req, res) => {
    const { userId, modulId } = req.params;
    if (!req.user.is_teacher && String(userId) !== String(req.user.user_id)) {
        return deny(res, 403, "Môžeš vidieť iba vlastné priradené otázky.");
    }

    const modul = await Module.findById(modulId);
    if (!modul) return deny(res, 404, "Modul neexistuje.");
    await syncModule(modul);

    const assignments = await QuestionAssignment.find({ assignedTo: userId, modul: modulId, weekNumber: 2 })
        .sort({ assignedAt: 1, _id: 1 })
        .populate("question");

    const data = assignments
        .filter((a) => a.question)
        .map((a) => ({
            ...a.toObject(),
            question: req.user.is_teacher ? a.question : reviewerView(a.question),
        }));

    const automaticPoints = await Point.countDocuments({
        student: userId,
        category: "question_validation",
        "related_entity.entity_type": "Module",
        "related_entity.entity_id": modul._id,
    });

    res.status(200).json({ success: true, data, automaticPoints });
};

/**
 * POST /question/:id/validate   { valid: boolean, comment?: string }
 * A student reviews a question that was dealt to them. Only during week 2; the verdict can be
 * changed until the week ends, but the point is awarded once. "Fault" needs a comment.
 */
exports.reviewQuestion = async (req, res) => {
    const { valid } = req.body;
    const comment = typeof req.body.comment === "string" ? req.body.comment.trim() : "";

    if (typeof valid !== "boolean") return deny(res, 400, "Valid field must be a boolean.");

    const question = await Question.findById(req.params.id);
    if (!question) return deny(res, 404, "Otázka neexistuje.");

    const reviewerId = req.user.user_id;
    const assignment = await QuestionAssignment.findOne({ question: question._id, assignedTo: reviewerId });
    if (req.user.is_teacher || !assignment) {
        return deny(res, 403, "Túto otázku nemáš priradenú na recenziu.");
    }

    const modul = await Module.findById(question.modul);
    if (getCurrentPhase(modul) !== 2) {
        return deny(res, 403, "Recenzovať je možné iba počas 2. týždňa modulu.");
    }
    if (!valid && !comment) {
        return deny(res, 400, "Pri chybnej otázke je potrebné napísať komentár.");
    }

    const now = new Date();
    assignment.validated = true;
    assignment.validation_result = valid;
    assignment.validation_comment = comment;
    assignment.validated_at = now;

    if (!assignment.pointsAwarded) {
        await awardPoint({
            student: reviewerId,
            subject: modul.subject,
            category: "question_validation",
            reason: `Question reviewed: ${shortText(question.text)}`,
            entityId: question._id,
        });
        assignment.pointsAwarded = true;
    }
    await assignment.save();

    // One reviewer per question, so the question carries that single review for its author.
    question.validated = valid;
    question.validation_comment = comment;
    question.validated_at = now;
    question.validated_by = reviewerId;
    question.review_tag = null;
    await question.save();

    res.status(200).json({
        message: "Question validation saved successfully.",
        question: reviewerView(question),
        assignment,
    });
};

/**
 * Loads a question for one of its author's week 3 actions and checks the rules they share.
 * Sends the refusal itself and returns null when the action is not allowed.
 */
const loadOwnQuestionInWeek3 = async (req, res) => {
    let question = await Question.findById(req.params.id);
    if (!question) {
        deny(res, 404, "Otázka neexistuje.");
        return null;
    }
    if (req.user.is_teacher || String(question.createdBy) !== String(req.user.user_id)) {
        deny(res, 403, "Toto môže urobiť iba autor otázky.");
        return null;
    }

    const modul = await Module.findById(question.modul);
    // Makes sure an unreviewed question already has its automatic review
    await syncModule(modul);
    question = await Question.findById(question._id);

    if (getCurrentPhase(modul) !== 3) {
        deny(res, 403, "Toto je možné iba počas 3. týždňa modulu.");
        return null;
    }
    return { question, modul };
};

/**
 * POST /question/:id/respond   { agreed: boolean, comment?: string }
 * Week 3: the author says whether the review was right. No point for this step.
 */
exports.respondToReview = async (req, res) => {
    const { agreed } = req.body;
    const comment = typeof req.body.comment === "string" ? req.body.comment.trim() : "";
    if (typeof agreed !== "boolean") return deny(res, 400, "Agreed field must be a boolean.");

    const loaded = await loadOwnQuestionInWeek3(req, res);
    if (!loaded) return;
    const { question } = loaded;

    if (question.published) return deny(res, 403, "Publikovanú otázku už nie je možné meniť.");
    if (!question.validated_at) return deny(res, 400, "Otázka ešte nemá recenziu.");

    question.user_agreement = { agreed, comment, responded_at: new Date() };
    await question.save();

    res.status(200).json({
        message: "Response to validation saved successfully.",
        question: authorView(question, 3),
    });
};

/**
 * POST /question/:id/publish
 * Week 3: the author sends the question to the teacher. This is the only step of week 3
 * that earns a point, and it locks the question.
 */
exports.publishQuestion = async (req, res) => {
    const loaded = await loadOwnQuestionInWeek3(req, res);
    if (!loaded) return;
    const { question, modul } = loaded;

    if (question.published) return deny(res, 409, "Otázka je už publikovaná.");
    if (!question.validated_at) return deny(res, 400, "Otázka ešte nemá recenziu.");
    if (!question.user_agreement?.responded_at) {
        return deny(res, 400, "Najprv sa vyjadri k recenzii, potom môžeš otázku publikovať.");
    }

    question.published = true;
    question.published_at = new Date();
    await awardPoint({
        student: question.createdBy,
        subject: modul.subject,
        category: "question_reparation",
        reason: `Question published: ${shortText(question.text)}`,
        entityId: question._id,
    });
    question.pointsAwarded.reparation = true;
    await question.save();

    res.status(200).json({
        message: "Question published.",
        question: authorView(question, 3),
    });
};

/**
 * POST /question/assignments/bulk/:modulId
 * Kept for older clients that used to trigger the deal from the browser. It now only asks the
 * server to bring the module up to date, which does nothing if that already happened.
 */
exports.syncModuleNow = async (req, res) => {
    const modul = await Module.findById(req.params.modulId);
    if (!modul) return deny(res, 404, "Modul neexistuje.");

    await syncModule(modul);
    const fresh = await Module.findById(modul._id).select("review_dealt_at review_closed_at");

    res.status(200).json({
        success: true,
        message: "Module is up to date",
        review_dealt_at: fresh.review_dealt_at,
        review_closed_at: fresh.review_closed_at,
    });
};
