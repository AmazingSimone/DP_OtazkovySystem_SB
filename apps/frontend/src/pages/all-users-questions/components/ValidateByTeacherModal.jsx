import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Typography
} from '@mui/material';
import { format } from 'date-fns';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { fullName, REVIEW_TAG_LABELS, TEACHER_STATUS, teacherStatusOf } from '@app/utils/questionFlowLabels';

const DECISIONS = {
  approved: {
    label: 'Schváliť',
    hint: 'Otázka spĺňa štandardy a zaradí sa do zásobníka otázok pre testy.',
    button: 'Schváliť otázku',
    color: 'primary'
  },
  rejected: {
    label: 'Zamietnuť',
    hint: 'Otázka sa do testov nedostane. Body študentov sa nemenia.',
    button: 'Zamietnuť otázku',
    color: 'warning'
  },
  abuse: {
    label: 'Zamietnuť ako zneužitie',
    hint: 'Napríklad vtip alebo nezmysel. Autorovi sa strhnú body získané za túto otázku a recenzentovi, ktorý ju označil ako validnú, bod za recenziu.',
    button: 'Zamietnuť a strhnúť body',
    color: 'error'
  }
};

const Options = ({ options, correct }) => (
  <List dense>
    {Object.entries(options || {}).map(([key, value]) => (
      <ListItem key={key} sx={{ py: 0.5 }}>
        <ListItemText
          primary={
            <Box display="flex" alignItems="center">
              <Chip
                label={key.toUpperCase()}
                size="small"
                color={correct === key ? 'success' : 'default'}
                sx={{ mr: 1, minWidth: 32 }}
              />
              <Typography sx={{ fontWeight: correct === key ? 'bold' : 'normal' }}>{value}</Typography>
            </Box>
          }
        />
      </ListItem>
    ))}
  </List>
);

Options.propTypes = { options: PropTypes.object, correct: PropTypes.string };

/**
 * The teacher's final decision on a question: approve, reject, or reject as abuse.
 * Shows everything needed to judge it: who wrote it, who reviewed it and how, what the author
 * answered, and the original wording if the author changed the question after the review.
 */
