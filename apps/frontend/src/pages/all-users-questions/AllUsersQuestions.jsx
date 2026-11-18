import { useCurrentSubjectId } from '@app/hooks/useCurrentSubjectId';
import * as authService from '@app/pages/auth/authService';
import {
  useGetPublishedQuestionsBySubjectQuery,
  useGetValidatedQuestionsWithAgreementBySubjectQuery,
  useLazyGetModulsBySubjectQuery,
  useTeacherValidateQuestionMutation
} from '@app/redux/api';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { teacherStatusOf } from '@app/utils/questionFlowLabels';
import QuestionCard from './components/QuestionCard';
import ValidateByTeacherModal from './components/ValidateByTeacherModal';

const STATUS_FILTERS = {
  all: 'Všetky otázky',
  pending: 'Čakajúce na posúdenie',
  approved: 'Schválené',
  rejected: 'Zamietnuté',
  abuse: 'Zamietnuté ako zneužitie'
};

const REVIEW_FILTERS = {
  all: 'Všetky recenzie',
  student: 'Recenzované študentom',
  missing_reviewer: 'Chýbajúci recenzent',
  reviewer_no_response: 'Recenzent neodpovedal'
};

const SUCCESS_MESSAGES = {
  approved: 'Otázka bola schválená',
  rejected: 'Otázka bola zamietnutá',
  abuse: 'Otázka bola zamietnutá ako zneužitie a body boli strhnuté'
};

/**
 * The teacher's final review: questions that students published at the end of the three-week
 * flow, plus questions written by teachers. Only approved questions are used in tests.
 */
