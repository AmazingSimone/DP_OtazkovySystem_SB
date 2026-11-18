/**
 * Server-side progress of the question flow.
 *
 * Two things happen exactly once per module, driven by the clock and not by any page visit:
 *   - at the start of week 2 the reviews are dealt (dealModuleReviews)
 *   - at the start of week 3 every question still without a review gets an automatic one
 *     (closeModuleReviews), so its author is never blocked by somebody else
 *
 * Both claim the module with an atomic update first, so concurrent triggers cannot run twice.
 */
const Module = require("../models/modul");
const Question = require("../models/question");
const QuestionAssignment = require("../models/questionAssignment");
const User = require("../models/user");
const Subject = require("../models/subject");
const { getCurrentPhase, PHASE_NOT_STARTED, PHASE_FINISHED } = require("../util/modulePhase");
const { dealReviews } = require("./reviewDeal");
const { REVIEWS_PER_STUDENT, awardPoint } = require("./questionFlow");

// Shown to the author in place of a student's review comment
const AUTOMATIC_REVIEW_MESSAGES = {
    missing_reviewer:
        "Tvoja otázka nebola skontrolovaná, pretože nebol dostatok recenzentov. Prosím, skontroluj ju znova.",
    reviewer_no_response:
        "Tvoja otázka nebola skontrolovaná, pretože priradený recenzent ju neohodnotil. Prosím, skontroluj ju znova.",
};

/** Questions matching `filter` that were written by students (teachers also create questions). */
const studentQuestions = async (filter) => {
    const questions = await Question.find(filter).select("_id createdBy");
    const authorIds = [...new Set(questions.map((q) => String(q.createdBy)))];
    const studentIds = new Set((await User.find({ _id: { $in: authorIds } }).distinct("_id")).map(String));
    return questions.filter((q) => studentIds.has(String(q.createdBy)));
};

/** Active students of the subject, whichever side of the link records them. */
const activeStudents = async (subjectId) => {
    const subject = await Subject.findById(subjectId).select("assigned_students");
    return User.find({
        isActive: true,
        $or: [{ assignedSubjects: subjectId }, { _id: { $in: subject?.assigned_students || [] } }],
    })
        .select("_id")
        .sort({ _id: 1 });
};

/** Gives questions that nobody reviewed an automatic "fault" review with a tag and a message. */
const markAutomaticReview = async (questionIds, tag, now) => {
    if (questionIds.length === 0) return;
    await Question.updateMany(
        { _id: { $in: questionIds }, validated_at: null },
        {
            $set: {
                validated: false,
                validated_by: null,
                validated_at: now,
                validation_comment: AUTOMATIC_REVIEW_MESSAGES[tag],
                review_tag: tag,
            },
        }
    );
};

/**
 * Start of week 2: every active student gets up to two questions written by others.
 * Review slots without a question become automatic points; questions without a reviewer
 * get an automatic review.
 */
const dealModuleReviews = async (modulId, { now = new Date(), rng = Math.random } = {}) => {
    const modul = await Module.findOneAndUpdate(
        { _id: modulId, review_dealt_at: null },
        { $set: { review_dealt_at: now } },
        { new: true }
    );
    if (!modul) return { dealt: false };

    // Assignments that already exist come from the previous version of the system; keep them.
    if (await QuestionAssignment.exists({ modul: modul._id })) return { dealt: false, legacy: true };

    const questions = await studentQuestions({ modul: modul._id });
    const reviewers = await activeStudents(modul.subject);

    const deal = dealReviews({
        questions: questions.map((q) => ({ id: String(q._id), author: String(q.createdBy) })),
        reviewers: reviewers.map((r) => String(r._id)),
        perReviewer: REVIEWS_PER_STUDENT,
        rng,
    });

    if (deal.assignments.length > 0) {
        await QuestionAssignment.insertMany(
            deal.assignments.map((a, i) => ({
                question: a.question,
                assignedTo: a.reviewer,
                modul: modul._id,
                weekNumber: 2,
                // distinct timestamps give every student a fixed order of their questions
                assignedAt: new Date(now.getTime() + i),
            }))
        );
    }

    for (const [reviewer, missing] of Object.entries(deal.autoPoints)) {
        for (let i = 1; i <= missing; i++) {
            await awardPoint({
                student: reviewer,
                subject: modul.subject,
                category: "question_validation",
                reason: `Automatic point - no question available for review (${i}/${missing})`,
                entityType: "Module",
                entityId: modul._id,
            });
        }
    }

    await markAutomaticReview(deal.unreviewed, "missing_reviewer", now);

    return {
        dealt: true,
        assignments: deal.assignments.length,
        automaticPoints: Object.values(deal.autoPoints).reduce((sum, n) => sum + n, 0),
        unreviewed: deal.unreviewed.length,
    };
};

