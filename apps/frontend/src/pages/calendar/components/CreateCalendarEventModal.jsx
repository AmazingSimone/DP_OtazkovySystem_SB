import * as authService from '@app/pages/auth/authService';
import { useGetTeacherMeQuery } from '@app/redux/api';
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
import PropTypes from 'prop-types';
import { useState } from 'react';

const CreateCalendarEventModal = ({ open, onClose, onEventCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    date: null,
    startTime: null,
    endTime: null,
    allDay: false,
    studentGroup: '',
    location: '',
    description: '',
    color: '#1976d2'
  });

  const storedUser = authService.getUserFromStorage();
  const isTeacherFromStorage = storedUser?.isTeacher === true;

  const { data: teacherData, isLoading: isLoadingTeacher } = useGetTeacherMeQuery(undefined, {
    skip: !isTeacherFromStorage
  });

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const isFormValid = () => {
    return (
      formData.title.trim() !== '' &&
      formData.date !== null &&
      formData.location.trim() !== '' &&
      (formData.allDay || (formData.startTime !== null && formData.endTime !== null))
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const eventData = {
        title: formData.title,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        allDay: formData.allDay,
        studentGroup: formData.studentGroup,
        location: formData.location,
        description: formData.description,
        color: formData.color,
        createdBy: teacherData?._id
      };

      onEventCreated(eventData);
      handleClose();
    } catch (err) {
      console.error(err);
      setError('Nepodarilo sa vytvoriť event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      date: null,
      startTime: null,
      endTime: null,
      allDay: false,
      studentGroup: '',
      location: '',
      description: '',
      color: '#1976d2'
    });

    setError(null);
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
        <TextField
          label="Názov eventu"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          required
          fullWidth
        />

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

        <FormControlLabel
          control={
            <Checkbox
              checked={formData.allDay}
              onChange={(e) => handleInputChange('allDay', e.target.checked)}
            />
          }
          label="Celodenný event"
        />

        {!formData.allDay && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TimePicker
                label="Začiatok"
                value={formData.startTime}
                onChange={(newValue) => handleInputChange('startTime', newValue)}
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
          helperText="Neskôr bude napojené na databázu skupín"
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

        <Box>
          <TextField
            label="Farba eventu"
            type="color"
            value={formData.color}
            onChange={(e) => handleInputChange('color', e.target.value)}
            InputLabelProps={{
              shrink: true
            }}
            sx={{
              width: 180
            }}
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
          onClick={handleSubmit}
          disabled={isSubmitting || isLoadingTeacher || !isFormValid()}
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
