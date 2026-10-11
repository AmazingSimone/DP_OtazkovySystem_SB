import * as authService from '@app/pages/auth/authService';
import EventCalendar from '@fullcalendar/mui/monarch/EventCalendar';
import '@fullcalendar/mui/monarch/theme.css';
import skLocale from '@fullcalendar/react/locales/sk';
import '@fullcalendar/react/skeleton.css';
import { Box, Typography } from '@mui/material';
import { darken, lighten, useTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { skSK } from '@mui/x-date-pickers/locales';
import dayjs from 'dayjs';
import 'dayjs/locale/sk';
import { useState } from 'react';
import CalendarEventDetailModal from './components/CalendarEventDetailModal';
import CreateCalendarEventModal from './components/CreateCalendarEventModal';
const initialEvents = [
  {
    id: 'event-1',
    title: 'Osobná poznámka',
    start: '2026-10-10T09:00:00',
    end: '2026-10-10T10:00:00',
    color: '#f59e0b'
  },
  {
    id: 'event-2',
    title: 'Skupinový termín',
    start: '2026-10-12',
    end: '2026-10-12',
    allDay: true,
    color: '#7c3aed'
  },
  {
    id: 'event-3',
    title: 'Test 3 dni',
    start: '2026-10-12',
    end: '2026-10-15',
    allDay: true,
    color: '#155039'
  }
];

const getHoverSurfaceColor = (color, mode, isAllDay) => {
  if (!color) {
    return color;
  }

  if (mode === 'dark') {
    return lighten(color, isAllDay ? 0.08 : 0.12);
  }

  return darken(color, isAllDay ? 0.06 : 0.12);
};

const getHoverBorderColor = (color, mode, isAllDay) => {
  if (!color) {
    return color;
  }

  if (mode === 'dark') {
    return lighten(color, isAllDay ? 0.14 : 0.2);
  }

  return darken(color, isAllDay ? 0.1 : 0.18);
};

const attachCalendarEventHover = (info, mode) => {
  const { el, event } = info;
  const isAllDay = event.allDay === true;
  const computedStyles = window.getComputedStyle(el);
  const baseBackground = event.backgroundColor || computedStyles.backgroundColor;
  const baseBorder = event.borderColor || computedStyles.borderColor || baseBackground;
  const hoverBackground = getHoverSurfaceColor(baseBackground, mode, isAllDay);
  const hoverBorder = getHoverBorderColor(baseBorder, mode, isAllDay);

  el.style.setProperty(
    'transition',
    'background-color 0.16s ease, border-color 0.16s ease',
    'important'
  );

  const handleMouseEnter = () => {
    el.style.setProperty('background-color', hoverBackground, 'important');
    el.style.setProperty('border-color', hoverBorder, 'important');
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('filter', 'none', 'important');
  };

  const handleMouseLeave = () => {
    el.style.setProperty('background-color', baseBackground, 'important');
    el.style.setProperty('border-color', baseBorder, 'important');
    el.style.setProperty('opacity', '1', 'important');
    el.style.removeProperty('filter');
  };

  el.addEventListener('mouseenter', handleMouseEnter);
  el.addEventListener('mouseleave', handleMouseLeave);
  el.__calendarHoverCleanup = () => {
    el.removeEventListener('mouseenter', handleMouseEnter);
    el.removeEventListener('mouseleave', handleMouseLeave);
  };
};

const detachCalendarEventHover = (info) => {
  info.el.__calendarHoverCleanup?.();
  delete info.el.__calendarHoverCleanup;
};

const CalendarPage = () => {
  const [openCreateEventModal, setOpenCreateEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState(initialEvents);
  const theme = useTheme();
  const storedTeacher = authService.getTeacherFromStorage();
  const storedUser = authService.getUserFromStorage();
  const currentUserId =
    storedTeacher?._id || storedTeacher?.id || storedUser?._id || storedUser?.id;

  const buildCalendarEvent = (eventData, existingId) => {
    const eventDate = dayjs(eventData.date);
    const eventId = existingId || `event-${Date.now()}-${Math.round(Math.random() * 100000)}`;

    if (eventData.allDay) {
      return {
        id: eventId,
        title: eventData.title,
        start: eventDate.format('YYYY-MM-DD'),
        end: eventDate.add(1, 'day').format('YYYY-MM-DD'),
        allDay: true,
        color: eventData.color,
        extendedProps: {
          studentGroup: eventData.studentGroup,
          location: eventData.location,
          description: eventData.description,
          createdBy: eventData.createdBy
        }
      };
    }

    const startTime = dayjs(eventData.startTime);
    const endTime = dayjs(eventData.endTime);

    return {
      id: eventId,
      title: eventData.title,
      start: eventDate
        .hour(startTime.hour())
        .minute(startTime.minute())
        .second(0)
        .format('YYYY-MM-DDTHH:mm:ss'),
      end: eventDate
        .hour(endTime.hour())
        .minute(endTime.minute())
        .second(0)
        .format('YYYY-MM-DDTHH:mm:ss'),
      allDay: false,
      color: eventData.color,
      extendedProps: {
        studentGroup: eventData.studentGroup,
        location: eventData.location,
        description: eventData.description,
        createdBy: eventData.createdBy
      }
    };
  };

  const handleEventDidMount = (info) => {
    attachCalendarEventHover(info, theme.palette.mode);
  };

  const handleEventClick = (info) => {
    setSelectedEvent({
      id: info.event.id,
      title: info.event.title,
      start: info.event.start,
      end: info.event.end,
      allDay: info.event.allDay,
      color: info.event.backgroundColor,
      backgroundColor: info.event.backgroundColor,
      extendedProps: info.event.extendedProps || {}
    });
  };

  const handleEventUpdate = (eventData) => {
    const updatedCalendarEvent = buildCalendarEvent(eventData, eventData.id);

    setEvents((prev) =>
      prev.map((eventItem) =>
        String(eventItem.id) === String(updatedCalendarEvent.id) ? updatedCalendarEvent : eventItem
      )
    );

    setSelectedEvent({
      id: updatedCalendarEvent.id,
      title: updatedCalendarEvent.title,
      start: updatedCalendarEvent.start,
      end: updatedCalendarEvent.end,
      allDay: updatedCalendarEvent.allDay,
      color: updatedCalendarEvent.color,
      backgroundColor: updatedCalendarEvent.color,
      extendedProps: updatedCalendarEvent.extendedProps
    });
  };

  const canEditSelectedEvent =
    !!selectedEvent?.extendedProps?.createdBy &&
    !!currentUserId &&
    String(selectedEvent.extendedProps.createdBy) === String(currentUserId);

  return (
    <Box
      sx={{
        pt: { xs: 2, sm: 3 },
        pb: 3,
        px: { xs: 1, sm: 0 }
      }}
    >
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale="sk"
        localeText={skSK.components.MuiLocalizationProvider.defaultProps.localeText}
      >
        <CreateCalendarEventModal
          open={openCreateEventModal}
          onClose={() => setOpenCreateEventModal(false)}
          onEventCreated={(event) => {
            const calendarEvent = buildCalendarEvent(event);

            setEvents((prev) => [...prev, calendarEvent]);
          }}
        />

        <CalendarEventDetailModal
          open={selectedEvent !== null}
          eventData={selectedEvent}
          canEdit={canEditSelectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSave={handleEventUpdate}
        />
      </LocalizationProvider>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={{ xs: 1.5, sm: 1 }}
        mb={3}
      >
        <Typography variant="h4" component="h1">
          Kalendár
        </Typography>
      </Box>

      <Box>
        <EventCalendar
          height="auto"
          aspectRatio={2.4}
          locale="sk"
          locales={[skLocale]}
          availableViews={['dayGridMonth', 'dayGridWeek', 'listWeek']}
          editable
          selectable
          nowIndicator
          navLinks
          buttonText={{
            today: 'Dnes',
            month: 'Mesiac',
            week: 'Týždeň',
            list: 'Zoznam'
          }}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          eventDidMount={handleEventDidMount}
          eventWillUnmount={detachCalendarEventHover}
          eventClick={handleEventClick}
          events={events}
          addButton={{
            text: 'Pridať event',
            click() {
              // alert('add event...');
              setOpenCreateEventModal(true);
            }
          }}
        />
      </Box>
    </Box>
  );
};

export default CalendarPage;
