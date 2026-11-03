const CalendarEvent = require("../models/calendarEvent");
const Teacher = require("../models/teacher");
const User = require("../models/user");
const { validate, validated } = require("../util/validation");
const {
  createCalendarEventSchema,
  updateCalendarEventSchema,
} = require("../schemas/calendarEventRequest.schema");

const isEventOwnerOrAdmin = async (userId, ownerId) => {
  const [teacher, user] = await Promise.all([
    Teacher.findById(userId).select("isAdmin"),
    User.findById(userId).select("isAdmin"),
  ]);

  const isAdmin = teacher?.isAdmin === true || user?.isAdmin === true;

  return isAdmin || String(userId) === String(ownerId);
};

const canViewCalendarEvent = ({
  event,
  userId,
  isTeacherOrAdmin,
  userGroupNumber,
}) => {
  if (!event) {
    return false;
  }

  if (String(event.createdBy) === String(userId)) {
    return true;
  }

  if (event.isPrivate) {
    return false;
  }

  if (isTeacherOrAdmin) {
    return true;
  }

  if (!userGroupNumber) {
    return false;
  }

  return Array.isArray(event.studentGroup)
    ? event.studentGroup.length === 0 ||
        event.studentGroup.includes(userGroupNumber)
    : false;
};

const startOfDay = (value) => {
  // Parse YYYY-MM-DD format or ISO string
  let date;
  if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Simple date string like "2026-10-21" - parse as UTC
    date = new Date(value + "T00:00:00.000Z");
  } else {
    // ISO string or Date object
    date = new Date(value);
    // Use local date components
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    date = new Date(year, month, day, 0, 0, 0, 0);
  }
  return date;
};

const subtractOneDay = (value) => {
  let date;
  if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    date = new Date(value + "T00:00:00.000Z");
  } else {
    date = new Date(value);
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    date = new Date(year, month, day, 0, 0, 0, 0);
  }
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
    0,
  );
};

const normalizeEventDates = (data) => {
  if (data.allDay) {
    const start = startOfDay(data.date);
    const endDate = startOfDay(data.endDate || data.date);

    if (endDate < start) {
      throw Object.assign(
        new Error("Datum do musi byt rovnaky alebo neskorsi ako datum od"),
        {
          statusCode: 400,
        },
      );
    }

    // For all-day events, end date should be the day AFTER the last day
    const inclusiveEnd = new Date(endDate);
    inclusiveEnd.setUTCDate(inclusiveEnd.getUTCDate() + 1);

    return {
      start,
      end: inclusiveEnd,
    };
  }

  const start = combineDateAndTime(data.date, data.startTime);
  const end = combineDateAndTime(data.date, data.endTime);

  if (end <= start) {
    throw Object.assign(
      new Error("Koncovy cas musi byt neskor ako zaciatocny cas"),
      {
        statusCode: 400,
      },
    );
  }

  return {
    start,
    end,
  };
};

const serializeEvent = (event) => ({
  ...event.toObject(),
  id: event._id,
  createdBy: event.createdBy,
});

const createCalendarEvent = [
  validate(createCalendarEventSchema),
  async (req, res) => {
    try {
      const data = validated(req);
      const [teacher, user] = await Promise.all([
        Teacher.findById(req.user.user_id).select("_id isAdmin"),
        User.findById(req.user.user_id).select("_id isAdmin"),
      ]);

      if (!teacher && !user) {
        return res.status(403).json({
          success: false,
          message: "Not allowed to create calendar events",
        });
      }

      const { start, end } = normalizeEventDates(data);
      const isTeacherOrAdmin =
        teacher?.isAdmin === true || user?.isAdmin === true || !!teacher;
      const isPrivate =
        data.isPrivate !== undefined ? data.isPrivate : !isTeacherOrAdmin;

      const calendarEvent = new CalendarEvent({
        title: data.title.trim(),
        start,
        end,
        allDay: data.allDay,
        color: data.color.trim(),
        studentGroup: Array.isArray(data.studentGroup) ? data.studentGroup : [],
        location: data.location || "",
        description: data.description || "",
        isPrivate,
        createdBy: req.user.user_id,
      });

      await calendarEvent.save();

      return res.status(201).json({
        success: true,
        data: serializeEvent(calendarEvent),
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Error creating calendar event",
      });
    }
  },
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
          message: "Calendar event not found",
        });
      }

      const canEdit = await isEventOwnerOrAdmin(
        req.user.user_id,
        event.createdBy,
      );

      if (!canEdit) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to edit this event",
        });
      }

      const nextAllDay = data.allDay !== undefined ? data.allDay : event.allDay;
      const normalizedSource = {
        allDay: nextAllDay,
        date: data.date || event.start,
        endDate:
          data.endDate || (nextAllDay ? subtractOneDay(event.end) : event.end),
        startTime: data.startTime || event.start,
        endTime: data.endTime || event.end,
      };

      const dates = normalizeEventDates(normalizedSource);

      if (data.title !== undefined) event.title = data.title.trim();
      event.start = dates.start;
      event.end = dates.end;
      if (data.allDay !== undefined) event.allDay = data.allDay;
      if (data.color !== undefined) event.color = data.color.trim();
      if (data.studentGroup !== undefined)
        event.studentGroup = Array.isArray(data.studentGroup)
          ? data.studentGroup
          : [];
      if (data.location !== undefined) event.location = data.location || "";
      if (data.description !== undefined)
        event.description = data.description || "";
      if (data.isPrivate !== undefined) event.isPrivate = data.isPrivate;

      await event.save();

      return res.status(200).json({
        success: true,
        data: serializeEvent(event),
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Error updating calendar event",
      });
    }
  },
];

