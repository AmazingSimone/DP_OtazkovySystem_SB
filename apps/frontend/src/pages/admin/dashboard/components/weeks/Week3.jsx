import { usePublishQuestionMutation, useUpdateQuestionMutation } from '@app/redux/api';
import { REVIEW_TAG_LABELS } from '@app/utils/questionFlowLabels';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { toast } from 'react-toastify';
import EditQuestionModal from '../EditQuestionModal';

/**
 * Week 3: the author sees the anonymous review of each of their questions, says whether the
 * review was right, may correct a question reviewed as faulty, and publishes it.
 * Only publishing earns the point.
 */
const Week3 = ({
  week,
  isCurrent,
  status,
  formatDate,
  modulQuestions,
  userId,
  setQuestionToRespond,
  setRespondOpen
}) => {
  const [updateQuestion] = useUpdateQuestionMutation();
  const [publishQuestion, { isLoading: isPublishing }] = usePublishQuestionMutation();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState(null);

  const userQuestions = (modulQuestions || []).filter(
    (q) => String(q.createdBy ?? q.created_by) === String(userId)
  );

  const publishedCount = userQuestions.filter((q) => q.published).length;
  const maxPoints = 2;
  const earnedPoints = Math.min(publishedCount, maxPoints);
  const isCompleted = userQuestions.length > 0 && publishedCount >= Math.min(userQuestions.length, 2);

  const handlePublish = async (question) => {
    try {
      await publishQuestion(question._id).unwrap();
      toast.success('Otázka bola publikovaná');
    } catch (error) {
      toast.error(error?.data?.message || 'Otázku sa nepodarilo publikovať');
    }
  };

  return (
    <Box
      key={week.weekNumber}
      sx={{
        p: 2,
        mb: 1,
        borderRadius: 1,
        border: 1,
        borderColor: isCurrent ? 'primary.main' : 'grey.300',
        backgroundColor: isCurrent ? 'rgba(25,118,210,0.08)' : 'transparent'
      }}
    >
      <Typography variant="h6">
        Týždeň {week.weekNumber} ({formatDate(week.start)} - {formatDate(week.end)})
      </Typography>
      <Typography color="text.secondary">{status}</Typography>
      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
        Vyjadri sa k recenziám svojich otázok a publikuj ich. Bod získaš za každú publikovanú
        otázku. Upraviť môžeš iba otázku označenú ako chybnú.
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
        {isCompleted && <Chip label="Všetko publikované" color="success" size="small" />}
        <Chip
          label={`${earnedPoints}/${maxPoints} bodov`}
          color={earnedPoints > 0 ? (earnedPoints >= maxPoints ? 'success' : 'warning') : 'default'}
          size="small"
          variant="outlined"
        />
      </Stack>
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {userQuestions.length === 0 && (
          <Typography color="text.secondary">V tomto module nemáš žiadne otázky.</Typography>
        )}
        {userQuestions.slice(0, 2).map((q) => {
          const hasReview = Boolean(q.validated_at);
          const responded = q.user_agreement?.responded_at ? q.user_agreement : null;
          const isFault = hasReview && q.validated === false;
          const canAct = isCurrent && hasReview && !q.published;
          const tagLabel = REVIEW_TAG_LABELS[q.review_tag];

          return (
            <Box
              key={q._id}
              sx={{
                p: 1,
                border: '1px solid',
                borderColor: q.published ? 'success.main' : hasReview ? 'warning.main' : 'grey.400',
                borderRadius: 1,
                cursor: canAct ? 'pointer' : 'default',
                bgcolor: q.published ? 'success.50' : hasReview ? 'warning.50' : 'transparent',
                '&:hover': !canAct
                  ? {}
                  : {
                      backgroundColor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'action.hover'
                    }
              }}
              onClick={() => {
                if (canAct) {
                  setQuestionToRespond(q);
                  setRespondOpen(true);
                }
              }}
            >
              <Typography sx={{ fontWeight: 600 }}>{q.text}</Typography>
              <Box sx={{ mt: 1 }}>
                {q.options &&
                  Object.entries(q.options).map(([key, value]) => (
                    <Typography
                      key={key}
                      variant="body2"
                      sx={{
                        color: key === q.correct ? 'success.dark' : 'text.secondary',
                        fontWeight: key === q.correct ? 600 : 400,
                        ml: 1
                      }}
                    >
                      {key.toUpperCase()}) {value} {key === q.correct && '✓'}
                    </Typography>
                  ))}
              </Box>

              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {hasReview ? (
                  <Chip
                    label={q.validated ? 'Recenzia: validná' : 'Recenzia: chybná'}
                    color={q.validated ? 'success' : 'error'}
                    size="small"
                  />
                ) : (
                  <Chip label="Recenzia ešte nie je k dispozícii" size="small" variant="outlined" />
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
                {q.published && <Chip label="Publikovaná" color="success" size="small" />}
              </Box>

              {hasReview && q.validation_comment && (
                <Typography
                  variant="body2"
                  sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}
                >
                  Komentár recenzie: {q.validation_comment}
                </Typography>
              )}
              {responded && responded.comment && (
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.primary' }}>
                  Tvoja odpoveď: {responded.comment}
                </Typography>
              )}

              {canAct && (
                <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuestionToRespond(q);
                      setRespondOpen(true);
                    }}
                  >
                    {responded ? 'Zmeniť vyjadrenie' : 'Vyjadriť sa k recenzii'}
                  </Button>
                  {isFault && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuestionToEdit(q);
                        setEditModalOpen(true);
                      }}
                    >
                      Opraviť otázku
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="contained"
                    disabled={!responded || isPublishing}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePublish(q);
                    }}
                  >
                    Publikovať
                  </Button>
                </Stack>
              )}
              {canAct && !responded && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Najprv sa vyjadri k recenzii, potom môžeš otázku publikovať.
                </Typography>
              )}
              {q.published && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Otázka čaká na posúdenie učiteľom a už ju nie je možné meniť.
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Correcting is offered only for questions reviewed as faulty; the server checks it too */}
      <EditQuestionModal
        open={editModalOpen}
        question={questionToEdit}
        onClose={() => {
          setEditModalOpen(false);
          setQuestionToEdit(null);
        }}
        onSubmit={async (questionId, updatedData) => {
          // The modal shows the result, including the server's reason when it refuses
          await updateQuestion({ questionId, ...updatedData }).unwrap();
        }}
      />
    </Box>
  );
};

Week3.propTypes = {
  week: PropTypes.shape({
    weekNumber: PropTypes.number.isRequired,
    start: PropTypes.string.isRequired,
    end: PropTypes.string.isRequired
  }).isRequired,
  isCurrent: PropTypes.bool.isRequired,
  status: PropTypes.string.isRequired,
  formatDate: PropTypes.func.isRequired,
  modulQuestions: PropTypes.array,
  userId: PropTypes.string.isRequired,
  setQuestionToRespond: PropTypes.func.isRequired,
  setRespondOpen: PropTypes.func.isRequired
};

export default Week3;
