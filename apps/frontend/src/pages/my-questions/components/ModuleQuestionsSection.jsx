import { useGetQuestionAssignmentsQuery } from '@app/redux/api';
import { Box, Divider, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import QuestionCard from './QuestionCard';

const gridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))',
  gap: 2
};

/**
 * The questions the server dealt to this student for review in one module.
 * They are dealt once at the start of week 2 and are the same on every device and reload.
 */
const AssignedReviews = ({ modulId, userId, currentWeek, onValidate }) => {
  const { data, isLoading } = useGetQuestionAssignmentsQuery(
    { userId, modulId },
    { skip: !userId || !modulId }
  );
  const assignments = data?.data || [];
  const automaticPoints = data?.automaticPoints || 0;

  return (
    <Box sx={gridSx}>
      {[0, 1].map((i) => {
        const assignment = assignments[i];
        if (assignment?.question?._id) {
          return (
            <QuestionCard
              key={assignment._id}
              question={assignment.question}
              assignment={assignment}
              currentWeek={currentWeek}
              onValidate={onValidate}
            />
          );
        }
        return (
          <Box
            key={`empty-${i}`}
            sx={{
              p: 2,
              border: '1px dashed',
              borderColor: 'grey.200',
              borderRadius: 1,
              color: 'text.disabled',
              height: 'fit-content'
            }}
          >
            <Typography>
              {isLoading
                ? 'Načítavanie...'
                : automaticPoints > 0
                  ? 'Automatický bod: pre teba nezostala žiadna otázka na recenziu'
                  : 'Žiadna otázka na recenziu'}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

AssignedReviews.propTypes = {
  modulId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
  currentWeek: PropTypes.number.isRequired,
  onValidate: PropTypes.func
};

const ModuleQuestionsSection = ({
  modulId,
  modulName,
  weekStatus,
  moduleQuestions,
  currentWeek,
  userId,
  showDivider = false,
  onValidate,
  onRespond,
  onEdit,
  onPublish
}) => {
  return (
    <Box>
      {showDivider && <Divider sx={{ my: 4 }} />}

      {/* Module header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          {modulName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Status: {weekStatus} • {moduleQuestions.length} otázok
        </Typography>
      </Box>

      {/* The student's own questions */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
          Moje otázky
        </Typography>

        <Box sx={{ ...gridSx, mb: 2 }}>
          {moduleQuestions.map((question) => (
            <QuestionCard
              key={question._id}
              question={question}
              currentWeek={currentWeek}
              onRespond={onRespond}
              onEdit={onEdit}
              onPublish={onPublish}
            />
          ))}
        </Box>

        {moduleQuestions.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Žiadne otázky v tomto module
          </Typography>
        )}
      </Box>

      {/* Questions dealt to the student for review, from week 2 on */}
      {currentWeek >= 2 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'secondary.main' }}>
            Otázky, ktoré recenzujem
          </Typography>
          <AssignedReviews
            modulId={modulId}
            userId={userId}
            currentWeek={currentWeek}
            onValidate={onValidate}
          />
        </Box>
      )}
    </Box>
  );
};

ModuleQuestionsSection.propTypes = {
  modulId: PropTypes.string.isRequired,
  modulName: PropTypes.string.isRequired,
  weekStatus: PropTypes.string.isRequired,
  moduleQuestions: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired
    })
  ).isRequired,
  currentWeek: PropTypes.number.isRequired,
  userId: PropTypes.string.isRequired,
  showDivider: PropTypes.bool,
  onValidate: PropTypes.func,
  onRespond: PropTypes.func,
  onEdit: PropTypes.func,
  onPublish: PropTypes.func
};

export default ModuleQuestionsSection;