const ValidateByTeacherModal = ({ open, onClose, question, onSubmit, isSubmitting }) => {
  const [decision, setDecision] = useState('approved');
  const [comment, setComment] = useState('');
  const [extraPenalty, setExtraPenalty] = useState('');

  useEffect(() => {
    if (open && question) {
      const current = teacherStatusOf(question);
      setDecision(current === 'pending' ? 'approved' : current);
      setComment(question.validated_by_teacher_comment || '');
    } else {
      setDecision('approved');
      setComment('');
    }
    setExtraPenalty('');
  }, [open, question]);

  if (!question) return null;

  const isStudentQuestion = Boolean(question.published);
  const currentStatus = teacherStatusOf(question);
  const hasReview = Boolean(question.validated_at);
  const response = question.user_agreement?.responded_at ? question.user_agreement : null;
  const extra = extraPenalty === '' ? 0 : Number(extraPenalty);
  const extraInvalid = !Number.isFinite(extra) || extra < 0;
  const reviewerPunished = Boolean(question.reviewer) && question.validated === true;

  const handleSubmit = () => {
    if (!comment.trim() || extraInvalid) return;
    onSubmit({
      questionId: question._id,
      status: decision,
      comment: comment.trim(),
      ...(decision === 'abuse' && extra > 0 ? { extraPenalty: extra } : {})
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          m: { xs: 1, sm: 2 },
          width: { xs: 'calc(100% - 16px)', sm: 'auto' }
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
            Posúdenie otázky učiteľom
          </Typography>
          <Chip
            label={TEACHER_STATUS[currentStatus].label}
            color={TEACHER_STATUS[currentStatus].color}
            size="small"
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mt: 0 }}>
          {/* Left column: the question and its history */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Otázka{question.original ? ' (publikovaná verzia)' : ''}:
            </Typography>
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {question.text}
              </Typography>
              <Options options={question.options} correct={question.correct} />
            </Paper>

            {question.original && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
                  Pôvodná verzia pred recenziou:
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {question.original.text}
                  </Typography>
                  <Options options={question.original.options} correct={question.original.correct} />
                </Paper>
              </>
            )}

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Autor:</strong> {fullName(question.createdBy)}
                {question.createdBy?.email ? ` (${question.createdBy.email})` : ''}
              </Typography>
              {isStudentQuestion && (
                <>
                  <Typography variant="body2">
                    <strong>Recenzent:</strong>{' '}
                    {question.reviewer
                      ? `${fullName(question.reviewer)}${question.reviewer.email ? ` (${question.reviewer.email})` : ''}`
                      : 'žiadny'}
                  </Typography>
                  {hasReview && (
                    <Typography variant="body2">
                      <strong>Recenzia:</strong> {question.validated ? 'validná' : 'chybná'}
                      {REVIEW_TAG_LABELS[question.review_tag]
                        ? ` — automatická (${REVIEW_TAG_LABELS[question.review_tag]})`
                        : ''}
                      {question.validation_comment ? ` — „${question.validation_comment}“` : ''}
                    </Typography>
                  )}
                  {response && (
                    <Typography variant="body2">
                      <strong>Vyjadrenie autora:</strong>{' '}
                      {response.agreed ? 'súhlasí s recenziou' : 'nesúhlasí s recenziou'}
                      {response.comment ? ` — „${response.comment}“` : ''}
                    </Typography>
                  )}
                </>
              )}
            </Box>

            {currentStatus !== 'pending' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Aktuálne rozhodnutie:</strong> {TEACHER_STATUS[currentStatus].label}
                  {question.validated_by_teacher_at && (
                    <> dňa {format(new Date(question.validated_by_teacher_at), 'PPp')}</>
                  )}
                </Typography>
                {question.validated_by_teacher_comment && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Komentár:</strong> {question.validated_by_teacher_comment}
                  </Typography>
                )}
              </Alert>
            )}
          </Grid>

          {/* Right column: the decision */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                Rozhodnutie:
              </Typography>

              <FormControl sx={{ mb: 2 }}>
                <RadioGroup value={decision} onChange={(e) => setDecision(e.target.value)}>
                  {Object.entries(DECISIONS)
                    .filter(([key]) => key !== 'abuse' || isStudentQuestion)
                    .map(([key, d]) => (
                      <FormControlLabel
                        key={key}
                        value={key}
                        control={<Radio />}
                        sx={{ alignItems: 'flex-start', mb: 1 }}
                        label={
                          <Box sx={{ pt: 1 }}>
                            <Typography variant="body1">{d.label}</Typography>
                            <Typography variant="body2" color="textSecondary">
                              {d.hint}
                            </Typography>
                          </Box>
                        }
                      />
                    ))}
                </RadioGroup>
              </FormControl>

              {decision === 'abuse' && (
                <>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Body sa strhnú autorovi
                    {reviewerPunished
                      ? ' aj recenzentovi, ktorý otázku označil ako validnú.'
                      : '. Recenzent potrestaný nebude, lebo otázku neoznačil ako validnú.'}{' '}
                    Obaja uvidia zrážku s vaším komentárom, bez mien.
                  </Alert>
                  <TextField
                    fullWidth
                    type="number"
                    label="Dodatočná zrážka pre každého potrestaného (voliteľné)"
                    value={extraPenalty}
                    onChange={(e) => setExtraPenalty(e.target.value)}
                    inputProps={{ min: 0, step: 1 }}
                    error={extraInvalid}
                    helperText={extraInvalid ? 'Zadajte nulu alebo kladné číslo' : 'Navyše k bodom získaným za túto otázku'}
                    sx={{ mb: 2 }}
                  />
                </>
              )}

              <TextField
                fullWidth
                multiline
                rows={5}
                label="Komentár k rozhodnutiu (povinný)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                helperText={
                  decision === 'abuse'
                    ? 'Tento komentár uvidia potrestaní študenti pri zrážke bodov'
                    : 'Vysvetlite svoje rozhodnutie'
                }
                sx={{ flexGrow: 1 }}
              />

              <Box sx={{ display: 'flex', gap: 1, mt: 3, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Button
                  onClick={onClose}
                  disabled={isSubmitting}
                  variant="outlined"
                  color="error"
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Zrušiť
                </Button>
                <Button
                  onClick={handleSubmit}
                  variant="contained"
                  disabled={!comment.trim() || extraInvalid || isSubmitting}
                  color={DECISIONS[decision].color}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {isSubmitting ? (
                    <>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      Ukladám...
                    </>
                  ) : (
                    DECISIONS[decision].button
                  )}
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

ValidateByTeacherModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  question: PropTypes.shape({
    _id: PropTypes.string,
    text: PropTypes.string,
    options: PropTypes.object,
    correct: PropTypes.string,
    original: PropTypes.object,
    published: PropTypes.bool,
    createdBy: PropTypes.object,
    reviewer: PropTypes.object,
    validated: PropTypes.bool,
    validated_at: PropTypes.string,
    validation_comment: PropTypes.string,
    review_tag: PropTypes.string,
    user_agreement: PropTypes.object,
    teacher_status: PropTypes.string,
    validated_by_teacher: PropTypes.bool,
    validated_by_teacher_comment: PropTypes.string,
    validated_by_teacher_at: PropTypes.string
  }),
  onSubmit: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool
};

export default ValidateByTeacherModal;
