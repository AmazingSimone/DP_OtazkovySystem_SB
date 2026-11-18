const { throwError } = require("../util/universal");
const Point = require("../models/point");
const Question = require("../models/question");
const User = require("../models/user"); // Assuming you have a User model
const Module = require("../models/modul");
const Project = require("../models/project");
const Test = require("../models/test");
const TestAttempt = require("../models/testAttempt");
const ForumQuestion = require("../models/forumQuestion");

const getPointSubjectId = async (point, caches = {}) => {
    if (point.subject) return point.subject.toString();

    const rel = point.related_entity;
    if (!rel || !rel.entity_type || !rel.entity_id) return null;

    const entityType = rel.entity_type;
    const entityId = rel.entity_id.toString();

    if (entityType === "Question") {
        caches.questionToSubject = caches.questionToSubject || new Map();
        if (caches.questionToSubject.has(entityId)) {
            return caches.questionToSubject.get(entityId);
        }

        const question = await Question.findById(entityId).select("modul");
        if (!question || !question.modul) {
            caches.questionToSubject.set(entityId, null);
            return null;
        }

        const mod = await Module.findById(question.modul).select("subject");
        const subjectId = mod?.subject ? mod.subject.toString() : null;
        caches.questionToSubject.set(entityId, subjectId);
        return subjectId;
    }

    if (entityType === "Project") {
        caches.projectToSubject = caches.projectToSubject || new Map();
        if (caches.projectToSubject.has(entityId)) {
            return caches.projectToSubject.get(entityId);
        }

        const project = await Project.findById(entityId).select("subject");
        const subjectId = project?.subject ? project.subject.toString() : null;
        caches.projectToSubject.set(entityId, subjectId);
        return subjectId;
    }

    if (entityType === "Test") {
        caches.testToSubject = caches.testToSubject || new Map();
        if (caches.testToSubject.has(entityId)) {
            return caches.testToSubject.get(entityId);
        }

        const test = await Test.findById(entityId).select("subject");
        const subjectId = test?.subject ? test.subject.toString() : null;
        caches.testToSubject.set(entityId, subjectId);
        return subjectId;
    }

    if (entityType === "TestAttempt") {
        caches.testAttemptToSubject = caches.testAttemptToSubject || new Map();
        if (caches.testAttemptToSubject.has(entityId)) {
            return caches.testAttemptToSubject.get(entityId);
        }

        const attempt = await TestAttempt.findById(entityId).select("test");
        if (!attempt || !attempt.test) {
            caches.testAttemptToSubject.set(entityId, null);
            return null;
        }

        const test = await Test.findById(attempt.test).select("subject");
        const subjectId = test?.subject ? test.subject.toString() : null;
        caches.testAttemptToSubject.set(entityId, subjectId);
        return subjectId;
    }

    if (entityType === "ForumQuestion") {
        caches.forumToSubject = caches.forumToSubject || new Map();
        if (caches.forumToSubject.has(entityId)) {
            return caches.forumToSubject.get(entityId);
        }

        const forum = await ForumQuestion.findById(entityId).select("modul");
        if (!forum || !forum.modul) {
            caches.forumToSubject.set(entityId, null);
            return null;
        }

        const mod = await Module.findById(forum.modul).select("subject");
        const subjectId = mod?.subject ? mod.subject.toString() : null;
        caches.forumToSubject.set(entityId, subjectId);
        return subjectId;
    }

    return null;
};

/**
 * Get all points for a user (optionally filtered by subject)
 */
exports.getUserPoints = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { subjectId } = req.query;

        const filter = { student: userId };
        if (subjectId) {
            filter.subject = subjectId;
        }

        const points = await Point.find(filter).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: points
        });
    } catch (err) {
        throwError(`Error fetching user points: ${err.message}`, 500);
    }
};

/**
 * Get summary of points by category for a user (optionally filtered by subject)
 */
exports.getUserPointsSummary = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { subjectId } = req.query;

        const filter = { student: userId };
        if (subjectId) {
            filter.subject = subjectId;
        }

        const points = await Point.find(filter);

        // Group and sum points by category
        const summary = {};
        points.forEach(point => {
            if (!summary[point.category]) {
                summary[point.category] = 0;
            }
            summary[point.category] += point.points;
        });

        // Calculate total points
        const totalPoints = points.reduce((sum, point) => sum + point.points, 0);

        res.status(200).json({
            success: true,
            data: {
                summary,
                totalPoints
            }
        });
    } catch (err) {
        throwError(`Error fetching user points summary: ${err.message}`, 500);
    }
};

/**
 * Get points summary for multiple users (optionally filtered by subject)
 */
