import * as authService from '@app/pages/auth/authService';
import {
  useCreateCalendarEventMutation,
  useGetCalendarEventsQuery,
  useUpdateCalendarEventMutation
} from '@app/redux/api';
import EventCalendar from '@fullcalendar/mui/monarch/EventCalendar';
import '@fullcalendar/mui/monarch/theme.css';
import skLocale from '@fullcalendar/react/locales/sk';
import '@fullcalendar/react/skeleton.css';
import { Box, CircularProgress, Typography } from '@mui/material';
import { darken, lighten, useTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { skSK } from '@mui/x-date-pickers/locales';
import 'dayjs/locale/sk';
import { useMemo, useState } from 'react';
import CalendarEventDetailModal from './components/CalendarEventDetailModal';
import CreateCalendarEventModal from './components/CreateCalendarEventModal';

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

const getCreatedById = (createdBy) => {
  if (!createdBy) {
    return null;
  }

  if (typeof createdBy === 'object') {
    return createdBy._id || createdBy.id || null;
  }

  return createdBy;
};

const mapApiEventToCalendarEvent = (event) => ({
  id: event.id || event._id,
  title: event.title,
  start: event.start,
  end: event.end,
  allDay: event.allDay === true,
  color: event.color,
  backgroundColor: event.color,
  borderColor: event.color,
  extendedProps: {
    studentGroup: Array.isArray(event.studentGroup) ? event.studentGroup : [],
    location: event.location || '',
    description: event.description || '',
    createdBy: getCreatedById(event.createdBy)
  }
});

const buildCalendarEventPayload = (eventData) => ({
  title: eventData.title.trim(),
  date: eventData.date ? eventData.date.format('YYYY-MM-DD') : null,
  endDate: eventData.endDate ? eventData.endDate.format('YYYY-MM-DD') : null,
  startTime: eventData.startTime,
  endTime: eventData.endTime,
  allDay: eventData.allDay,
  studentGroup: Array.isArray(eventData.studentGroup) ? eventData.studentGroup : [],
  location: eventData.location?.trim() || '',
  description: eventData.description?.trim() || '',
  color: eventData.color
});

const CalendarPage = () => {
  const [openCreateEventModal, setOpenCreateEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [calendarRenderKey, setCalendarRenderKey] = useState(0);
  const theme = useTheme();
  const storedTeacher = authService.getTeacherFromStorage();
  const storedUser = authService.getUserFromStorage();
  const currentUserId =
    storedTeacher?._id || storedTeacher?.id || storedUser?._id || storedUser?.id;

  const {
    data: calendarEventsResponse,
    isLoading: isCalendarLoading,
    isError: isCalendarError,
    refetch: refetchCalendarEvents
  } = useGetCalendarEventsQuery();

  const [createCalendarEvent] = useCreateCalendarEventMutation();
  const [updateCalendarEvent] = useUpdateCalendarEventMutation();

  const calendarEvents = useMemo(
    () => (calendarEventsResponse?.data || []).map(mapApiEventToCalendarEvent),
    [calendarEventsResponse]
  );

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

  const handleEventCreate = async (eventData) => {
    const payload = buildCalendarEventPayload(eventData);

    await createCalendarEvent(payload).unwrap();
    setCalendarRenderKey((key) => key + 1);
  };

  const handleEventUpdate = async (eventData) => {
    const payload = {
      id: eventData.id,
      ...buildCalendarEventPayload(eventData),
      createdBy: eventData.createdBy
    };

    const response = await updateCalendarEvent(payload).unwrap();
    const updatedEvent = mapApiEventToCalendarEvent(response.data);

    setSelectedEvent({
      id: updatedEvent.id,
      title: updatedEvent.title,
      start: updatedEvent.start,
      end: updatedEvent.end,
      allDay: updatedEvent.allDay,
      color: updatedEvent.color,
      backgroundColor: updatedEvent.color,
      borderColor: updatedEvent.borderColor,
      extendedProps: updatedEvent.extendedProps
    });

    // Refetch calendar events to update the visual representation immediately
    await refetchCalendarEvents();
    setCalendarRenderKey((key) => key + 1);
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
          onEventCreated={handleEventCreate}
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
        {isCalendarLoading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : isCalendarError ? (
          <Box display="flex" justifyContent="center" py={6}>
            <Typography color="error">Chyba pri načítavaní kalendára</Typography>
          </Box>
        ) : null}

        <EventCalendar
          key={calendarRenderKey}
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
          events={calendarEvents}
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
