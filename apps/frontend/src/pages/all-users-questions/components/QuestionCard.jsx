import {
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography
} from '@mui/material';
import { format } from 'date-fns';
import { fullName, REVIEW_TAG_LABELS, TEACHER_STATUS, teacherStatusOf } from '@app/utils/questionFlowLabels';
import PropTypes from 'prop-types';

const chipSx = { height: 20, fontSize: '0.7rem' };

/**
 * A question as the teacher sees it: real names of author and reviewer, the review,
 * the author's answer to it, and whether the author changed the question afterwards.
 */
const QuestionCard = ({ question, isTeacher, onValidateClick }) => {
  const status = teacherStatusOf(question);
  const hasReview = Boolean(question.validated_at);
  const tagLabel = REVIEW_TAG_LABELS[question.review_tag];
  const response = question.user_agreement?.responded_at ? question.user_agreement : null;

  return (
    <Paper
      elevation={2}
      sx={{
        p: { xs: 1.5, sm: 2 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      <Typography
        variant="h6"
        gutterBottom
        sx={{ fontSize: { xs: '0.95rem', sm: '1rem' }, mb: 2, wordBreak: 'break-word' }}
      >
        {question.text}
      </Typography>

      <Box sx={{ mb: 2, flexGrow: 1 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontSize: '0.875rem' }}>
          Možnosti odpovedí:
        </Typography>
        <List dense sx={{ py: 0 }}>
          {Object.entries(question.options).map(([key, value]) => (
            <ListItem key={key} sx={{ py: 0.25, px: 0 }}>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="flex-start">
                    <Chip
                      label={key.toUpperCase()}
                      size="small"
                      color={question.correct === key ? 'success' : 'default'}
                      sx={{ mr: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: question.correct === key ? 'bold' : 'normal',
                        fontSize: '0.875rem',
                        wordBreak: 'break-word'
                      }}
                    >
                      {value}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider sx={{ my: 1 }} />

      <Box sx={{ p: 1.5, borderRadius: 1, mb: 1 }}>
        <Typography variant="caption" display="block" color="textSecondary" gutterBottom>
          <strong>Modul:</strong> {question.modul?.title || question.modul?.name || 'N/A'}
        </Typography>
        <Typography variant="caption" display="block" color="textSecondary" gutterBottom>
          <strong>Autor:</strong> {fullName(question.createdBy)}
        </Typography>
        {question.published && (
          <Typography variant="caption" display="block" color="textSecondary" gutterBottom>
            <strong>Recenzent:</strong>{' '}
            {question.reviewer ? fullName(question.reviewer) : 'žiadny (automatická recenzia)'}
          </Typography>
        )}
        <Typography variant="caption" display="block" color="textSecondary" gutterBottom>
          <strong>{question.published_at ? 'Publikované' : 'Vytvorené'}:</strong>{' '}
          {format(new Date(question.published_at || question.createdAt), 'PP')}
        </Typography>

        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {hasReview && (
            <Chip
              label={question.validated ? 'Recenzia: validná' : 'Recenzia: chybná'}
              color={question.validated ? 'success' : 'error'}
              size="small"
              variant="outlined"
              sx={chipSx}
            />
          )}
          {tagLabel && <Chip label={tagLabel} color="warning" size="small" sx={chipSx} />}
          {response && (
            <Chip
              label={response.agreed ? 'Autor súhlasil' : 'Autor nesúhlasil'}
              size="small"
              variant="outlined"
              sx={chipSx}
            />
          )}
          {question.original && (
            <Chip label="Upravená po recenzii" color="info" size="small" variant="outlined" sx={chipSx} />
          )}
          <Chip
            label={TEACHER_STATUS[status].label}
            color={TEACHER_STATUS[status].color}
            size="small"
            sx={chipSx}
          />
        </Box>
      </Box>

      {isTeacher && (
        <Box sx={{ mt: 'auto' }}>
          <Button
            variant={status === 'pending' ? 'contained' : 'outlined'}
            color={status === 'pending' ? 'primary' : 'info'}
            size="small"
            onClick={() => onValidateClick(question)}
            fullWidth
            sx={{ fontSize: '0.75rem' }}
          >
            {status === 'pending' ? 'Posúdiť otázku' : 'Zmeniť rozhodnutie'}
          </Button>
        </Box>
      )}
    </Paper>
  );
};

QuestionCard.propTypes = {
  question: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    options: PropTypes.object.isRequired,
    correct: PropTypes.string.isRequired,
    modul: PropTypes.shape({
      _id: PropTypes.string,
      title: PropTypes.string,
      name: PropTypes.string
    }),
    createdBy: PropTypes.shape({
      name: PropTypes.string,
      surname: PropTypes.string
    }),
    reviewer: PropTypes.shape({
      name: PropTypes.string,
      surname: PropTypes.string
    }),
    createdAt: PropTypes.string.isRequired,
    published: PropTypes.bool,
    published_at: PropTypes.string,
    validated: PropTypes.bool,
    validated_at: PropTypes.string,
    review_tag: PropTypes.string,
    original: PropTypes.object,
    user_agreement: PropTypes.object,
    teacher_status: PropTypes.string,
    validated_by_teacher: PropTypes.bool
  }).isRequired,
  isTeacher: PropTypes.bool.isRequired,
  onValidateClick: PropTypes.func.isRequired
};

export default QuestionCard;
