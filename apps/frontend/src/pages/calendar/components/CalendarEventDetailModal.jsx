import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  TextField
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

const formatDateValue = (value) => {
  if (!value) {
    return '';
  }

  return dayjs(value).format('DD.MM.YYYY');
};

const formatTimeValue = (value) => {
  if (!value) {
    return '';
  }

  return dayjs(value).format('HH:mm');
};

const mapEventToFormData = (eventData) => ({
  id: eventData?.id || null,
  title: eventData?.title || '',
  date: eventData?.start ? dayjs(eventData.start) : null,
  endDate:
    eventData?.allDay === true
      ? eventData?.end
        ? dayjs(eventData.end).subtract(1, 'day')
        : eventData?.start
          ? dayjs(eventData.start)
          : null
      : null,
  startTime: eventData?.start ? dayjs(eventData.start) : null,
  endTime: eventData?.end ? dayjs(eventData.end) : null,
  allDay: eventData?.allDay === true,
  studentGroup: eventData?.extendedProps?.studentGroup || '',
  location: eventData?.extendedProps?.location || '',
  description: eventData?.extendedProps?.description || '',
  color: eventData?.backgroundColor || eventData?.color || '#1976d2',
  createdBy: eventData?.extendedProps?.createdBy || null
});

const CalendarEventDetailModal = ({ open, eventData, canEdit, onClose, onSave }) => {
  const isAllDay = eventData?.allDay === true;
  const endDate =
    isAllDay && eventData?.end ? dayjs(eventData.end).subtract(1, 'day').toDate() : eventData?.end;
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(mapEventToFormData(eventData));

  useEffect(() => {
    setFormData(mapEventToFormData(eventData));
    setIsEditing(false);
  }, [eventData, open]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartTimeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      startTime: value,
      endTime: value ? dayjs(value).add(1, 'hour') : null
    }));
  };

  const handleAllDayChange = (checked) => {
    setFormData((prev) => {
      if (!checked) {
        return {
          ...prev,
          allDay: false
        };
      }

      const today = dayjs();
      const startDate = prev.date || today;
      const endDate = prev.endDate || startDate;

      return {
        ...prev,
        allDay: true,
        date: startDate,
        endDate
      };
    });
  };

  const isFormValid = () => {
    return (
      formData.title.trim() !== '' &&
      formData.date !== null &&
      (!formData.allDay || formData.endDate !== null) &&
      (formData.allDay
        ? !dayjs(formData.endDate).isBefore(dayjs(formData.date), 'day')
        : formData.startTime !== null && formData.endTime !== null)
    );
  };

  const handleSave = () => {
    onSave({
      id: formData.id,
      title: formData.title,
      date: formData.date,
      endDate: formData.endDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      allDay: formData.allDay,
      studentGroup: formData.studentGroup,
      location: formData.location,
      description: formData.description,
      color: formData.color,
      createdBy: formData.createdBy
    });

    setIsEditing(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: 3,
          width: 'min(560px, calc(100% - 32px))',
          overflow: 'visible'
        }
      }}
    >
      <DialogTitle
        sx={{
          pb: 1,
          fontWeight: 600
        }}
      >
        Detail eventu
      </DialogTitle>

      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          pt: 2.5,
          overflowY: 'visible'
        }}
      >
        {isEditing ? (
          <>
            <TextField
              label="Názov eventu"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
              fullWidth
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.allDay}
                  onChange={(e) => handleAllDayChange(e.target.checked)}
                />
              }
              label="Celodenný event"
            />

            {formData.allDay ? (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Dátum od"
                    value={formData.date}
                    onChange={(newValue) => {
                      handleInputChange('date', newValue);

                      if (
                        newValue &&
                        formData.endDate &&
                        dayjs(formData.endDate).isBefore(dayjs(newValue), 'day')
                      ) {
                        handleInputChange('endDate', newValue);
                      }
                    }}
                    format="DD.MM.YYYY"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Dátum do"
                    value={formData.endDate}
                    onChange={(newValue) => handleInputChange('endDate', newValue)}
                    minDate={formData.date || undefined}
                    format="DD.MM.YYYY"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true
                      }
                    }}
                  />
                </Grid>
              </Grid>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <DatePicker
                    label="Dátum eventu"
                    value={formData.date}
                    onChange={(newValue) => handleInputChange('date', newValue)}
                    format="DD.MM.YYYY"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TimePicker
                    label="Začiatok"
                    value={formData.startTime}
                    onChange={handleStartTimeChange}
                    ampm={false}
                    format="HH:mm"
                    slotProps={{
                      textField: {
                        fullWidth: true
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TimePicker
                    label="Koniec"
                    value={formData.endTime}
                    onChange={(newValue) => handleInputChange('endTime', newValue)}
                    ampm={false}
                    format="HH:mm"
                    slotProps={{
                      textField: {
                        fullWidth: true
                      }
                    }}
                  />
                </Grid>
              </Grid>
            )}

            <TextField
              label="Študijná skupina"
              value={formData.studentGroup}
              onChange={(e) => handleInputChange('studentGroup', e.target.value)}
              fullWidth
            />

            <TextField
              label="Miesto / lokácia"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              fullWidth
            />

            <TextField
              label="Popis eventu"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </>
        ) : (
          <>
            <TextField
              label="Názov eventu"
              value={eventData?.title || ''}
              fullWidth
              InputProps={{ readOnly: true }}
            />

            {isAllDay ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 2
                }}
              >
                <TextField
                  label="Dátum od"
                  value={formatDateValue(eventData?.start)}
                  fullWidth
                  InputProps={{ readOnly: true }}
                />

                <TextField
                  label="Dátum do"
                  value={formatDateValue(endDate || eventData?.start)}
                  fullWidth
                  InputProps={{ readOnly: true }}
                />
              </Box>
            ) : (
              <TextField
                label="Dátum eventu"
                value={formatDateValue(eventData?.start)}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            )}

            {!isAllDay && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 2
                }}
              >
                <TextField
                  label="Začiatok"
                  value={formatTimeValue(eventData?.start)}
                  fullWidth
                  InputProps={{ readOnly: true }}
                />

                <TextField
                  label="Koniec"
                  value={formatTimeValue(eventData?.end)}
                  fullWidth
                  InputProps={{ readOnly: true }}
                />
              </Box>
            )}

            <TextField
              label="Študijná skupina"
              value={eventData?.extendedProps?.studentGroup || ''}
              fullWidth
              InputProps={{ readOnly: true }}
            />

            <TextField
              label="Miesto / lokácia"
              value={eventData?.extendedProps?.location || ''}
              fullWidth
              InputProps={{ readOnly: true }}
            />

            <TextField
              label="Popis eventu"
              value={eventData?.extendedProps?.description || ''}
              multiline
              rows={3}
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          gap: 1
        }}
      >
        {canEdit && !isEditing && (
          <Button variant="outlined" onClick={() => setIsEditing(true)}>
            Upraviť event
          </Button>
        )}

        {canEdit && isEditing && (
          <Button variant="outlined" color="inherit" onClick={() => setIsEditing(false)}>
            Zrušiť úpravu
          </Button>
        )}

        {canEdit && isEditing && (
          <Button variant="contained" onClick={handleSave} disabled={!isFormValid()}>
            Uložiť zmeny
          </Button>
        )}

        <Button variant={isEditing ? 'text' : 'contained'} onClick={handleClose}>
          Zavrieť
        </Button>
      </DialogActions>
    </Dialog>
  );
};

CalendarEventDetailModal.propTypes = {
  open: PropTypes.bool.isRequired,
  eventData: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    start: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date), PropTypes.object]),
    end: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date), PropTypes.object]),
    allDay: PropTypes.bool,
    backgroundColor: PropTypes.string,
    extendedProps: PropTypes.shape({
      createdBy: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      studentGroup: PropTypes.string,
      location: PropTypes.string,
      description: PropTypes.string
    })
  }),
  canEdit: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};

export default CalendarEventDetailModal;
