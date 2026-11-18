//TODO hover v inpute nie je poriade vidno
import * as authService from '@app/pages/auth/authService';
import { useCreateQuestionMutation } from '@app/redux/api';
import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Radio,
  RadioGroup,
  TextField,
  Tooltip
} from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

const DEFAULT_OPTIONS = ['', '', '', ''];

const AddQuestionModal = ({ disabled = false, modulId, onCreated }) => {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState(DEFAULT_OPTIONS);
  const [correctIndex, setCorrectIndex] = React.useState(0);
  const auth = authService.getUserFromStorage();
  const [createQuestion, { isLoading }] = useCreateQuestionMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    mode: 'onBlur',
    defaultValues: {
      text: '',
      options: DEFAULT_OPTIONS,
      correct: 0
    }
  });

  const handleClickOpen = () => setOpen(true);

  const handleClose = () => {
    setOpen(false);
    reset();
    setOptions(DEFAULT_OPTIONS);
    setCorrectIndex(0);
  };

  const handleOptionChange = (idx, value) => {
    const newOptions = [...options];
    newOptions[idx] = value;
    setOptions(newOptions);
  };

  const handleRadioChange = (event) => {
    setCorrectIndex(Number(event.target.value));
  };

  const onSubmit = async (data) => {
    // Prepare data for backend schema
    const payload = {
      text: data.text,
      options: {
        a: options[0],
        b: options[1],
        c: options[2],
        d: options[3]
      },
      correct: ['a', 'b', 'c', 'd'][correctIndex],
      modul: modulId, // pass modulId as prop
      createdBy: auth.id // pass createdBy as prop
    };

    try {
      const created = await createQuestion(payload).unwrap();
      toast.success('Otázka bola úspešne pridaná');
      // notify parent so it can render the created question inline
      if (onCreated) onCreated(created);
      handleClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Chyba pri pridávaní otázky. Skúste to neskôr.');
    }
  };

  return (
    <>
      <Tooltip title="Pridať otázku" key={'addQuestion'}>
        <span>
          <IconButton color="primary" onClick={handleClickOpen} disabled={disabled}>
            <AddIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Dialog
        open={open}
        onClose={handleClose}
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            mx: { xs: 1, sm: 2 },
            width: { xs: 'calc(100% - 16px)', sm: 'auto' }
          }
        }}
      >
        <DialogTitle sx={{ pb: 0, fontWeight: 600, marginBottom: 2 }}>Pridaj otázku</DialogTitle>
        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            mx: 'auto',
            px: { xs: 2, sm: 3 },
            minWidth: { md: '30rem', xs: '100%' }
          }}
        >
          <TextField
            label="Znenie otázky"
            variant="outlined"
            multiline
            minRows={3}
            {...register('text', { required: 'Pole je povinné' })}
            error={!!errors.text}
            helperText={errors.text?.message}
            fullWidth
          />

          <RadioGroup
            name="correct"
            value={correctIndex}
            onChange={handleRadioChange}
            sx={{
              flexDirection: 'column',
              gap: 2
            }}
          >
            {['a', 'b', 'c', 'd'].map((key, idx) => (
              <Box
                key={key}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Radio value={idx} checked={correctIndex === idx} sx={{ p: 1 }} />
                <TextField
                  label={`Odpoveď ${key.toUpperCase()}`}
                  variant="outlined"
                  value={options[idx]}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  fullWidth
                  required
                />
              </Box>
            ))}
          </RadioGroup>
        </DialogContent>
        <DialogActions
          disableSpacing
          sx={{
            px: { xs: 2, sm: 3 },
            pb: 2,
            gap: 1,
            flexWrap: 'wrap',
            justifyContent: { xs: 'stretch', sm: 'flex-end' }
          }}
        >
          <Button
            onClick={handleClose}
            color="error"
            variant="outlined"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Zrušiť
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Pridaj
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

AddQuestionModal.propTypes = {
  disabled: PropTypes.bool,
  modulId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  createdBy: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onCreated: PropTypes.func
};
export default AddQuestionModal;
