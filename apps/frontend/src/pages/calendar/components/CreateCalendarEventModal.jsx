import * as authService from '@app/pages/auth/authService';
import { useGetTeacherMeQuery, useGetUsersListQuery } from '@app/redux/api';
import { joiResolver } from '@hookform/resolvers/joi';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
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
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { calendarEventSchema } from '../calendarEvent.schema';

const createInitialFormData = () => {
  const today = dayjs();

  return {
    title: '',
    date: today,
    endDate: today,
    startTime: null,
    endTime: null,
    allDay: false,
    studentGroup: [],
    location: '',
    description: '',
    color: '#1976d2'
  };
};

const isValidDayjs = (value) => dayjs.isDayjs(value) && value.isValid();

const CreateCalendarEventModal = ({ open, onClose, onEventCreated }) => {
  const storedUser = authService.getUserFromStorage();
  const isTeacherFromStorage = storedUser?.isTeacher === true;
  const canAssignStudentGroups = isTeacherFromStorage || storedUser?.isAdmin === true;

  const { data: teacherData, isLoading: isLoadingTeacher } = useGetTeacherMeQuery(undefined, {
    skip: !isTeacherFromStorage
  });

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submitAttempted, setSubmitAttempted] = useState(false);

  const {
    control,
    handleSubmit: handleValidatedSubmit,
    formState: { errors, isSubmitted, isValid },
    reset,
    setValue,
    getValues,
    trigger,
    watch
  } = useForm({
    resolver: joiResolver(calendarEventSchema),
    mode: 'onChange',
    defaultValues: createInitialFormData()
  });

  const allDay = watch('allDay');
  const selectedDate = watch('date');
  const studentGroupValue = watch('studentGroup');

  // Fetch all users to extract unique group numbers
  const { data: usersData = [], isLoading: isLoadingUsers } = useGetUsersListQuery(undefined, {
    skip: !canAssignStudentGroups
  });

  // Extract unique group numbers and sort them
  const uniqueGroups = useMemo(() => {
    return [
      ...new Set(usersData.filter((user) => user.groupNumber).map((user) => user.groupNumber))
    ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [usersData]);

  const [groupsInitialized, setGroupsInitialized] = useState(false);

  useEffect(() => {
    if (!groupsInitialized && canAssignStudentGroups && uniqueGroups.length > 0) {
      setValue('studentGroup', uniqueGroups);
      setGroupsInitialized(true);
    }
  }, [groupsInitialized, canAssignStudentGroups, uniqueGroups, setValue]);

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
    const endDate = getValues('endDate') || startDate;

    setValue('date', startDate, { shouldDirty: true, shouldValidate: true });
    setValue('endDate', endDate, { shouldDirty: true, shouldValidate: true });
    trigger(['date', 'endDate']);
  };

  const handleClose = () => {
    reset({
      ...createInitialFormData(),
      studentGroup: uniqueGroups
    });
    setError(null);
    setSubmitAttempted(false);
    onClose();
  };

  const submitCalendarEvent = async (data) => {
    setSubmitAttempted(true);
    setIsSubmitting(true);
    setError(null);

    const eventData = {
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
      createdBy: teacherData?._id
    };

    try {
      await onEventCreated(eventData);
      handleClose();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Nepodarilo sa vytvoriť event.');
    } finally {
      setIsSubmitting(false);
    }
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
        Vytvoriť nový event
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
                        setValue('endDate', newValue, { shouldDirty: true, shouldValidate: true });
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

                    if (isValidDayjs(startDate) && dayjs(value).isBefore(dayjs(startDate), 'day')) {
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
          <>
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

            <Grid container spacing={2}>
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
                          helperText: (submitAttempted || isSubmitted) && errors.startTime?.message
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
          </>
        )}

        {canAssignStudentGroups && (
          <Controller
            name="studentGroup"
            control={control}
            render={({ field }) => (
              <Autocomplete
                multiple
                options={uniqueGroups}
                value={field.value || []}
                onChange={(event, newValue) => {
                  field.onChange(newValue || []);
                }}
                loading={isLoadingUsers}
                renderInput={(params) => (
                  <TextField {...params} label="Študijné skupiny" placeholder="Vyberte skupiny" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...chipProps } = getTagProps({ index });

                    return <Chip key={key} label={option} {...chipProps} />;
                  })
                }
                fullWidth
                noOptionsText="Žiadne študijné skupiny nie sú dostupné"
              />
            )}
          />
        )}

        <Controller
          name="location"
          control={control}
          render={({ field }) => <TextField {...field} label="Miesto / lokácia" fullWidth />}
        />

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="Popis eventu" multiline rows={3} fullWidth />
          )}
        />

        <Box>
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
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          gap: 1
        }}
      >
        <Button color="error" variant="outlined" onClick={handleClose}>
          Zrušiť
        </Button>

        <Button
          variant="contained"
          onClick={handleValidatedSubmit(submitCalendarEvent)}
          disabled={isSubmitting || isLoadingTeacher || isLoadingUsers || !isValid}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
        >
          {isSubmitting ? 'Vytváram...' : 'Vytvoriť event'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

CreateCalendarEventModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onEventCreated: PropTypes.func.isRequired
};

export default CreateCalendarEventModal;
