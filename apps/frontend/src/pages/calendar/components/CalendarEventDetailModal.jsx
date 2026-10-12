import { joiResolver } from '@hookform/resolvers/joi';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  TextField
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { calendarEventSchema } from '../calendarEvent.schema';

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
  studentGroup: Array.isArray(eventData?.extendedProps?.studentGroup)
    ? eventData?.extendedProps?.studentGroup
    : [],
  location: eventData?.extendedProps?.location || '',
  description: eventData?.extendedProps?.description || '',
  color: eventData?.backgroundColor || eventData?.color || '#1976d2',
  createdBy:
    eventData?.extendedProps?.createdBy?._id ||
    eventData?.extendedProps?.createdBy?.id ||
    eventData?.extendedProps?.createdBy ||
    null
});

const CalendarEventDetailModal = ({ open, eventData, canEdit, onClose, onSave, onDelete }) => {
  const isAllDay = eventData?.allDay === true;
  const endDate =
    isAllDay && eventData?.end ? dayjs(eventData.end).subtract(1, 'day').toDate() : eventData?.end;
  const [isEditing, setIsEditing] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitted, isValid },
    reset,
    setValue,
    getValues,
    trigger,
    watch
  } = useForm({
    resolver: joiResolver(calendarEventSchema),
    mode: 'onChange',
    defaultValues: mapEventToFormData(eventData)
  });

  const allDay = watch('allDay');
  const selectedDate = watch('date');

  useEffect(() => {
    reset(mapEventToFormData(eventData));
    setIsEditing(false);
    setSubmitAttempted(false);
    setError(null);
  }, [eventData, open, reset]);

  const handleStartTimeChange = (value) => {
    setValue('startTime', value, { shouldDirty: true, shouldValidate: true });
    setValue('endTime', value ? dayjs(value).add(1, 'hour') : null, {
      shouldDirty: true,
      shouldValidate: true
    });
  };

  const handleAllDayChange = (checked) => {
    setValue('allDay', checked, { shouldDirty: true, shouldValidate: true });

    if (!checked) {
      trigger(['date', 'startTime', 'endTime']);
      return;
    }

    const today = dayjs();
    const startDate = getValues('date') || today;
    const endValue = getValues('endDate') || startDate;

    setValue('date', startDate, { shouldDirty: true, shouldValidate: true });
    setValue('endDate', endValue, { shouldDirty: true, shouldValidate: true });
    trigger(['date', 'endDate']);
  };

  const handleSave = async (data) => {
    setSubmitAttempted(true);
    setError(null);

    try {
      await onSave({
        id: data.id,
        title: data.title.trim(),
        date: data.date,
        endDate: data.endDate,
        startTime: data.startTime,
        endTime: data.endTime,
        allDay: data.allDay,
        studentGroup: Array.isArray(data.studentGroup) ? data.studentGroup : [],
        location: data.location?.trim() || '',
        description: data.description?.trim() || '',
        color: data.color,
        createdBy: data.createdBy
      });

      setIsEditing(false);
      setSubmitAttempted(false);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Nepodarilo sa uložiť event.');
    }
  };

  const handleClose = () => {
    reset(mapEventToFormData(eventData));
    setIsEditing(false);
    setSubmitAttempted(false);
    onClose();
  };

  const handleCancelEdit = () => {
    reset(mapEventToFormData(eventData));
    setIsEditing(false);
    setSubmitAttempted(false);
  };

  const handleDelete = async () => {
    if (!eventData?.id) {
      return;
    }

    const shouldDelete = window.confirm('Naozaj chcete vymazať tento event?');

    if (!shouldDelete) {
      return;
    }

    await onDelete(eventData.id);
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
            <Controller
              name="title"
              control={control}
              rules={{
                validate: (value) => (value?.trim() ? true : 'Nazov eventu je povinny')
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Názov eventu"
                  required
                  fullWidth
                  error={(submitAttempted || isSubmitted) && !!errors.title}
                  helperText={(submitAttempted || isSubmitted) && errors.title?.message}
                />
              )}
            />

            <Controller
              name="allDay"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={(e) => handleAllDayChange(e.target.checked)}
                    />
                  }
                  label="Celodenný event"
                />
              )}
            />

            {allDay ? (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="date"
                    control={control}
                    rules={{
                      validate: (value) => (isValidDayjs(value) ? true : 'Datum eventu je povinny')
                    }}
                    render={({ field }) => (
                      <DatePicker
                        label="Dátum od"
                        value={field.value}
                        onChange={(newValue) => {
                          field.onChange(newValue);

                          const currentEndDate = getValues('endDate');

                          if (
                            newValue &&
                            currentEndDate &&
                            dayjs(currentEndDate).isBefore(dayjs(newValue), 'day')
                          ) {
                            setValue('endDate', newValue, {
                              shouldDirty: true,
                              shouldValidate: true
                            });
                          }
                        }}
                        format="DD.MM.YYYY"
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            required: true,
                            error: (submitAttempted || isSubmitted) && !!errors.date,
                            helperText: (submitAttempted || isSubmitted) && errors.date?.message
                          }
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="endDate"
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (!allDay) {
                          return true;
                        }

                        if (!isValidDayjs(value)) {
                          return 'Datum do je povinny';
                        }

                        const startDate = getValues('date');

                        if (
                          isValidDayjs(startDate) &&
                          dayjs(value).isBefore(dayjs(startDate), 'day')
                        ) {
                          return 'Datum do musi byt rovnaky alebo neskorsi ako datum od';
                        }

                        return true;
                      }
                    }}
                    render={({ field }) => (
                      <DatePicker
                        label="Dátum do"
                        value={field.value}
                        onChange={field.onChange}
                        minDate={selectedDate || undefined}
                        format="DD.MM.YYYY"
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            required: true,
                            error: (submitAttempted || isSubmitted) && !!errors.endDate,
                            helperText: (submitAttempted || isSubmitted) && errors.endDate?.message
                          }
                        }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="date"
                    control={control}
                    rules={{
                      validate: (value) => (isValidDayjs(value) ? true : 'Datum eventu je povinny')
                    }}
                    render={({ field }) => (
                      <DatePicker
                        label="Dátum eventu"
                        value={field.value}
                        onChange={field.onChange}
                        format="DD.MM.YYYY"
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            required: true,
                            error: (submitAttempted || isSubmitted) && !!errors.date,
                            helperText: (submitAttempted || isSubmitted) && errors.date?.message
                          }
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="startTime"
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (allDay) {
                          return true;
                        }

                        return isValidDayjs(value) ? true : 'Zaciatocny cas je povinny';
                      }
                    }}
                    render={({ field }) => (
                      <TimePicker
                        label="Začiatok"
                        value={field.value}
                        onChange={handleStartTimeChange}
                        ampm={false}
                        format="HH:mm"
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: (submitAttempted || isSubmitted) && !!errors.startTime,
                            helperText:
                              (submitAttempted || isSubmitted) && errors.startTime?.message
                          }
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="endTime"
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (allDay) {
                          return true;
                        }

                        if (!isValidDayjs(value)) {
                          return 'Koncovy cas je povinny';
                        }

                        const startTime = getValues('startTime');

                        if (isValidDayjs(startTime) && !dayjs(value).isAfter(dayjs(startTime))) {
                          return 'Koncovy cas musi byt neskor ako zaciatocny cas';
                        }

                        return true;
                      }
                    }}
                    render={({ field }) => (
                      <TimePicker
                        label="Koniec"
                        value={field.value}
                        onChange={field.onChange}
                        ampm={false}
                        format="HH:mm"
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: (submitAttempted || isSubmitted) && !!errors.endTime,
                            helperText: (submitAttempted || isSubmitted) && errors.endTime?.message
                          }
                        }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            )}

            <Controller
              name="studentGroup"
              control={control}
              render={({ field }) => <TextField {...field} label="Študijná skupina" fullWidth />}
            />

            <Controller
              name="location"
              control={control}
              render={({ field }) => <TextField {...field} label="Miesto / lokácia" fullWidth />}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Popis eventu"
                  onChange={field.onChange}
                  multiline
                  rows={3}
                  fullWidth
                />
              )}
            />

            <Controller
              name="color"
              control={control}
              rules={{
                validate: (value) => (value ? true : 'Farba eventu je povinna')
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Farba eventu"
                  type="color"
                  InputLabelProps={{
                    shrink: true
                  }}
                  sx={{
                    width: 180
                  }}
                  error={(submitAttempted || isSubmitted) && !!errors.color}
                  helperText={(submitAttempted || isSubmitted) && errors.color?.message}
                />
              )}
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
              label="Študijné skupiny"
              value={
                Array.isArray(eventData?.extendedProps?.studentGroup)
                  ? eventData?.extendedProps?.studentGroup.join(', ')
                  : ''
              }
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

        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          gap: 1,
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
          <Button variant={isEditing ? 'text' : 'outlined'} color="error" onClick={handleClose}>
            Zrušiť
          </Button>

          {canEdit && !isEditing && (
            <Button variant="contained" onClick={() => setIsEditing(true)}>
              Upraviť event
            </Button>
          )}

          {canEdit && isEditing && (
            <IconButton
              color="error"
              onClick={handleDelete}
              aria-label="Vymazať event"
              title="Vymazať event"
            >
              <DeleteIcon />
            </IconButton>
          )}

          {canEdit && isEditing && (
            <Button variant="outlined" color="error" onClick={handleCancelEdit}>
              Zrušiť úpravu
            </Button>
          )}

          {canEdit && isEditing && (
            <Button variant="contained" onClick={handleSubmit(handleSave)} disabled={!isValid}>
              Uložiť zmeny
            </Button>
          )}
        </Box>
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
      studentGroup: PropTypes.arrayOf(PropTypes.string),
      location: PropTypes.string,
      description: PropTypes.string
    })
  }),
  canEdit: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default CalendarEventDetailModal;
