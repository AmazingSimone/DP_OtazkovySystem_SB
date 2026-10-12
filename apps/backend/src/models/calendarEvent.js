const mongoose = require('mongoose');

const CalendarEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    start: {
      type: Date,
      required: true,
      index: true
    },
    end: {
      type: Date,
      required: true,
      index: true
    },
    allDay: {
      type: Boolean,
      default: false
    },
    color: {
      type: String,
      required: true,
      trim: true
    },
    studentGroup: {
      type: [String],
      default: []
    },
    location: {
      type: String,
      trim: true,
      default: ''
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

CalendarEventSchema.index({ createdBy: 1, start: 1 });

module.exports = mongoose.model('CalendarEvent', CalendarEventSchema);