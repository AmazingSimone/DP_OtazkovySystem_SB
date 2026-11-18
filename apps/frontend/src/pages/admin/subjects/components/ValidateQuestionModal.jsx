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
  TextField,
  Typography
} from '@mui/material';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

/**
 * Week 2: a student reviews a question that was dealt to them.
 * The author stays anonymous; the answer marked as correct is shown so it can be judged.
 * A "fault" verdict needs a comment (the server enforces the same rule).
 */
const ValidateQuestionModal = ({
  open = false,
  question = null,
  assignment = null,
  onClose = () => {},
  onSubmit = () => {}
}) => {
  const [valid, setValid] = useState('valid');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (open && assignment?.validated) {
      setValid(assignment.validation_result ? 'valid' : 'invalid');
      setComment(assignment.validation_comment || '');
    } else {
      setValid('valid');
      setComment('');
    }
  }, [open, question, assignment]);

  if (!question) return null;

  const commentMissing = valid === 'invalid' && !comment.trim();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          mx: { xs: 1, sm: 2 },
          width: { xs: 'calc(100% - 16px)', sm: 'auto' }
        }
      }}
    >
      <DialogTitle>Recenzia otázky</DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
        <Typography sx={{ mb: 1, fontWeight: 600 }}>{question.text}</Typography>
        <Box sx={{ mb: 2 }}>
          {question.options &&
            Object.entries(question.options).map(([key, value]) => (
              <Typography
                key={key}
                variant="body2"
                sx={{
                  color: key === question.correct ? 'success.dark' : 'text.secondary',
                  fontWeight: key === question.correct ? 600 : 400,
                  ml: 1
                }}
              >
                {key.toUpperCase()}) {value} {key === question.correct && '✓ (označená ako správna)'}
              </Typography>
            ))}
        </Box>
        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <FormLabel component="legend">Je otázka v poriadku?</FormLabel>
          <RadioGroup
            value={valid}
            onChange={(e) => setValid(e.target.value)}
            row
            sx={{ flexWrap: 'wrap' }}
          >
            <FormControlLabel value="valid" control={<Radio />} label="Validná" />
            <FormControlLabel value="invalid" control={<Radio />} label="Chybná" />
          </RadioGroup>
        </FormControl>

        <TextField
          label={valid === 'invalid' ? 'Komentár (povinný)' : 'Komentár'}
          fullWidth
          multiline
          minRows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          error={commentMissing}
          helperText={commentMissing ? 'Pri chybnej otázke napíš, čo je na nej zlé.' : ' '}
        />
      </DialogContent>
      <DialogActions disableSpacing sx={{ flexWrap: 'wrap', gap: 1, px: { xs: 2, sm: 3 }, pb: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="error"
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Zrušiť
        </Button>
        <Button
          variant="contained"
          disabled={commentMissing}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
          onClick={() => {
            if (onSubmit && question && question._id) {
              onSubmit(question._id, { valid: valid === 'valid', comment: comment.trim() });
            }
            onClose();
          }}
        >
          Odoslať
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ValidateQuestionModal;

ValidateQuestionModal.propTypes = {
  open: PropTypes.bool,
  question: PropTypes.shape({
    _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    text: PropTypes.string,
    options: PropTypes.object,
    correct: PropTypes.string
  }),
  assignment: PropTypes.shape({
    validated: PropTypes.bool,
    validation_result: PropTypes.bool,
    validation_comment: PropTypes.string
  }),
  onClose: PropTypes.func,
  onSubmit: PropTypes.func
};
