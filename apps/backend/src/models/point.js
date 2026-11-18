const mongoose = require("mongoose")

const PointSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
        },
        assigned_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Teacher",
        },
        reason: {
            type: String,
            required: true,
            trim: true,
        },
        points: {
            type: Number,
            required: true,
        },
        category: {
            type: String,
            enum: [
                "question_creation",
                "question_validation",
                "question_reparation",
                "test_performance",
                "forum_participation",
                "project_work",
                "question_penalty", // negative points after a teacher rejects a question as abuse
                "other",
            ],
            default: "other",
        },
        related_entity: {
            entity_type: {
                type: String,
                enum: ["Question", "Test", "TestAttempt", "ForumQuestion", "Project", "Module"],
            },
            entity_id: {
                type: mongoose.Schema.Types.ObjectId,
            },
        },
    },
    {
        timestamps: true,
    },
)

// Indexes
PointSchema.index({ student: 1, createdAt: -1 })
PointSchema.index({ student: 1, subject: 1, createdAt: -1 })
PointSchema.index({ assigned_by: 1 })
PointSchema.index({ category: 1 })
PointSchema.index({ subject: 1 })

module.exports = mongoose.model("Point", PointSchema)
