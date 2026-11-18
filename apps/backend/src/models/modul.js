const mongoose = require("mongoose")
const { getPhases, getCurrentPhase } = require("../util/modulePhase")

const ModuleSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: { type: String, trim: true },
        week_number: {
            type: Number,
            required: true,
            min: 1,
        }, // Week 1, 2, 3, etc.
        date_start: {
            type: Date,
            required: true,
        },
        date_end: {
            type: Date,
            required: true,
        },
        week2_start: { type: Date, default: null },
        week3_start: { type: Date, default: null },
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
            required: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Teacher",
            required: true,
        },
        is_active: { type: Boolean, default: true },
        required_questions_per_user: { type: Number, default: 2 }, // Configurable per module
        // Question flow bookkeeping, each set exactly once by the server:
        review_dealt_at: { type: Date, default: null }, // week 2 reviews were dealt
        review_closed_at: { type: Date, default: null }, // week 3 started, unanswered reviews were closed
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
)

// Indexes
ModuleSchema.index({ subject: 1, week_number: 1 })
ModuleSchema.index({ date_start: 1, date_end: 1 })
ModuleSchema.index({ createdBy: 1 })

// Virtual for duration
ModuleSchema.virtual("duration_days").get(function () {
    return Math.ceil((this.date_end - this.date_start) / (1000 * 60 * 60 * 24))
})

// Phases of the question flow, computed on the server so every client agrees on them
ModuleSchema.virtual("phases").get(function () {
    return getPhases(this)
})
ModuleSchema.virtual("current_phase").get(function () {
    return getCurrentPhase(this)
})

// Virtual for questions
ModuleSchema.virtual("questions", {
    ref: "Question",
    localField: "_id",
    foreignField: "modul",
})

// Virtual for validated questions
ModuleSchema.virtual("validatedQuestions", {
    ref: "Question",
    localField: "_id",
    foreignField: "modul",
    match: { validated: true },
})

module.exports = mongoose.model("Module", ModuleSchema)
