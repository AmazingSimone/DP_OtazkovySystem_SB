import { useCurrentSubject } from '@app/hooks/useCurrentSubject';
import EditQuestionModal from '@app/pages/admin/dashboard/components/EditQuestionModal';
import RespondToValidationModal from '@app/pages/admin/subjects/components/RespondToValidationModal';
import ValidateQuestionModal from '@app/pages/admin/subjects/components/ValidateQuestionModal';
import * as authService from '@app/pages/auth/authService';
import {
  useGetModulsBySubjectQuery,
  useGetQuestionByUserIdQuery,
  usePublishQuestionMutation,
  useRespondToValidationMutation,
  useUpdateQuestionMutation,
  useValidateQuestionMutation
} from '@app/redux/api';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { toast } from 'react-toastify';
import FilterControls from './components/FilterControls';
import ModuleQuestionsSection from './components/ModuleQuestionsSection';

const pageSx = { pb: { xs: 2, sm: 3 }, pt: { xs: 3, sm: 4 }, px: { xs: 1.5, sm: 2, md: 0 } };

/**
 * The student's overview of the question flow in the selected subject, module by module:
 * their own questions and the questions they review.
 *
 * Which week is running, which questions a student reviews and what may be changed are all
 * decided by the server. This page only shows that state and sends the student's actions.
 */
const MyQuestions = () => {
  const auth = authService.getUserFromStorage();
  const userId = auth.id;

  // Get current subject from team switcher
  const currentSubject = useCurrentSubject();
  const subjectId = currentSubject?._id || currentSubject?.id || '';

  const [filter, setFilter] = React.useState({ date: '', modulId: '' });

  const [validateOpen, setValidateOpen] = React.useState(false);
  const [toValidate, setToValidate] = React.useState(null); // { question, assignment }
  const [respondOpen, setRespondOpen] = React.useState(false);
  const [questionToRespond, setQuestionToRespond] = React.useState(null);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [questionToEdit, setQuestionToEdit] = React.useState(null);

  const [validateQuestion] = useValidateQuestionMutation();
  const [respondToValidation] = useRespondToValidationMutation();
  const [updateQuestion] = useUpdateQuestionMutation();
  const [publishQuestion] = usePublishQuestionMutation();

  const { data: subjectModuls = [] } = useGetModulsBySubjectQuery(subjectId, { skip: !subjectId });
  const {
    data: questions = [],
    isLoading,
    error
  } = useGetQuestionByUserIdQuery(userId, { skip: !userId });

  // Own questions grouped by module, after the filters
  const questionsByModule = React.useMemo(() => {
    const grouped = {};
    questions.forEach((q) => {
      if (filter.date && q.createdAt?.slice(0, 10) !== filter.date) return;
      if (!grouped[q.modul]) grouped[q.modul] = [];
      grouped[q.modul].push(q);
    });
    return grouped;
  }, [questions, filter.date]);

  // Show a module if the student wrote something in it or has reviews to do in it
  const visibleModuls = React.useMemo(
    () =>
      subjectModuls.filter((m) => {
        if (filter.modulId && m._id !== filter.modulId) return false;
        const hasOwn = (questionsByModule[m._id] || []).length > 0;
        const hasReviews = (m.current_phase ?? 0) >= 2 && !filter.date;
        return hasOwn || hasReviews;
      }),
    [subjectModuls, questionsByModule, filter]
  );

  const handlePublish = async (question) => {
    try {
      await publishQuestion(question._id).unwrap();
      toast.success('Otázka bola publikovaná');
    } catch (err) {
      toast.error(err?.data?.message || 'Otázku sa nepodarilo publikovať');
    }
  };

  if (!subjectId) {
    return (
      <Box sx={pageSx}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Moje otázky
        </Typography>
        <Typography>Najprv vyberte predmet v team switcheri.</Typography>
      </Box>
    );
  }
  if (isLoading) {
    return (
      <Box sx={pageSx}>
        <Typography>Načítavam...</Typography>
      </Box>
    );
  }
  if (error) {
    return (
      <Box sx={pageSx}>
        <Typography color="error">Chyba pri načítaní otázok.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={pageSx}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Moje otázky
      </Typography>

      <FilterControls
        currentSubject={currentSubject}
        filter={filter}
        onFilterChange={setFilter}
        subjectModuls={subjectModuls}
      />

      {visibleModuls.length === 0 && <Typography>Nemáte žiadne otázky.</Typography>}

      {visibleModuls.map((modul, index) => {
        // 0 = not started, 1-3 = that week is running, 4 = finished (computed by the server)
        const currentWeek = modul.current_phase ?? 0;
        const weekStatus =
          currentWeek === 0 ? 'Nezačalo' : currentWeek >= 4 ? 'Dokončené' : `Týždeň ${currentWeek}`;

        return (
          <ModuleQuestionsSection
            key={modul._id}
            modulId={modul._id}
            modulName={modul.title || modul.name || modul._id}
            weekStatus={weekStatus}
            moduleQuestions={questionsByModule[modul._id] || []}
            currentWeek={currentWeek}
            userId={userId}
            showDivider={index > 0}
            onValidate={
              currentWeek === 2
                ? (item) => {
                    setToValidate(item);
                    setValidateOpen(true);
                  }
                : undefined
            }
            onRespond={
              currentWeek === 3
                ? (q) => {
                    setQuestionToRespond(q);
                    setRespondOpen(true);
                  }
                : undefined
            }
            onEdit={
              currentWeek === 1 || currentWeek === 3
                ? (q) => {
                    setQuestionToEdit(q);
                    setEditModalOpen(true);
                  }
                : undefined
            }
            onPublish={currentWeek === 3 ? handlePublish : undefined}
          />
        );
      })}

      <ValidateQuestionModal
        open={validateOpen}
        question={toValidate?.question}
        assignment={toValidate?.assignment}
        onClose={() => setValidateOpen(false)}
        onSubmit={async (questionId, payload) => {
          try {
            await validateQuestion({ questionId, valid: payload.valid, comment: payload.comment }).unwrap();
            toast.success('Recenzia bola uložená');
          } catch (err) {
            toast.error(err?.data?.message || 'Recenziu sa nepodarilo uložiť');
          }
        }}
      />

      <RespondToValidationModal
        open={respondOpen}
        question={questionToRespond}
        onClose={() => setRespondOpen(false)}
        onSubmit={async (questionId, payload) => {
          try {
            await respondToValidation({ questionId, agreed: payload.agreed, comment: payload.comment }).unwrap();
            toast.success('Vyjadrenie bolo uložené');
          } catch (err) {
            toast.error(err?.data?.message || 'Vyjadrenie sa nepodarilo uložiť');
          }
        }}
      />

      <EditQuestionModal
        open={editModalOpen}
        question={questionToEdit}
        onClose={() => {
          setEditModalOpen(false);
          setQuestionToEdit(null);
        }}
        onSubmit={async (questionId, updatedData) => {
          await updateQuestion({ questionId, ...updatedData }).unwrap();
        }}
      />
    </Box>
  );
};

export default MyQuestions;