exports.getUsersPointsSummary = async (req, res) => {
    try {
        const { userIds, subjectId } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return throwError("Valid array of user IDs is required", 400);
        }

        // Fetch all points for users, then apply subject filtering with fallback derivation
        // for legacy points that do not have point.subject filled.
        const allPointsRaw = await Point.find({ student: { $in: userIds } }).sort({ createdAt: -1 });

        let allPoints = allPointsRaw;
        if (subjectId) {
            const subjectIdStr = subjectId.toString();
            const caches = {};

            // Fallback set for legacy points that have neither subject nor resolvable related entity.
            // If a student is assigned to this subject, we treat such points as belonging to it.
            const usersAssignedToSubject = await User.find({
                _id: { $in: userIds },
                assignedSubjects: subjectId,
            }).select("_id");
            const usersAssignedSet = new Set(usersAssignedToSubject.map((u) => u._id.toString()));

            const resolved = await Promise.all(
                allPointsRaw.map(async (point) => {
                    const resolvedSubject = await getPointSubjectId(point, caches);
                    return {
                        point,
                        resolvedSubject,
                    };
                })
            );

            allPoints = resolved
                .filter(({ point, resolvedSubject }) => {
                    const pointSubject = point.subject ? point.subject.toString() : resolvedSubject;
                    if (!pointSubject) {
                        return usersAssignedSet.has(point.student.toString());
                    }
                    return pointSubject === subjectIdStr;
                })
                .map(({ point }) => point);
        }

        // Group points by user
        const userSummaries = {};

        // Initialize summaries for all users
        for (const userId of userIds) {
            userSummaries[userId] = {
                totalPoints: 0,
                summary: {
                    question_creation: 0,
                    question_validation: 0,
                    question_reparation: 0,
                    test_performance: 0,
                    forum_participation: 0,
                    project_work: 0,
                    other: 0
                },
                details: []
            };
        }

        // Process all points
        allPoints.forEach(point => {
            const userId = point.student.toString();

            if (userSummaries[userId]) {
                // Add to total
                userSummaries[userId].totalPoints += point.points;

                // Add to category total
                if (userSummaries[userId].summary[point.category] !== undefined) {
                    userSummaries[userId].summary[point.category] += point.points;
                } else {
                    userSummaries[userId].summary[point.category] = point.points;
                }

                // Add to details array
                userSummaries[userId].details.push({
                    _id: point._id,
                    points: point.points,
                    reason: point.reason,
                    category: point.category,
                    question_id:
                        point.related_entity?.entity_type === "Question"
                            ? point.related_entity?.entity_id
                            : null,
                    related_entity: point.related_entity || null,
                    subject: point.subject || null,
                    createdAt: point.createdAt
                });
            }
        });

        // Get user info to add names to the response
        const users = await User.find({ _id: { $in: userIds } })
            .select('_id name surname email studentNumber');

        // Add user info to the response
        const result = users.map(user => {
            const userId = user._id.toString();
            return {
                user: {
                    _id: userId,
                    name: user.name,
                    surname: user.surname,
                    email: user.email,
                    studentNumber: user.studentNumber
                },
                points: userSummaries[userId]
            };
        });

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        throwError(`Error fetching users points summary: ${err.message}`, 500);
    }
};

/**
 * Award custom points to a user
 */
exports.awardCustomPoints = async (req, res) => {
    try {
        const { studentId, points, reason, category = "other", subjectId } = req.body;

        // Validate input
        if (!studentId || !points || !reason) {
            return throwError("Student ID, teacher ID, points amount, and reason are required", 400);
        }

        if (isNaN(points) || points <= 0) {
            return throwError("Points must be a positive number", 400);
        }

        // Find the student and teacher
        const student = await User.findById(studentId);
        if (!student) {
            return throwError("Student not found", 404);
        }



        // Create the point record
        const point = new Point({
            student: studentId,
            subject: subjectId || null,
            reason,
            points,
            category
        });

        await point.save();

        // Add point to user's points array
        await User.findByIdAndUpdate(
            studentId,
            { $push: { points: point._id } }
        );

        res.status(201).json({
            success: true,
            message: `${points} points awarded to student for ${reason}`,
            data: point
        });

    } catch (err) {
        throwError(`Error awarding custom points: ${err.message}`, 500);
    }
};

/**
 * Update existing point record
 */
exports.updatePoint = async (req, res) => {
    try {
        const { pointId } = req.params;
        const { points, reason } = req.body;

        // Validate input
        if (!pointId) {
            return throwError("Point ID is required", 400);
        }

        // Find the point record
        const point = await Point.findById(pointId);
        if (!point) {
            return throwError("Point record not found", 404);
        }

        // Update fields if provided
        if (points !== undefined) {
            if (isNaN(points)) {
                return throwError("Points must be a number", 400);
            }
            point.points = points;
        }

        if (reason !== undefined) {
            point.reason = reason;
        }

        await point.save();

        res.status(200).json({
            success: true,
            message: "Point record updated successfully",
            data: point
        });

    } catch (err) {
        throwError(`Error updating point: ${err.message}`, 500);
    }
};

/**
 * Delete a point record
 */
exports.deletePoint = async (req, res) => {
    try {
        const { pointId } = req.params;

        // Find and delete the point record
        const point = await Point.findById(pointId);
        if (!point) {
            return throwError("Point record not found", 404);
        }

        // Remove point from user's points array
        await User.findByIdAndUpdate(
            point.student,
            { $pull: { points: pointId } }
        );

        await Point.findByIdAndDelete(pointId);

        res.status(200).json({
            success: true,
            message: "Point record deleted successfully"
        });

    } catch (err) {
        throwError(`Error deleting point: ${err.message}`, 500);
    }
};