/**
 * Start of week 3: reviewing is over. A question that was assigned but not reviewed is tagged
 * reviewer_no_response; one that never had a reviewer is tagged missing_reviewer.
 */
const closeModuleReviews = async (modulId, { now = new Date() } = {}) => {
    const modul = await Module.findOneAndUpdate(
        { _id: modulId, review_closed_at: null },
        { $set: { review_closed_at: now } },
        { new: true }
    );
    if (!modul) return { closed: false };

    const open = (await studentQuestions({ modul: modul._id, validated_at: null })).map((q) => q._id);
    const assigned = new Set(
        (await QuestionAssignment.find({ question: { $in: open } }).distinct("question")).map(String)
    );

    const noResponse = open.filter((id) => assigned.has(String(id)));
    const noReviewer = open.filter((id) => !assigned.has(String(id)));
    await markAutomaticReview(noResponse, "reviewer_no_response", now);
    await markAutomaticReview(noReviewer, "missing_reviewer", now);

    return { closed: true, noResponse: noResponse.length, noReviewer: noReviewer.length };
};

/** Brings one module up to date with the clock. Safe to call at any time, any number of times. */
const syncModule = async (modul, now = new Date()) => {
    if (!modul || (modul.review_dealt_at && modul.review_closed_at)) return;

    const phase = getCurrentPhase(modul, now);
    if (phase === PHASE_NOT_STARTED || phase === 1) return;

    if (phase === 2) {
        if (!modul.review_dealt_at) await dealModuleReviews(modul._id, { now });
        return;
    }

    if (phase === 3) {
        // If week 2 was missed entirely there is nothing left to deal; closing tags the questions.
        if (!modul.review_dealt_at) {
            await Module.updateOne({ _id: modul._id, review_dealt_at: null }, { $set: { review_dealt_at: now } });
        }
        if (!modul.review_closed_at) await closeModuleReviews(modul._id, { now });
        return;
    }

    if (phase === PHASE_FINISHED) {
        // The module ended without passing through here (for example it predates this flow).
        // Nobody can act on it any more, so only record that it needs no further work.
        await Module.updateOne(
            { _id: modul._id },
            {
                $set: {
                    review_dealt_at: modul.review_dealt_at || now,
                    review_closed_at: modul.review_closed_at || now,
                },
            }
        );
    }
};

/** Brings every started module that still has pending work up to date. Used by the scheduler. */
const syncDueModules = async (now = new Date()) => {
    const modules = await Module.find({
        date_start: { $lte: now },
        $or: [{ review_dealt_at: null }, { review_closed_at: null }],
    });

    for (const modul of modules) {
        try {
            await syncModule(modul, now);
        } catch (err) {
            console.error(`[Question flow] Could not update module ${modul._id}: ${err.message}`);
        }
    }
};

module.exports = {
    AUTOMATIC_REVIEW_MESSAGES,
    dealModuleReviews,
    closeModuleReviews,
    syncModule,
    syncDueModules,
};
