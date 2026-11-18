/**
 * Handlers that change questions as part of the three-week flow.
 * The rules live here on the server; the screens only reflect them.
 */
const { validate, validated } = require("../util/validation");
const { createQuestionSchema, editQuestionSchema } = require("../schemas/question.schema");
const { getCurrentPhase } = require("../util/modulePhase");
const {
    QUESTIONS_PER_STUDENT,
    isEnrolled,
    awardPoint,
    removePoints,
    shortText,
} = require("../services/questionFlow");

const Question = require("../models/question");
const Module = require("../models/modul");
const User = require("../models/user");

const isOwner = (question, req) => String(question.createdBy) === String(req.user.user_id);
const deny = (res, status, message) => res.status(status).json({ message });

const hasFourDifferentOptions = (options) => {
    const texts = ["a", "b", "c", "d"].map((key) => String(options?.[key] ?? "").trim().toLowerCase());
    return texts.every(Boolean) && new Set(texts).size === 4;
};

/**
 * POST /question
 * Students: only during week 1 of a module in their subject, at most two per module,
 * always recorded under their own name. One point per question.
 * Teachers: no restrictions and no points.
 */
exports.createQuestion = [
    validate(createQuestionSchema),
    async (req, res) => {
        const data = validated(req);

        const modul = await Module.findById(data.modul);
        if (!modul) return deny(res, 404, "Modul neexistuje.");

        if (!hasFourDifferentOptions(data.options)) {
            return deny(res, 400, "Otázka musí mať štyri rôzne odpovede.");
        }

        if (req.user.is_teacher) {
            const question = await Question.create({
                ...data,
                createdBy: data.createdBy || req.user.user_id,
                teacher_status: data.validated_by_teacher ? "approved" : "pending",
            });
            return res.status(201).json(question);
        }

        const studentId = req.user.user_id;
        if (!(await isEnrolled(studentId, modul.subject))) {
            return deny(res, 403, "Nie si priradený k tomuto predmetu.");
        }
        if (getCurrentPhase(modul) !== 1) {
            return deny(res, 403, "Otázky je možné pridávať iba počas 1. týždňa modulu.");
        }
        const existing = await Question.countDocuments({ modul: modul._id, createdBy: studentId });
        if (existing >= QUESTIONS_PER_STUDENT) {
            return deny(res, 400, `V jednom module môžeš vytvoriť najviac ${QUESTIONS_PER_STUDENT} otázky.`);
        }

        const author = await User.findById(studentId).select("name surname");
        const question = await Question.create({
            text: data.text,
            options: data.options,
            correct: data.correct,
            modul: modul._id,
            createdBy: studentId,
            createdByName: data.createdByName || `${author.name} ${author.surname}`.trim(),
        });

        await awardPoint({
            student: studentId,
            subject: modul.subject,
            category: "question_creation",
            reason: `Question created: ${shortText(question.text)}`,
            entityId: question._id,
        });
        question.pointsAwarded.creation = true;
        await question.save();

        res.status(201).json(question);
    },
];

/**
 * PUT /question/:id  (text, options, correct only)
 * Students may change their own question during week 1. In week 3 they may change it only
 * if its review says "fault" and it is not published yet; the original is kept for the teacher.
 */
exports.editQuestion = [
    validate(editQuestionSchema),
    async (req, res) => {
        const data = validated(req);
        const question = await Question.findById(req.params.id);
        if (!question) return deny(res, 404, "Otázka neexistuje.");

        if (!req.user.is_teacher) {
            if (!isOwner(question, req)) return deny(res, 403, "Môžeš upravovať iba vlastné otázky.");

            const modul = await Module.findById(question.modul);
            const phase = getCurrentPhase(modul);

            if (phase === 3) {
                if (question.published) return deny(res, 403, "Publikovanú otázku už nie je možné upraviť.");
                const reviewedAsFault = Boolean(question.validated_at) && question.validated === false;
                if (!reviewedAsFault) {
                    return deny(res, 403, "Upraviť je možné iba otázku, ktorú recenzia označila ako chybnú.");
                }
                if (!question.original) {
                    question.original = {
                        text: question.text,
                        options: { ...question.options },
                        correct: question.correct,
                        saved_at: new Date(),
                    };
                }
            } else if (phase !== 1) {
                return deny(res, 403, "Otázku teraz nie je možné upraviť.");
            }
        }

        if (data.text !== undefined) question.text = data.text;
        if (data.correct !== undefined) question.correct = data.correct;
        if (data.options !== undefined) {
            const merged = { a: question.options.a, b: question.options.b, c: question.options.c, d: question.options.d, ...data.options };
            if (!hasFourDifferentOptions(merged)) {
                return deny(res, 400, "Otázka musí mať štyri rôzne odpovede.");
            }
            question.options = merged;
        }
        await question.save();

        res.status(200).json(question);
    },
];

/**
 * DELETE /question/:id
 * Students may delete their own question during week 1; the creation point goes with it.
 */
exports.deleteQuestion = async (req, res) => {
    const question = await Question.findById(req.params.id);
    if (!question) return deny(res, 404, "Otázka neexistuje.");

    if (req.user.is_teacher) {
        await question.deleteOne();
        return res.status(200).json({ message: "Question deleted." });
    }

    if (!isOwner(question, req)) return deny(res, 403, "Môžeš zmazať iba vlastné otázky.");
    const modul = await Module.findById(question.modul);
    if (getCurrentPhase(modul) !== 1) {
        return deny(res, 403, "Otázku je možné zmazať iba počas 1. týždňa modulu.");
    }

    await question.deleteOne();
    // Otherwise a student could collect points by creating and deleting questions in a loop
    await removePoints({
        student: question.createdBy,
        category: "question_creation",
        "related_entity.entity_id": question._id,
    });

    res.status(200).json({ message: "Question deleted." });
};
