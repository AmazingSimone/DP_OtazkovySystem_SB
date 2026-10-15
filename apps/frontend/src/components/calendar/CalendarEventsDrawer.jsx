import { useGetCalendarEventsQuery } from '@app/redux/api';
import EventCalendar from '@fullcalendar/mui/monarch/EventCalendar';
import '@fullcalendar/mui/monarch/theme.css';
import skLocale from '@fullcalendar/react/locales/sk';
import '@fullcalendar/react/skeleton.css';
import { useContext, useMemo } from 'react';
import Drawer from '@mui/material/Drawer';
import { CalendarDrawerContext } from '@app/contexts/CalendarDrawerContext';

const getCreatedById = (createdBy) => {
  if (!createdBy) return null;
  if (typeof createdBy === 'object') return createdBy._id || createdBy.id || null;
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

const CalendarEventsDrawer = () => {
  const { open } = useContext(CalendarDrawerContext);
  const { data: calendarEventsResponse } = useGetCalendarEventsQuery();
  const events = useMemo(
    () => (calendarEventsResponse?.data || []).map(mapApiEventToCalendarEvent),
    [calendarEventsResponse]
  );

  return (
    <Drawer
      variant="persistent"
      open={open}
      anchor="right"
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100vw', sm: 550 },
          top: { xs: 56, sm: 64 },
          height: { xs: 'calc(100% - 56px)', sm: 'calc(100% - 64px)' }
        },
        '& .dashboard-calendar': {
          width: '100%',
          minWidth: 0
        },
        '& .dashboard-calendar > .MuiBox-root:first-of-type': {
          justifyContent: 'flex-start',
          px: { xs: 1, sm: 2 },
          gap: { xs: 0.5, sm: 1 }
        },
        '& .dashboard-calendar > .MuiBox-root:first-of-type > .MuiBox-root:first-of-type': {
          width: '100%',
          minWidth: 0,
          flexShrink: 1,
          flexWrap: 'wrap',
          gap: { xs: 0.5, sm: 1 }
        },
        '& .dashboard-calendar > .MuiBox-root:first-of-type > .MuiBox-root:first-of-type > .MuiTypography-root':
          {
            minWidth: 0,
            flex: '1 1 auto',
            fontSize: { xs: '1rem', sm: '1.5rem' },
            whiteSpace: 'normal'
          },
        '& .MuiToggleButtonGroup-root': {
          display: 'none'
        }
      }}
    >
      <EventCalendar
        availableViews={['listWeek']}
        height="100%"
        locale="sk"
        locales={[skLocale]}
        events={events}
        className="dashboard-calendar"
      />
    </Drawer>
  );
};

export default CalendarEventsDrawer;