const findCalendarEventsForUser = async (userId, mine = false) => {
  const [currentUser, currentTeacher] = await Promise.all([
    User.findById(userId).select("_id groupNumber isAdmin"),
    Teacher.findById(userId).select("_id isAdmin"),
  ]);

  // Používateľ nemusí existovať ani v jednej kolekcii.
  if (!currentUser && !currentTeacher) {
    return null;
  }

  let query;

  if (mine) {
    query = { createdBy: userId };
  } else {
    const isTeacherOrAdmin =
      Boolean(currentTeacher) || currentUser?.isAdmin === true;

    if (isTeacherOrAdmin) {
      query = {
        $or: [{ isPrivate: { $ne: true } }, { createdBy: userId }],
      };
    } else {
      const userGroupNumber = currentUser?.groupNumber;

      query = {
        $or: [
          { createdBy: userId },
          {
            isPrivate: { $ne: true },
            $or: [
              { studentGroup: { $size: 0 } },
              ...(userGroupNumber ? [{ studentGroup: userGroupNumber }] : []),
            ],
          },
        ],
      };
    }
  }

  return CalendarEvent.find(query).sort({
    start: 1,
    createdAt: 1,
  });
};

const getCalendarEvents = async (req, res) => {
  try {
    const events = await findCalendarEventsForUser(
      req.user.user_id,
      req.query.mine === "true",
    );

    if (!events) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: events.map(serializeEvent),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching calendar events",
      error: error.message,
    });
  }
};

const getMyCalendarEvents = async (req, res) => {
  req.query.mine = "true";
  return getCalendarEvents(req, res);
};

const getCalendarEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await CalendarEvent.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Calendar event not found",
      });
    }

    const [currentUser, currentTeacher] = await Promise.all([
      User.findById(req.user.user_id).select("_id groupNumber isAdmin"),
      Teacher.findById(req.user.user_id).select("_id isAdmin"),
    ]);

    const isTeacherOrAdmin = currentTeacher || currentUser?.isAdmin === true;
    const userGroupNumber = currentUser?.groupNumber || null;

    if (
      !canViewCalendarEvent({
        event,
        userId: req.user.user_id,
        isTeacherOrAdmin,
        userGroupNumber,
      })
    ) {
      return res.status(404).json({
        success: false,
        message: "Calendar event not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: serializeEvent(event),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching calendar event",
      error: error.message,
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
        message: "Calendar event not found",
      });
    }

    const canDelete = await isEventOwnerOrAdmin(
      req.user.user_id,
      event.createdBy,
    );

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this event",
      });
    }

    await event.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Calendar event deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting calendar event",
      error: error.message,
    });
  }
};

const exportPublicCalendarIcs = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!/^[a-f\d]{24}$/i.test(userId)) {
      return res.status(400).json({
        success: false,
        message: "Neplatné ID používateľa",
      });
    }

    const events = await findCalendarEventsForUser(userId);

    if (!events) {
      return res.status(404).json({
        success: false,
        message: "Používateľ nebol nájdený",
      });
    }

    const icalModule = await import("ical-generator");
    const ical = icalModule.default || icalModule;

    const calendar = ical({
      name: "Otázkový systém",
      timezone: "Europe/Bratislava",
    });

    for (const event of events) {
      calendar.createEvent({
        id: String(event._id),
        summary: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay === true,
        description: event.description || "",
        location: event.location || "",
      });
    }

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="calendar-${userId}.ics"`,
    );
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(calendar.toString());
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  getCalendarEvents,
  getMyCalendarEvents,
  getCalendarEventById,
  deleteCalendarEvent,
  exportPublicCalendarIcs,
};
