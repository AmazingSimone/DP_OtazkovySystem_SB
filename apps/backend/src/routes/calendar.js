const express = require('express');
const {
  createCalendarEvent,
  updateCalendarEvent,
  getCalendarEvents,
  getMyCalendarEvents,
  getCalendarEventById,
  deleteCalendarEvent
} = require('../controllers/calendarController');

const router = express.Router();

router.get('/', getCalendarEvents);
router.get('/my-events', getMyCalendarEvents);
router.get('/:id', getCalendarEventById);
router.post('/', createCalendarEvent);
router.put('/:id', updateCalendarEvent);
router.delete('/:id', deleteCalendarEvent);

module.exports = router;