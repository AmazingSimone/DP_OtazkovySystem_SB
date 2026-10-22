import { CalendarDrawerContext } from '@app/contexts/CalendarDrawerContext';
import { useGetCalendarEventsQuery } from '@app/redux/api';
import {
  Box,
  CircularProgress,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Typography
} from '@mui/material';
import { useContext, useMemo } from 'react';

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
  isPrivate: event.isPrivate === true,
  studentGroup: Array.isArray(event.studentGroup) ? event.studentGroup : [],
  location: event.location || '',
  description: event.description || '',
  createdBy: getCreatedById(event.createdBy)
});

const formatEventDate = (event) => {
  const start = new Date(event.start);

  if (Number.isNaN(start.getTime())) return '';

  if (event.allDay) {
    const end = event.end ? new Date(event.end) : null;

    const formatDate = (date) =>
      date.toLocaleDateString('sk-SK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

    if (end && !Number.isNaN(end.getTime())) {
      // Koncový dátum je exkluzívny, preto odpočítame jeden deň.
      const lastDay = new Date(end);
      lastDay.setUTCDate(lastDay.getUTCDate() - 1);

      if (start.toDateString() !== lastDay.toDateString()) {
        return `Od ${formatDate(start)} do ${formatDate(lastDay)}`;
      }
    }

    return formatDate(start);
  }

  return start.toLocaleString('sk-SK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const CalendarEventsDrawer = () => {
  const { open } = useContext(CalendarDrawerContext);
  const { data: calendarEventsResponse, isLoading, isError } = useGetCalendarEventsQuery();

  const events = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (calendarEventsResponse?.data || [])
      .map(mapApiEventToCalendarEvent)
      .filter((event) => {
        const start = new Date(event.start);
        return !Number.isNaN(start.getTime()) && start >= today;
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [calendarEventsResponse]);

  return (
    <Drawer
      variant="persistent"
      open={open}
      anchor="right"
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100vw', sm: 550 },
          top: { xs: 56, sm: 64 },
          height: { xs: 'calc(100% - 56px)', sm: 'calc(100% - 64px)' },
          boxSizing: 'border-box',
          overflowY: 'auto'
        }
      }}
    >
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Nadchádzajúce udalosti
        </Typography>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : isError ? (
          <Typography color="error">Nepodarilo sa načítať udalosti.</Typography>
        ) : events.length === 0 ? (
          <Typography color="text.secondary">Nemáš žiadne nadchádzajúce udalosti.</Typography>
        ) : (
          <List disablePadding>
            {events.map((event) => (
              <ListItem
                key={event.id}
                alignItems="flex-start"
                sx={{
                  mb: 1,
                  borderLeft: `4px solid ${event.color || '#1976d2'}`,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  px: 2,
                  py: 1.5
                }}
              >
                <ListItemText
                  primary={event.title}
                  secondary={
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        display="block"
                        color="text.primary"
                      >
                        {formatEventDate(event)}
                      </Typography>

                      {event.location && (
                        <Typography component="span" variant="body2" display="block">
                          Miesto: {event.location}
                        </Typography>
                      )}

                      {event.description && (
                        <Typography
                          component="span"
                          variant="body2"
                          display="block"
                          sx={{
                            mt: 0.5,
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'anywhere'
                          }}
                        >
                          {event.description}
                        </Typography>
                      )}
                    </>
                  }
                  slotProps={{
                    primary: {
                      sx: {
                        fontWeight: 600,
                        overflowWrap: 'anywhere'
                      }
                    }
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
};

export default CalendarEventsDrawer;
