const CalendarEvent = require('../models/calendarEvent');
const Teacher = require('../models/teacher');
const { validate, validated } = require('../util/validation');
const {
  createCalendarEventSchema,
  updateCalendarEventSchema
} = require('../schemas/calendarEventRequest.schema');

const isTeacherOwnerOrAdmin = async (userId, ownerId) => {
  const teacher = await Teacher.findById(userId).select('isAdmin');

  if (!teacher) {
    return false;
  }

  return teacher.isAdmin || String(userId) === String(ownerId);
};

const startOfDay = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
};

const subtractOneDay = (value) => {
  const date = new Date(value);
  date.setDate(date.getDate() - 1);
  return date;
};

const combineDateAndTime = (dateValue, timeValue) => {
  const date = new Date(dateValue);
  const time = new Date(timeValue);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.getHours(),
    time.getMinutes(),
    0,
    0
  );
};

const normalizeEventDates = (data) => {
  if (data.allDay) {
    const start = startOfDay(data.date);
    const endDate = startOfDay(data.endDate || data.date);

    if (endDate < start) {
      throw Object.assign(new Error('Datum do musi byt rovnaky alebo neskorsi ako datum od'), {
        statusCode: 400
      });
    }

    const inclusiveEnd = new Date(endDate);
    inclusiveEnd.setDate(inclusiveEnd.getDate() + 1);

    return {
      start,
      end: inclusiveEnd
    };
  }

  const start = combineDateAndTime(data.date, data.startTime);
  const end = combineDateAndTime(data.date, data.endTime);

  if (end <= start) {
    throw Object.assign(new Error('Koncovy cas musi byt neskor ako zaciatocny cas'), {
      statusCode: 400
    });
  }

  return {
    start,
    end
  };
};

const serializeEvent = (event) => ({
  ...event.toObject(),
  id: event._id,
  createdBy: event.createdBy
});

const createCalendarEvent = [
  validate(createCalendarEventSchema),
  async (req, res) => {
    try {
      const data = validated(req);
      const teacher = await Teacher.findById(req.user.user_id).select('_id');

      if (!teacher) {
        return res.status(403).json({
          success: false,
          message: 'Only teachers can create calendar events'
        });
      }

      const { start, end } = normalizeEventDates(data);

      const calendarEvent = new CalendarEvent({
        title: data.title.trim(),
        start,
        end,
        allDay: data.allDay,
        color: data.color.trim(),
        studentGroup: data.studentGroup || '',
        location: data.location || '',
        description: data.description || '',
        createdBy: req.user.user_id
      });

      await calendarEvent.save();
      await calendarEvent.populate('createdBy', 'name surname email isAdmin');

      return res.status(201).json({
        success: true,
        data: serializeEvent(calendarEvent)
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error creating calendar event'
      });
    }
  }
];

const updateCalendarEvent = [
  validate(updateCalendarEventSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const data = validated(req);
      const event = await CalendarEvent.findById(id);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Calendar event not found'
        });
      }

      const canEdit = await isTeacherOwnerOrAdmin(req.user.user_id, event.createdBy);

      if (!canEdit) {
        return res.status(403).json({
          success: false,
          message: 'You are not allowed to edit this event'
        });
      }

      const nextAllDay = data.allDay !== undefined ? data.allDay : event.allDay;
      const normalizedSource = {
        allDay: nextAllDay,
        date: data.date || event.start,
        endDate: data.endDate || (nextAllDay ? subtractOneDay(event.end) : event.end),
        startTime: data.startTime || event.start,
        endTime: data.endTime || event.end
      };

      const dates = normalizeEventDates(normalizedSource);

      if (data.title !== undefined) event.title = data.title.trim();
      event.start = dates.start;
      event.end = dates.end;
      if (data.allDay !== undefined) event.allDay = data.allDay;
      if (data.color !== undefined) event.color = data.color.trim();
      if (data.studentGroup !== undefined) event.studentGroup = data.studentGroup || '';
      if (data.location !== undefined) event.location = data.location || '';
      if (data.description !== undefined) event.description = data.description || '';

      await event.save();
      await event.populate('createdBy', 'name surname email isAdmin');

      return res.status(200).json({
        success: true,
        data: serializeEvent(event)
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error updating calendar event'
      });
    }
  }
];

const getCalendarEvents = async (req, res) => {
  try {
    const query = {};

    if (req.query.mine === 'true') {
      query.createdBy = req.user.user_id;
    }

    if (req.query.createdBy) {
      query.createdBy = req.query.createdBy;
    }

    const events = await CalendarEvent.find(query)
      .populate('createdBy', 'name surname email isAdmin')
      .sort({ start: 1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: events.map(serializeEvent)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching calendar events',
      error: error.message
    });
  }
};

const getMyCalendarEvents = async (req, res) => {
  try {
    const events = await CalendarEvent.find({ createdBy: req.user.user_id })
      .populate('createdBy', 'name surname email isAdmin')
      .sort({ start: 1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: events.map(serializeEvent)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching calendar events',
      error: error.message
    });
  }
};

const getCalendarEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await CalendarEvent.findById(id).populate('createdBy', 'name surname email isAdmin');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: serializeEvent(event)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching calendar event',
      error: error.message
    });
  }
};

const deleteCalendarEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await CalendarEvent.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found'
      });
    }

    const canDelete = await isTeacherOwnerOrAdmin(req.user.user_id, event.createdBy);

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to delete this event'
      });
    }

    await event.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Calendar event deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting calendar event',
      error: error.message
    });
  }
};

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  getCalendarEvents,
  getMyCalendarEvents,
  getCalendarEventById,
  deleteCalendarEvent
};