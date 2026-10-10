import { useCurrentSubject } from '@app/hooks/useCurrentSubject';
import { useCurrentSubjectId } from '@app/hooks/useCurrentSubjectId';
import * as authService from '@app/pages/auth/authService';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TodayOutlinedIcon from '@mui/icons-material/TodayOutlined';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';
import { toast } from 'react-toastify';

const CalendarFrame = styled(Paper)(({ theme }) => ({
  overflow: 'hidden',
  borderRadius: 20,
  border: `1px solid ${theme.palette.divider}`,
  '& .fc': {
    '--fc-border-color': theme.palette.divider,
    '--fc-page-bg-color': 'transparent',
    '--fc-neutral-bg-color': theme.palette.action.hover,
    '--fc-list-event-hover-bg-color': theme.palette.action.hover,
    '--fc-today-bg-color':
      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(25, 118, 210, 0.06)',
    '--fc-event-border-color': 'transparent',
    fontFamily: theme.typography.fontFamily
  },
  '& .fc-toolbar-title': {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: theme.palette.text.primary
  },
  '& .fc .fc-button': {
    borderRadius: 10,
    textTransform: 'none'
  },
  '& .fc .fc-daygrid-day-number, & .fc .fc-col-header-cell-cushion, & .fc .fc-list-day-text, & .fc .fc-list-day-side-text':
    {
      color: theme.palette.text.primary,
      textDecoration: 'none'
    },
  '& .fc .fc-event': {
    border: 'none',
    borderRadius: 10,
    padding: '2px 4px',
    cursor: 'pointer'
  }
}));

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const formatLocalInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatIso = (value) => {
  if (!value) return '';
  return new Date(value).toISOString();
};

const getUserId = () => {
  const storedUser = authService.getUserFromStorage();
  return storedUser?.id || storedUser?._id || storedUser?.userId || storedUser?.teacherId || null;
};

const buildSeedEvents = (userId) => {
  const personalStart = new Date();
  personalStart.setHours(9, 0, 0, 0);
  const personalEnd = new Date(personalStart);
  personalEnd.setHours(10, 0, 0, 0);

  const groupStart = new Date();
  groupStart.setDate(groupStart.getDate() + 2);
  groupStart.setHours(0, 0, 0, 0);

  return [
    {
      id: createId(),
      title: 'Osobná poznámka',
      start: personalStart.toISOString(),
      end: personalEnd.toISOString(),
      allDay: false,
      description: 'Ukážkový osobný event.',
      visibility: 'personal',
      subjectId: null,
      createdBy: userId
    },
    {
      id: createId(),
      title: 'Skupinový termín',
      start: groupStart.toISOString(),
      end: null,
      allDay: true,
      description: 'Ukážkový event pre aktuálny predmet.',
      visibility: 'group',
      subjectId: 'sample-subject',
      createdBy: 'teacher-user'
    }
  ];
};

