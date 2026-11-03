import * as authService from '@app/pages/auth/authService';
import {
  useCreateCalendarEventMutation,
  useDeleteCalendarEventMutation,
  useGetCalendarEventsQuery,
  useLazyExportCalendarIcsQuery,
  useUpdateCalendarEventMutation
} from '@app/redux/api';
import EventCalendarToolbar from '@fullcalendar/mui/monarch/EventCalendarToolbar';
import EventCalendarViews from '@fullcalendar/mui/monarch/EventCalendarViews';
import '@fullcalendar/mui/monarch/theme.css';
import { useCalendarController } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import listPlugin from '@fullcalendar/react/list';
import skLocale from '@fullcalendar/react/locales/sk';
import multiMonthPlugin from '@fullcalendar/react/multimonth';
import '@fullcalendar/react/skeleton.css';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import DownloadIcon from '@mui/icons-material/Download';
import LinkIcon from '@mui/icons-material/Link';
import { Box, CircularProgress, Typography } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { darken, lighten, useTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { skSK } from '@mui/x-date-pickers/locales';
import dayjs from 'dayjs';
import 'dayjs/locale/sk';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
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

const attachTimedEventMarker = (info) => {
  const { el, event } = info;

  if (event.allDay) {
    return;
  }

  const eventTime = [...el.querySelectorAll('*')].find(
    (element) =>
      /^\d{1,2}:\d{2}/.test(element.textContent.trim()) &&
      ![...element.children].some((child) => /^\d{1,2}:\d{2}/.test(child.textContent.trim()))
  );
  const eventMain = eventTime || el.querySelector('.fc-event-main') || el;
  const marker = document.createElement('span');
  marker.className = 'calendar-timed-event-marker';
  marker.style.backgroundColor = event.backgroundColor || event.color || 'currentColor';
  eventMain.insertBefore(marker, eventMain.firstChild);
  el.__calendarTimedEventMarker = marker;
};

const detachCalendarEventHover = (info) => {
  info.el.__calendarHoverCleanup?.();
  delete info.el.__calendarHoverCleanup;
  info.el.__calendarClickCleanup?.();
  delete info.el.__calendarClickCleanup;
  info.el.__calendarTimedEventMarker?.remove();
  delete info.el.__calendarTimedEventMarker;
};

const attachCalendarEventClick = (info, handleClick) => {
  const handleEventClick = () => handleClick(info);

  info.el.addEventListener('click', handleEventClick);
  info.el.__calendarClickCleanup = () => {
    info.el.removeEventListener('click', handleEventClick);
  };
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
    color: event.color,
    isPrivate: event.isPrivate === true,
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

const StyledCalendar = ({ addButton, availableViews, plugins, ...calendarOptions }) => {
  const controller = useCalendarController();
  const theme = useTheme();
  const isHeightAuto =
    calendarOptions.height === 'auto' || calendarOptions.contentHeight === 'auto';

  return (
    <Box
      className={calendarOptions.className}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: calendarOptions.height,
        bgcolor: 'background.paper',
        borderStyle: 'solid',
        borderColor: 'divider',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderRadius: 1,
        '--calendar-grid-color': theme.palette.divider,
        overflow: !isHeightAuto ? 'hidden' : undefined
      }}
    >
      <EventCalendarToolbar
        sx={{
          padding: 2,
          '& .MuiToggleButtonGroup-root': {
            flexWrap: 'wrap'
          }
        }}
        controller={controller}
        availableViews={availableViews}
        addButton={addButton}
      />
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <EventCalendarViews
          {...calendarOptions}
          className={undefined}
          initialView={availableViews[0]}
          plugins={plugins}
          controller={controller}
        />
      </Box>
    </Box>
  );
};

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
  const [deleteCalendarEvent] = useDeleteCalendarEventMutation();
  const [exportPublicCalendarIcs] = useLazyExportCalendarIcsQuery();

  const calendarEvents = useMemo(
    () => (calendarEventsResponse?.data || []).map(mapApiEventToCalendarEvent),
    [calendarEventsResponse]
  );

  const getCalendarEventsForRange = useCallback(
    ({ start, end }, successCallback) => {
      const rangeStart = start.getTime();
      const rangeEnd = end.getTime();
      const eventsInRange = calendarEvents.filter((event) => {
        const eventStart = new Date(event.start).getTime();
        const eventEnd = event.end
          ? new Date(event.end).getTime()
          : event.allDay
            ? eventStart + 24 * 60 * 60 * 1000
            : eventStart + 60 * 60 * 1000;

        return (
          Number.isFinite(eventStart) &&
          Number.isFinite(eventEnd) &&
          eventStart < rangeEnd &&
          eventEnd > rangeStart
        );
      });

      successCallback(eventsInRange);
    },
    [calendarEvents]
  );

  const calendarEventsByDate = useMemo(() => {
    const eventsByDate = new Map();

    calendarEvents.forEach((event) => {
      const start = dayjs(event.start);
      const end = event.end
        ? dayjs(event.end)
        : event.allDay
          ? start.add(1, 'day')
          : start.add(1, 'hour');

      if (!start.isValid() || !end.isValid()) {
        return;
      }

      if (event.allDay) {
        const startDateKey = start.toDate().toISOString().slice(0, 10);
        const endDateKey = end.toDate().toISOString().slice(0, 10);

        for (
          let date = dayjs(startDateKey);
          date.format('YYYY-MM-DD') < endDateKey;
          date = date.add(1, 'day')
        ) {
          const dateKey = date.format('YYYY-MM-DD');
          const eventsForDate = eventsByDate.get(dateKey) || [];
          eventsForDate.push(event);
          eventsByDate.set(dateKey, eventsForDate);
        }

        return;
      }

      for (let date = start.startOf('day'); date.isBefore(end); date = date.add(1, 'day')) {
        const dateKey = date.format('YYYY-MM-DD');
        const eventsForDate = eventsByDate.get(dateKey) || [];
        eventsForDate.push(event);
        eventsByDate.set(dateKey, eventsForDate);
      }
    });

    return eventsByDate;
  }, [calendarEvents]);

  const handleEventDidMount = (info) => {
    attachCalendarEventHover(info, theme.palette.mode);
    attachCalendarEventClick(info, handleEventClick);
    attachTimedEventMarker(info);
  };

  const renderDayCellContent = ({ date, dayNumberText, view }) => {
    if (view.type !== 'multiMonthYear') {
      return dayNumberText;
    }

    const eventsForDate = calendarEventsByDate.get(dayjs(date).format('YYYY-MM-DD'));

    return (
      <>
        {dayNumberText}
        {eventsForDate?.length > 1 && (
          <span
            className="calendar-year-event-overflow"
            title={eventsForDate.map((event) => event.title).join(', ')}
          >
            +{eventsForDate.length - 1}
          </span>
        )}
      </>
    );
  };

  const handleDayCellDidMount = ({ el, isOther, isToday }) => {
    const dayNumber = el.querySelector('.fc-monarch-IdL, .fc-monarch-CSa');
    const row = el.parentElement;
    const rows = row?.parentElement?.children;
    const isLastCellInRow = !row || el === row.lastElementChild;
    const isLastRow = !rows || row === rows[rows.length - 1];

    const gridColor = 'var(--calendar-grid-color)';
    const shadows = [];

    if (!isLastCellInRow) {
      shadows.push(`inset -1px 0 0 ${gridColor}`);
    }

    if (!isLastRow) {
      shadows.push(`inset 0 -1px 0 ${gridColor}`);
    }

    el.style.setProperty('box-shadow', shadows.join(', '), 'important');

    if (isToday) {
      el.classList.add('calendar-today-cell');
      dayNumber?.classList.add('calendar-today-number');
    }

    if (isOther) {
      dayNumber?.classList.add('calendar-other-month-number');
    }
  };

  const handleEventClick = (info) => {
    setSelectedEvent({
      id: info.event.id,
      title: info.event.title,
      start: info.event.start,
      end: info.event.end,
      allDay: info.event.allDay,
      color: info.event.extendedProps?.color || info.event.backgroundColor,
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

  const handleEventDelete = async (eventId) => {
    await deleteCalendarEvent(eventId).unwrap();
    setSelectedEvent(null);
    await refetchCalendarEvents();
    setCalendarRenderKey((key) => key + 1);
  };

  const handleDownloadMyEvents = async () => {
    if (!currentUserId) {
      console.error('Nepodarilo sa stiahnuť kalendár: chýba ID používateľa.');
      return;
    }

    try {
      const calendarIcs = await exportPublicCalendarIcs(currentUserId).unwrap();
      const url = window.URL.createObjectURL(new Blob([calendarIcs], { type: 'text/calendar' }));

      const link = document.createElement('a');
      link.href = url;
      link.download = 'calendar.ics';

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Nepodarilo sa stiahnuť kalendár:', error);
    }
  };

  const handleCopyMyCalendarAddress = async () => {
    if (!currentUserId) {
      console.error('Nepodarilo sa skopírovať adresu kalendára: chýba ID používateľa.');
      return;
    }

    const calendarAddress = `${window.location.origin}/api/public/calendar/${currentUserId}/calendar.ics`;

    try {
      await navigator.clipboard.writeText(calendarAddress);
      toast.success('Adresa kalendara bola skopírovaná do schránky');
    } catch (error) {
      console.error('Nepodarilo sa skopírovať adresu kalendára:', error);
    }
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
          onDelete={handleEventDelete}
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

        <Box>
          <IconButton
            aria-label="Stiahnuť kalendár"
            title="Stiahnuť kalendár"
            onClick={handleDownloadMyEvents}
          >
            <DownloadIcon />
          </IconButton>

          <IconButton
            aria-label="Skopírovať adresu kalendára"
            title="Skopírovať adresu kalendára"
            onClick={handleCopyMyCalendarAddress}
          >
            <LinkIcon />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          '& .calendar-responsive-toolbar > .MuiBox-root:first-of-type': {
            px: { xs: 1, sm: 2 },
            py: { xs: 1, sm: 2 },
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' }
          },
          '& .calendar-responsive-toolbar > .MuiBox-root:first-of-type > .MuiBox-root:first-of-type':
            {
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              justifyContent: { xs: 'center', sm: 'flex-start' },
              '& > .MuiTypography-root': {
                flexBasis: { xs: '100%', sm: 'auto' },
                order: { xs: 1, sm: 0 },
                textAlign: { xs: 'center', sm: 'left' },
                fontSize: { xs: '1.125rem', sm: '1.5rem' },
                whiteSpace: 'normal'
              }
            },
          '& .calendar-responsive-toolbar .MuiToggleButtonGroup-root': {
            display: { xs: 'grid', sm: 'inline-flex' },
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'none' },
            width: { xs: '100%', sm: 'auto' }
          },
          '& .calendar-responsive-toolbar .MuiToggleButton-root': {
            minWidth: 0,
            px: { xs: 1, sm: 2 },
            py: { xs: 0.75, sm: 1 },
            fontSize: { xs: '0.7rem', sm: '0.8125rem' },
            whiteSpace: 'nowrap'
          },
          '& .calendar-today-cell': {
            backgroundColor: theme.palette.action.hover
          },
          '& .calendar-today-cell .calendar-today-number': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: `${theme.palette.primary.main} !important`,
            color: `${theme.palette.primary.contrastText} !important`,
            fontWeight: '700 !important'
          },
          '& .calendar-other-month-number': {
            color: `${theme.palette.text.secondary} !important`,
            opacity: 0.65
          },
          '& .calendar-year-event-overflow': {
            display: 'inline-block',
            margin: '1px 2px',
            padding: '0 4px',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 10,
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            fontSize: 9,
            fontWeight: 600,
            lineHeight: 1.3,
            whiteSpace: 'nowrap'
          },
          '& .calendar-timed-event-marker': {
            display: 'inline-block',
            width: 6,
            height: 6,
            marginRight: 0.5,
            borderRadius: '50%',
            flexShrink: 0,
            verticalAlign: 'middle'
          }
        }}
      >
        {isCalendarLoading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : isCalendarError ? (
          <Box display="flex" justifyContent="center" py={6}>
            <Typography color="error">Chyba pri načítavaní kalendára</Typography>
          </Box>
        ) : null}

        <StyledCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, multiMonthPlugin]}
          availableViews={['dayGridMonth', 'dayGridWeek', 'listWeek', 'multiMonthYear']}
          addButton={{
            text: 'Pridať event',
            click: () => setOpenCreateEventModal(true)
          }}
          className="calendar-responsive-toolbar"
          key={calendarRenderKey}
          height="auto"
          aspectRatio={2.4}
          locale="sk"
          locales={[skLocale]}
          todayText="Dnes"
          monthText="Mesiac"
          weekTextLong="Týždeň"
          listText="Zoznam"
          views={{ multiMonthYear: { aspectRatio: 1.35 } }}
          dayCellTopContent={renderDayCellContent}
          nowIndicator
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          eventDidMount={handleEventDidMount}
          eventWillUnmount={detachCalendarEventHover}
          dayCellDidMount={handleDayCellDidMount}
          events={getCalendarEventsForRange}
        />
      </Box>
    </Box>
  );
};

export default CalendarPage;
