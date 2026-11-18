import { REVIEW_TAG_LABELS } from '@app/utils/questionFlowLabels';
import { Box, Button, Card, CardContent, Chip, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const Options = ({ question }) => (
  <Box sx={{ mb: 2 }}>
    {question.options &&
      Object.entries(question.options).map(([key, value]) => (
        <Typography
          key={key}
          variant="body2"
          sx={{
            color: key === question.correct ? 'success.dark' : 'text.secondary',
            fontWeight: key === question.correct ? 600 : 400,
            ml: 1,
            mb: 0.5
          }}
        >
          {key.toUpperCase()}) {value} {key === question.correct && '✓'}
        </Typography>
      ))}
  </Box>
);

Options.propTypes = {
  question: PropTypes.shape({ options: PropTypes.object, correct: PropTypes.string }).isRequired
};

const hoverSx = (enabled) =>
  enabled
    ? {
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'action.hover'
      }
    : {};

/**
 * One question on the "Moje otázky" page.
 *
 * With `assignment` it is a question dealt to the student for review in week 2 (anonymous,
 * verdict stored on the assignment). Without it, it is the student's own question.
 */
const QuestionCard = ({
  question,
  assignment = null,
  currentWeek,
  onValidate,
  onRespond,
  onEdit,
  onPublish
}) => {
  const isWeek1 = currentWeek === 1;
  const isWeek2 = currentWeek === 2;
  const isWeek3 = currentWeek === 3;

  // A question the student reviews
  if (assignment) {
    const reviewed = Boolean(assignment.validated);
    const canReview = isWeek2 && !!onValidate;

    return (
      <Card
        sx={{
          borderRadius: 2,
          height: 'fit-content',
          border: '1px solid',
          borderColor: reviewed ? 'success.main' : 'grey.300',
          bgcolor: reviewed ? 'success.50' : 'transparent',
          cursor: canReview ? 'pointer' : 'default',
          '&:hover': hoverSx(canReview)
        }}
        onClick={() => {
          if (canReview) onValidate({ question, assignment });
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            {question.text}
          </Typography>
          <Options question={question} />

          {reviewed && (
            <Box sx={{ mt: 2 }}>
              <Chip
                label={assignment.validation_result ? 'Validná' : 'Chybná'}
                color={assignment.validation_result ? 'success' : 'error'}
                size="small"
              />
              {assignment.validation_comment && (
                <Typography
                  variant="body2"
                  sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}
                >
                  Komentár: {assignment.validation_comment}
                </Typography>
              )}
            </Box>
          )}

          {canReview && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              {reviewed ? 'Kliknite pre zmenu recenzie' : 'Kliknite pre recenziu'}
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  }

  // The student's own question
  const hasReview = Boolean(question.validated_at);
  const responded = question.user_agreement?.responded_at ? question.user_agreement : null;
  const isFault = hasReview && question.validated === false;
  const published = Boolean(question.published);
  const tagLabel = REVIEW_TAG_LABELS[question.review_tag];

  const canRespond = isWeek3 && hasReview && !published && !!onRespond;
  // Week 1: any own question. Week 3: only one reviewed as faulty and not yet published.
  const canEdit = !!onEdit && (isWeek1 || (isWeek3 && isFault && !published));
  const canPublish = isWeek3 && hasReview && !published && !!onPublish;
  const clickable = (isWeek1 && canEdit) || canRespond;

  return (
    <Card
      sx={{
        borderRadius: 2,
        height: 'fit-content',
        border: currentWeek >= 3 ? '1px solid' : undefined,
        borderColor:
          currentWeek >= 3
            ? published
              ? 'success.main'
              : hasReview
                ? 'warning.main'
                : 'grey.400'
            : undefined,
        bgcolor:
          currentWeek >= 3 ? (published ? 'success.50' : hasReview ? 'warning.50' : 'transparent') : undefined,
        cursor: clickable ? 'pointer' : 'default',
        '&:hover': hoverSx(clickable)
      }}
      onClick={() => {
        if (isWeek1 && canEdit) {
          onEdit(question);
          return;
        }
        if (canRespond) onRespond(question);
      }}
    >
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          {question.text}
        </Typography>
        <Options question={question} />

        {/* The review is shown from week 3 on; the server does not send it earlier */}
        {currentWeek >= 3 && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              {hasReview ? (
                <Chip
                  label={question.validated ? 'Recenzia: validná' : 'Recenzia: chybná'}
                  color={question.validated ? 'success' : 'error'}
                  size="small"
                />
              ) : (
                <Chip label="Bez recenzie" size="small" variant="outlined" />
              )}
              {tagLabel && <Chip label={tagLabel} color="warning" size="small" variant="outlined" />}
              {responded && (
                <Chip
                  label={responded.agreed ? 'Súhlasím s recenziou' : 'Nesúhlasím s recenziou'}
                  color={responded.agreed ? 'success' : 'warning'}
                  size="small"
                  variant="outlined"
                />
              )}
              {published && <Chip label="Publikovaná" color="success" size="small" />}
            </Box>

            {hasReview && question.validation_comment && (
              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                Komentár recenzie: {question.validation_comment}
              </Typography>
            )}
            {responded && responded.comment && (
              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.primary' }}>
                Tvoja odpoveď: {responded.comment}
              </Typography>
            )}
          </Box>
        )}

        {(canEdit || canRespond || canPublish) && (
          <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {canRespond && (
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation();
                  onRespond(question);
                }}
              >
                {responded ? 'Zmeniť vyjadrenie' : 'Vyjadriť sa k recenzii'}
              </Button>
            )}
            {canEdit && (
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(question);
                }}
              >
                {isWeek3 ? 'Opraviť otázku' : 'Upraviť'}
              </Button>
            )}
            {canPublish && (
              <Button
                size="small"
                variant="contained"
                disabled={!responded}
                onClick={(e) => {
                  e.stopPropagation();
                  onPublish(question);
                }}
              >
                Publikovať
              </Button>
            )}
          </Box>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Vytvorené: {new Date(question.createdAt).toLocaleDateString()}
          {isWeek1 && canEdit && <span> • Kliknite pre úpravu otázky</span>}
          {canPublish && !responded && <span> • Najprv sa vyjadri k recenzii, potom publikuj</span>}
          {published && <span> • Čaká na posúdenie učiteľom</span>}
        </Typography>
      </CardContent>
    </Card>
  );
};

QuestionCard.propTypes = {
  question: PropTypes.shape({
    _id: PropTypes.string,
    text: PropTypes.string.isRequired,
    options: PropTypes.object.isRequired,
    correct: PropTypes.string,
    validated: PropTypes.bool,
    validated_at: PropTypes.string,
    validation_comment: PropTypes.string,
    review_tag: PropTypes.string,
    published: PropTypes.bool,
    user_agreement: PropTypes.shape({
      agreed: PropTypes.bool,
      comment: PropTypes.string,
      responded_at: PropTypes.string
    }),
    createdAt: PropTypes.string
  }).isRequired,
  assignment: PropTypes.shape({
    validated: PropTypes.bool,
    validation_result: PropTypes.bool,
    validation_comment: PropTypes.string
  }),
  currentWeek: PropTypes.number.isRequired,
  onValidate: PropTypes.func,
  onRespond: PropTypes.func,
  onEdit: PropTypes.func,
  onPublish: PropTypes.func
};

export default QuestionCard;
