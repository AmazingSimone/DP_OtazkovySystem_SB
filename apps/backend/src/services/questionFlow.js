/**
 * Shared rules and database helpers for the three-week question flow.
 *
 *   week 1: each student creates questions            (1 point per question)
 *   week 2: each student reviews assigned questions   (1 point per review or empty slot)
 *   week 3: each author answers the review, publishes (1 point per published question)
 */
const Point = require("../models/point");
const User = require("../models/user");
const Subject = require("../models/subject");

const QUESTIONS_PER_STUDENT = 2;
const REVIEWS_PER_STUDENT = 2;

/** A student belongs to a subject if either side of the link says so. */
const isEnrolled = async (userId, subjectId) => {
    const [viaUser, viaSubject] = await Promise.all([
        User.exists({ _id: userId, assignedSubjects: subjectId }),
        Subject.exists({ _id: subjectId, assigned_students: userId }),
    ]);
    return Boolean(viaUser || viaSubject);
};

/** Creates a point record and links it from the student. `points` may be negative. */
const awardPoint = async ({
    student,
    subject = null,
    points = 1,
    category,
    reason,
    entityType = "Question",
    entityId = null,
    assignedBy = undefined,
}) => {
    const point = await Point.create({
        student,
        subject,
        points,
        category,
        reason,
        assigned_by: assignedBy,
        related_entity: entityId ? { entity_type: entityType, entity_id: entityId } : undefined,
    });
    await User.findByIdAndUpdate(student, { $push: { points: point._id } });
    return point;
};

/** Deletes the matching point records and unlinks them from their students. */
const removePoints = async (filter) => {
    const points = await Point.find(filter).select("_id student");
    if (points.length === 0) return 0;

    await Promise.all(
        points.map((p) => User.updateOne({ _id: p.student }, { $pull: { points: p._id } }))
    );
    await Point.deleteMany({ _id: { $in: points.map((p) => p._id) } });
    return points.length;
};

const shortText = (text) => (text.length > 50 ? `${text.substring(0, 50)}...` : text);

module.exports = {
    QUESTIONS_PER_STUDENT,
    REVIEWS_PER_STUDENT,
    isEnrolled,
    awardPoint,
    removePoints,
    shortText,
};