const CalendarPage = () => {
  const calendarRef = React.useRef(null);
  const currentSubject = useCurrentSubject();
  const currentSubjectId = useCurrentSubjectId();
  const storedUser = authService.getUserFromStorage();
  const userId = getUserId();
  const isTeacher = storedUser?.isTeacher === true;

  const [events, setEvents] = React.useState(() => buildSeedEvents(userId));
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedEventId, setSelectedEventId] = React.useState(null);
  const [formValue, setFormValue] = React.useState({
    title: '',
    description: '',
    start: '',
    end: '',
    allDay: false,
    visibility: 'personal'
  });

  const visibleEvents = React.useMemo(() => {
    return events
      .filter((event) => {
        if (event.visibility === 'personal') {
          return event.createdBy === userId;
        }

        return Boolean(currentSubjectId) && event.subjectId === currentSubjectId;
      })
      .map((event) => ({
        ...event,
        editable: event.visibility === 'personal' ? event.createdBy === userId : isTeacher,
        backgroundColor: event.visibility === 'personal' ? '#1976d2' : '#9c27b0',
        borderColor: event.visibility === 'personal' ? '#1976d2' : '#9c27b0'
      }));
  }, [events, currentSubjectId, isTeacher, userId]);

  const selectedEvent = React.useMemo(() => {
    return events.find((event) => event.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  const canManageSelectedEvent = React.useMemo(() => {
    if (!selectedEvent) return false;
    if (selectedEvent.visibility === 'personal') {
      return selectedEvent.createdBy === userId;
    }

    return isTeacher;
  }, [isTeacher, selectedEvent, userId]);

  const isReadOnlyDialog = Boolean(selectedEventId) && !canManageSelectedEvent;

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedEventId(null);
  };

  const openCreateDialog = (start = null, end = null, allDay = false) => {
    setSelectedEventId(null);
    setFormValue({
      title: '',
      description: '',
      start: start ? formatLocalInputValue(start) : '',
      end: end ? formatLocalInputValue(end) : '',
      allDay,
      visibility: isTeacher ? 'personal' : 'personal'
    });
    setDialogOpen(true);
  };

  const handleEventClick = (clickInfo) => {
    const event = events.find((item) => item.id === clickInfo.event.id);
    if (!event) return;

    setSelectedEventId(event.id);
    setFormValue({
      title: event.title || '',
      description: event.description || '',
      start: formatLocalInputValue(event.start),
      end: event.end ? formatLocalInputValue(event.end) : '',
      allDay: Boolean(event.allDay),
      visibility: event.visibility || 'personal'
    });
    setDialogOpen(true);
  };

  const handleSelect = (selectInfo) => {
    openCreateDialog(selectInfo.start, selectInfo.end, selectInfo.allDay);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formValue.title.trim()) {
      toast.error('Názov eventu je povinný');
      return;
    }

    const id = selectedEventId || createId();
    const nextEvent = {
      id,
      title: formValue.title.trim(),
      description: formValue.description.trim(),
      start: formValue.start ? formatIso(formValue.start) : new Date().toISOString(),
      end: formValue.end ? formatIso(formValue.end) : null,
      allDay: formValue.allDay,
      visibility: isTeacher && formValue.visibility === 'group' ? 'group' : 'personal',
      subjectId: isTeacher && formValue.visibility === 'group' ? currentSubjectId || null : null,
      createdBy: selectedEvent?.createdBy || userId
    };

    setEvents((currentEvents) => {
      const nextEvents = currentEvents.filter((item) => item.id !== id);
      nextEvents.unshift(nextEvent);
      return nextEvents;
    });

    toast.success(selectedEventId ? 'Event bol upravený' : 'Event bol vytvorený');
    handleCloseDialog();
  };

  const handleDelete = () => {
    if (!selectedEvent || !canManageSelectedEvent) return;

    setEvents((currentEvents) => currentEvents.filter((item) => item.id !== selectedEvent.id));
    toast.success('Event bol vymazaný');
    handleCloseDialog();
  };

  const handleToday = () => {
    calendarRef.current?.getApi()?.today();
  };

  const handlePrev = () => {
    calendarRef.current?.getApi()?.prev();
  };

  const handleNext = () => {
    calendarRef.current?.getApi()?.next();
  };

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pb: 3, px: { xs: 1, sm: 0 } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Kalendár
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {currentSubject
              ? `Aktuálny predmet: ${currentSubject.name}`
              : 'Zvolený predmet ešte nie je dostupný.'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" startIcon={<TodayOutlinedIcon />} onClick={handleToday}>
            Today
          </Button>
          <Button variant="outlined" startIcon={<ChevronLeftIcon />} onClick={handlePrev}>
            Predošlý
          </Button>
          <Button variant="outlined" endIcon={<ChevronRightIcon />} onClick={handleNext}>
            Nasledujúci
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openCreateDialog(new Date(), null, false)}
          >
            Nový event
          </Button>
        </Stack>
      </Stack>

      <Card sx={{ mb: 2, borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="Osobné eventy" color="primary" variant="outlined" />
          <Chip label="Skupinové eventy" color="secondary" variant="outlined" />
          <Chip
            label={
              isTeacher ? 'Teacher/admin vie tvoriť group eventy' : 'Group eventy sú read-only'
            }
            variant="outlined"
          />
        </CardContent>
      </Card>

      <CalendarFrame>
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="month"
            views={{
              month: { type: 'dayGridMonth', buttonText: 'Month' },
              week: { type: 'timeGridWeek', buttonText: 'Week' },
              day: { type: 'timeGridDay', buttonText: 'Day' },
              list: { type: 'listWeek', buttonText: 'List' }
            }}
            headerToolbar={{
              left: 'title',
              center: '',
              right: 'month,week,day,list'
            }}
            events={visibleEvents}
            editable
            selectable
            selectMirror
            dayMaxEvents
            weekends
            height="auto"
            select={handleSelect}
            eventClick={handleEventClick}
            eventDisplay="block"
            nowIndicator
            stickyHeaderDates
            eventContent={(arg) => (
              <Stack spacing={0.25} sx={{ overflow: 'hidden' }}>
                <Typography variant="caption" sx={{ lineHeight: 1, opacity: 0.85 }}>
                  {arg.event.extendedProps.visibility === 'group' ? 'Skupina' : 'Osobné'}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.15 }} noWrap>
                  {arg.event.title}
                </Typography>
              </Stack>
            )}
          />
        </Box>
      </CalendarFrame>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {selectedEventId ? 'Upraviť event' : 'Nový event'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {formValue.visibility === 'group'
              ? 'Event bude viditeľný pre používateľov aktuálneho predmetu.'
              : 'Event uvidíte iba vy.'}
          </Typography>
        </DialogTitle>
        <Divider />
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Názov"
                  fullWidth
                  required
                  value={formValue.title}
                  disabled={isReadOnlyDialog}
                  onChange={(event) =>
                    setFormValue((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Popis"
                  fullWidth
                  multiline
                  minRows={3}
                  value={formValue.description}
                  disabled={isReadOnlyDialog}
                  onChange={(event) =>
                    setFormValue((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Začiatok"
                  type="datetime-local"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formValue.start}
                  disabled={isReadOnlyDialog}
                  onChange={(event) =>
                    setFormValue((current) => ({ ...current, start: event.target.value }))
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Koniec"
                  type="datetime-local"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formValue.end}
                  disabled={isReadOnlyDialog}
                  onChange={(event) =>
                    setFormValue((current) => ({ ...current, end: event.target.value }))
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formValue.allDay}
                      disabled={isReadOnlyDialog}
                      onChange={(event) =>
                        setFormValue((current) => ({ ...current, allDay: event.target.checked }))
                      }
                    />
                  }
                  label="All day"
                />
              </Grid>
              {isTeacher && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <Select
                      value={formValue.visibility}
                      disabled={isReadOnlyDialog}
                      onChange={(event) =>
                        setFormValue((current) => ({ ...current, visibility: event.target.value }))
                      }
                    >
                      <MenuItem value="personal">Osobný</MenuItem>
                      <MenuItem value="group">Skupinový</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            {selectedEventId && canManageSelectedEvent && (
              <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={handleDelete}>
                Vymazať
              </Button>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <Button onClick={handleCloseDialog}>Zrušiť</Button>
            {!isReadOnlyDialog && (
              <Button type="submit" variant="contained">
                Uložiť
              </Button>
            )}
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default CalendarPage;
