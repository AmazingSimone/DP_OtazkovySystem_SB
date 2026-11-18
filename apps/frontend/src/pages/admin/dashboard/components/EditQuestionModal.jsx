import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const EditQuestionModal = ({ open, question, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    text: '',
    options: {
      a: '',
      b: '',
      c: '',
      d: ''
    },
    correct: 'a'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when question changes
  useEffect(() => {
    if (question && open) {
      setFormData({
        text: question.text || '',
        options: {
          a: question.options?.a || '',
          b: question.options?.b || '',
          c: question.options?.c || '',
          d: question.options?.d || ''
        },
        correct: question.correct || 'a'
      });
    }
  }, [question, open]);

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.text.trim()) {
      alert('Zadajte text otázky');
      return;
    }

    if (
      !formData.options.a.trim() ||
      !formData.options.b.trim() ||
      !formData.options.c.trim() ||
      !formData.options.d.trim()
    ) {
      alert('Všetky odpovede musia byť vyplnené');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(question._id, {
        text: formData.text.trim(),
        options: {
          a: formData.options.a.trim(),
          b: formData.options.b.trim(),
          c: formData.options.c.trim(),
          d: formData.options.d.trim()
        },
        correct: formData.correct
      });
      toast.success('Otázka bola úspešne aktualizovaná');
      onClose();
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error(error?.data?.message || 'Chyba pri aktualizácii otázky');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOptionChange = (optionKey, value) => {
    setFormData((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        [optionKey]: value
      }
    }));
  };

  if (!question) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          mx: { xs: 1, sm: 2 },
          width: { xs: 'calc(100% - 16px)', sm: 'auto' }
        }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Typography variant="h6">Upraviť otázku</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Môžete upravovať otázku počas povoleného týždňa
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Question text */}
            <TextField
              label="Text otázky"
              multiline
              rows={3}
              value={formData.text}
              onChange={(e) => setFormData((prev) => ({ ...prev, text: e.target.value }))}
              required
              fullWidth
              disabled={isSubmitting}
            />

            {/* Answer options */}
            <Stack spacing={2}>
              <Typography variant="subtitle2">Možnosti odpovedí:</Typography>
              {['a', 'b', 'c', 'd'].map((optionKey) => (
                <TextField
                  key={optionKey}
                  label={`Odpoveď ${optionKey.toUpperCase()}`}
                  value={formData.options[optionKey]}
                  onChange={(e) => handleOptionChange(optionKey, e.target.value)}
                  required
                  fullWidth
                  disabled={isSubmitting}
                />
              ))}
            </Stack>

            {/* Correct answer selection */}
            <FormControl component="fieldset" disabled={isSubmitting}>
              <FormLabel component="legend">Správna odpoveď:</FormLabel>
              <RadioGroup
                row
                value={formData.correct}
                onChange={(e) => setFormData((prev) => ({ ...prev, correct: e.target.value }))}
                sx={{ flexWrap: 'wrap' }}
              >
                {['a', 'b', 'c', 'd'].map((optionKey) => (
                  <FormControlLabel
                    key={optionKey}
                    value={optionKey}
                    control={<Radio />}
                    label={`${optionKey.toUpperCase()}) ${formData.options[optionKey] || '(prázdne)'}`}
                  />
                ))}
              </RadioGroup>
            </FormControl>

            {/* Preview */}
            <Stack spacing={1}>
              <Typography variant="subtitle2">Náhľad otázky:</Typography>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'grey.50'
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                  {formData.text || 'Text otázky...'}
                </Typography>
                {['a', 'b', 'c', 'd'].map((optionKey) => (
                  <Typography
                    key={optionKey}
                    variant="body2"
                    sx={{
                      ml: 1,
                      color: optionKey === formData.correct ? 'success.main' : 'text.secondary',
                      fontWeight: optionKey === formData.correct ? 600 : 400
                    }}
                  >
                    {optionKey.toUpperCase()}) {formData.options[optionKey] || '(prázdne)'}
                    {optionKey === formData.correct && ' ✓'}
                  </Typography>
                ))}
              </Box>
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions
          disableSpacing
          sx={{
            flexWrap: 'wrap',
            gap: 1,
            px: { xs: 2, sm: 3 },
            pb: 2,
            justifyContent: { xs: 'stretch', sm: 'flex-end' }
          }}
        >
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
            color="error"
            variant="outlined"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Zrušiť
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {isSubmitting ? 'Ukladanie...' : 'Uložiť zmeny'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

EditQuestionModal.propTypes = {
  open: PropTypes.bool.isRequired,
  question: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};

export default EditQuestionModal;