const AllUsersQuestions = () => {
  const subjectId = useCurrentSubjectId();
  const [selectedModuleId, setSelectedModuleId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [createdByFilter, setCreatedByFilter] = useState('all'); // 'all', 'student', 'teacher'
  const [selectedYear, setSelectedYear] = useState('all');

  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [validationSubmitting, setValidationSubmitting] = useState(false);
  const [trigger, { data: modules = [], isFetching: modulesLoading, error: modulesError }] =
    useLazyGetModulsBySubjectQuery();

  const [teacherValidateQuestion] = useTeacherValidateQuestionMutation();

  const currentUser = authService.getUserFromStorage();
  const isTeacher = currentUser?.isTeacher === true;

  // Questions published by students at the end of week 3
  const {
    data: studentQuestions = [],
    isLoading: studentLoading,
    error: studentError
  } = useGetPublishedQuestionsBySubjectQuery({ subjectId }, { skip: !subjectId });

  // Questions written by teachers
  const {
    data: teacherQuestions = [],
    isLoading: teacherLoading,
    error: teacherError
  } = useGetValidatedQuestionsWithAgreementBySubjectQuery(
    { subjectId, filter: 'teacher' },
    { skip: !subjectId }
  );

  useEffect(() => {
    if (subjectId) trigger(subjectId);
  }, [subjectId, trigger]);

  const handleOpenValidationModal = (question) => {
    setSelectedQuestion(question);
    setValidationModalOpen(true);
  };

  const handleCloseValidationModal = () => {
    setValidationModalOpen(false);
    setSelectedQuestion(null);
  };

  const handleSubmitValidation = async (data) => {
    setValidationSubmitting(true);
    try {
      await teacherValidateQuestion(data).unwrap();
      toast.success(SUCCESS_MESSAGES[data.status] || 'Rozhodnutie bolo uložené');
      handleCloseValidationModal();
    } catch (error) {
      toast.error(error?.data?.message || 'Rozhodnutie sa nepodarilo uložiť. Skúste to prosím znova.');
    } finally {
      setValidationSubmitting(false);
    }
  };

  if (!subjectId) {
    return (
      <Box sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 2, sm: 3 } }}>
        <Alert severity="warning">Prosím vyberte predmet pre zobrazenie otázok.</Alert>
      </Box>
    );
  }

  const questionsError = studentError || teacherError;
  if (questionsError) {
    return (
      <Box sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 2, sm: 3 } }}>
        <Alert severity="error">
          Chyba pri načítaní otázok: {questionsError?.data?.message || questionsError.message}
        </Alert>
      </Box>
    );
  }

  if (modulesError) {
    return (
      <Box sx={{ px: { xs: 1.5, sm: 2 }, pb: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 } }}>
        <Alert severity="error">Chyba pri načítaní modulov: {modulesError.message}</Alert>
      </Box>
    );
  }

  const questions =
    createdByFilter === 'student'
      ? studentQuestions
      : createdByFilter === 'teacher'
        ? teacherQuestions
        : [...studentQuestions, ...teacherQuestions];

  const filteredQuestions = questions.filter((q) => {
    if (selectedModuleId !== 'all' && q.modul?._id !== selectedModuleId) return false;
    if (statusFilter !== 'all' && teacherStatusOf(q) !== statusFilter) return false;
    if (reviewFilter === 'student' && !(q.published && !q.review_tag)) return false;
    if (reviewFilter !== 'all' && reviewFilter !== 'student' && q.review_tag !== reviewFilter) return false;
    if (selectedYear !== 'all' && new Date(q.createdAt).getFullYear() !== parseInt(selectedYear)) {
      return false;
    }
    return true;
  });

  const availableYears = Array.from(
    new Set(questions.map((q) => new Date(q.createdAt).getFullYear()).filter((year) => !isNaN(year)))
  ).sort((a, b) => b - a);

  const questionsLoading = studentLoading || teacherLoading;

  return (
    <Box sx={{ pb: { xs: 2, sm: 3 }, pt: { xs: 3, sm: 4 }, px: { xs: 1.5, sm: 2, md: 0 } }}>
      <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.6rem', sm: '2.125rem' } }}>
        Publikované otázky na posúdenie
      </Typography>
      <Typography color="textSecondary" sx={{ mb: 2 }}>
        Otázky, ktoré študenti publikovali po recenzii, a otázky vytvorené učiteľmi. Do testov sa
        dostanú iba schválené otázky.
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            <Grid item xs={12} sm={6} lg={2.4}>
              <FormControl fullWidth>
                <InputLabel>Modul</InputLabel>
                <Select
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  label="Modul"
                  disabled={modulesLoading}
                >
                  <MenuItem value="all">Všetky moduly</MenuItem>
                  {modules.map((module) => (
                    <MenuItem key={module._id} value={module._id}>
                      {module.name || module.title || module._id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} lg={2.4}>
              <FormControl fullWidth>
                <InputLabel>Vytvorené</InputLabel>
                <Select
                  value={createdByFilter}
                  onChange={(e) => setCreatedByFilter(e.target.value)}
                  label="Vytvorené"
                >
                  <MenuItem value="all">Študentmi aj učiteľmi</MenuItem>
                  <MenuItem value="student">Študentmi</MenuItem>
                  <MenuItem value="teacher">Učiteľmi</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} lg={2.4}>
              <FormControl fullWidth>
                <InputLabel>Rozhodnutie učiteľa</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Rozhodnutie učiteľa"
                >
                  {Object.entries(STATUS_FILTERS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} lg={2.4}>
              <FormControl fullWidth>
                <InputLabel>Recenzia</InputLabel>
                <Select
                  value={reviewFilter}
                  onChange={(e) => setReviewFilter(e.target.value)}
                  label="Recenzia"
                >
                  {Object.entries(REVIEW_FILTERS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} lg={2.4}>
              <FormControl fullWidth>
                <InputLabel>Rok vytvorenia</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  label="Rok vytvorenia"
                  disabled={availableYears.length === 0}
                >
                  <MenuItem value="all">Všetky roky</MenuItem>
                  {availableYears.map((year) => (
                    <MenuItem key={year} value={year.toString()}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {(questionsLoading || modulesLoading) && (
        <Box display="flex" justifyContent="center" py={{ xs: 3, sm: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!questionsLoading && !modulesLoading && (
        <>
          <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <Typography variant="h6">Nájdených {filteredQuestions.length} otázok</Typography>
            {selectedModuleId !== 'all' && (
              <Chip
                label={
                  modules.find((m) => m._id === selectedModuleId)?.title ||
                  modules.find((m) => m._id === selectedModuleId)?.name ||
                  'Neznámy modul'
                }
                size="small"
              />
            )}
            {createdByFilter !== 'all' && (
              <Chip
                label={createdByFilter === 'student' ? 'Vytvorené študentmi' : 'Vytvorené učiteľmi'}
                size="small"
                color="info"
              />
            )}
            {statusFilter !== 'all' && (
              <Chip label={STATUS_FILTERS[statusFilter]} size="small" color="primary" />
            )}
            {reviewFilter !== 'all' && (
              <Chip label={REVIEW_FILTERS[reviewFilter]} size="small" color="warning" />
            )}
            {selectedYear !== 'all' && (
              <Chip label={`Rok: ${selectedYear}`} size="small" color="secondary" />
            )}
          </Box>

          {filteredQuestions.length === 0 ? (
            <Card>
              <CardContent>
                <Typography variant="h6" color="textSecondary" align="center">
                  Neboli nájdené žiadne otázky.
                </Typography>
                <Typography color="textSecondary" align="center" sx={{ mt: 1 }}>
                  Študentské otázky sa tu objavia, keď ich autori v 3. týždni modulu publikujú.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              {filteredQuestions.map((question) => (
                <Grid item xs={12} sm={6} md={4} key={question._id}>
                  <QuestionCard
                    question={question}
                    isTeacher={isTeacher}
                    onValidateClick={handleOpenValidationModal}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      <ValidateByTeacherModal
        open={validationModalOpen}
        onClose={handleCloseValidationModal}
        question={selectedQuestion}
        onSubmit={handleSubmitValidation}
        isSubmitting={validationSubmitting}
      />
    </Box>
  );
};

export default AllUsersQuestions;
