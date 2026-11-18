//TODO zarovnat tagy vo week 2 nech je lepsia responzivnost na mensich obrazovkach

import * as authService from '@app/pages/auth/authService';
import {
  useGetQuestionsByModulQuery,
  useLazyGetModulsBySubjectQuery,
  useRespondToValidationMutation,
  useValidateQuestionMutation
} from '@app/redux/api';
import {
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import RespondToValidationModal from '../subjects/components/RespondToValidationModal';
import ValidateQuestionModal from '../subjects/components/ValidateQuestionModal';
import DefaultWeek from './components/weeks/DefaultWeek';
import Week1 from './components/weeks/Week1';
import Week2 from './components/weeks/Week2';
import Week3 from './components/weeks/Week3';
import WeekSelector from './components/weeks/WeekSelector';

const Dashboard = () => {
  const [currentSubjectId, setCurrentSubjectId] = useState(null);
  const [selectedModulId, setSelectedModulId] = useState('');
  const [trigger, { data: moduls = [], isFetching }] = useLazyGetModulsBySubjectQuery();
  const [selectedModul, setSelectedModul] = useState(null);

  // RTK Query mutations for validation and responses
  const [validateQuestion] = useValidateQuestionMutation();
  const [respondToValidation] = useRespondToValidationMutation();

  // localCreated stores newly created questions client-side until server returns them
  const [localCreated, setLocalCreated] = useState({}); // { modulId: { weekNumber: [questions] } }

  const auth = authService.getUserFromStorage();
  const userId = auth?.id || auth?._id || auth?.userId || null;

  // Fetch questions for selected module (all users) then filter to current user
  const { data: modulQuestions = [] } = useGetQuestionsByModulQuery(selectedModulId, {
    skip: !selectedModulId
  });

  // (removed unused helper)

  // (removed unused currentWeekIndex) compute current week inline where needed

  // Build merged questions per week (server + localCreated) for this user
  const questionsByWeekMerged = useMemo(() => {
    const mapping = {};
    if (!selectedModulId) return mapping;
    mapping[selectedModulId] = {};

    // server-side questions - ALL user questions go to Week 1 (question creation week)
    modulQuestions.forEach((q) => {
      const creator = q.createdBy ?? q.created_by;
      const creatorId = typeof creator === 'object' && creator?._id ? creator._id : creator;
      const userIdStr = String(userId);
      const creatorIdStr = String(creatorId);

      if (!creator || creatorIdStr !== userIdStr) return;

      // Always assign to Week 1 - Week 1 is for question creation
      const wn = 1;
      if (!mapping[selectedModulId][wn]) mapping[selectedModulId][wn] = [];
      mapping[selectedModulId][wn].push(q);
    });

    // local-created questions
    const local = localCreated[selectedModulId] || {};
    Object.keys(local).forEach((k) => {
      const wn = Number(k);
      const arr = local[wn] || [];
      if (!mapping[selectedModulId][wn]) mapping[selectedModulId][wn] = [];
      arr.forEach((q) => {
        // avoid duplicates by _id
        if (q._id && mapping[selectedModulId][wn].some((s) => s._id === q._id)) return;
        mapping[selectedModulId][wn].push(q);
      });
    });

    return mapping;
  }, [modulQuestions, localCreated, selectedModulId, userId]);

  // We maintain localCreated for optimistic UI; server questions are mapped via questionsByWeekMerged.
  // No effect needed to copy modulQuestions into component state.

  // Listen for subject changes from TeamSwitcher
  useEffect(() => {
    const updateSubject = () => {
      const id = localStorage.getItem('currentSubjectId');
      setCurrentSubjectId(id);
    };
    updateSubject();
    window.addEventListener('subjectChanged', updateSubject);
    return () => window.removeEventListener('subjectChanged', updateSubject);
  }, []);

  // Fetch modules when subject changes
  useEffect(() => {
    if (currentSubjectId) {
      trigger(currentSubjectId);
      setSelectedModulId('');
    }
  }, [currentSubjectId, trigger]);

  // Auto-select first module when modules are loaded
  useEffect(() => {
    if (!isFetching && moduls && moduls.length > 0 && !selectedModulId) {
      setSelectedModulId(moduls[0]._id);
    }
  }, [moduls, isFetching, selectedModulId]);

  // Keep selected module object in state
  useEffect(() => {
    const mod = moduls.find((m) => m._id === selectedModulId) || null;
    setSelectedModul(mod);
  }, [selectedModulId, moduls]);

  const handleModulChange = (event) => {
    setSelectedModulId(event.target.value);
  };
  const [selectedWeekNumber, setSelectedWeekNumber] = useState(1);
  const [validateOpen, setValidateOpen] = useState(false);
  const [questionToValidate, setQuestionToValidate] = useState(null);
  const [respondOpen, setRespondOpen] = useState(false);
  const [questionToRespond, setQuestionToRespond] = useState(null);

  // Debug week override disabled.

  // When selected module changes, reset selectedWeekNumber to the current week
  useEffect(() => {
    if (!selectedModul) return;
    const weeks = buildWeeks(selectedModul);
    const now = new Date();
    const currentWeek = weeks.find((w) => isDateInRange(now, w.start, w.end)) || null;
    setSelectedWeekNumber(currentWeek ? currentWeek.weekNumber : (weeks[0]?.weekNumber ?? 1));
    // Debug: log what phase data we received from the API
    console.debug('[Dashboard] modul phase data:', {
      title: selectedModul.title,
      date_start: selectedModul.date_start,
      week2_start: selectedModul.week2_start,
      week3_start: selectedModul.week3_start,
      date_end: selectedModul.date_end,
      computedWeeks: weeks,
      detectedCurrentWeek: currentWeek?.weekNumber ?? null
    });
  }, [selectedModul]);

  // Helper: build week ranges from module dates, respecting custom phase boundaries
  const buildWeeks = (modul) => {
    if (!modul) return [];
    const weeks = [];

    // The server computes the phases and enforces them, so use its boundaries whenever it
    // sends them. Its `end` is exclusive; subtract 1 ms so the last day is shown correctly.
    if (Array.isArray(modul.phases) && modul.phases.length > 0) {
      return modul.phases.map((p) => ({
        weekNumber: p.number,
        start: new Date(p.start).toISOString(),
        end: new Date(new Date(p.end).getTime() - 1).toISOString()
      }));
    }

    try {
      const start = modul.date_start ? new Date(modul.date_start) : null;
      const end = modul.date_end ? new Date(modul.date_end) : null;

      if (start && end && end > start) {
        const w2 = modul.week2_start ? new Date(modul.week2_start) : null;
        const w3 = modul.week3_start ? new Date(modul.week3_start) : null;

        if (w2 || w3) {
          // Custom phases set by teacher
          const week1End = w2 ? new Date(w2.getTime() - 1) : w3 ? new Date(w3.getTime() - 1) : end;
          weeks.push({ weekNumber: 1, start: start.toISOString(), end: week1End.toISOString() });
          if (w2) {
            const week2End = w3 ? new Date(w3.getTime() - 1) : end;
            weeks.push({ weekNumber: 2, start: w2.toISOString(), end: week2End.toISOString() });
          }
          if (w3) {
            weeks.push({ weekNumber: 3, start: w3.toISOString(), end: end.toISOString() });
          }
          return weeks;
        }

        // No custom phases: equal 7-day buckets based on week_number
        const count = modul.week_number || 3;
        for (let i = 0; i < count; i++) {
          const s = new Date(start);
          s.setDate(start.getDate() + i * 7);
          const e = new Date(s);
          e.setDate(s.getDate() + 6);
          weeks.push({ weekNumber: i + 1, start: s.toISOString(), end: e.toISOString() });
        }
        return weeks;
      }
    } catch {
      // fall through
    }

    // Hard fallback: weeks from today
    const count = modul.week_number || 3;
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const s = new Date(now);
      s.setDate(now.getDate() + i * 7);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      weeks.push({ weekNumber: i + 1, start: s.toISOString(), end: e.toISOString() });
    }
    return weeks;
  };

  // Exact comparison, the same way the server decides which week is running
  const isDateInRange = (date, start, end) => {
    const t = new Date(date).getTime();
    return t >= new Date(start).getTime() && t <= new Date(end).getTime();
  };

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return '';
    }
  };

  // Get effective current week based on module dates. Returns null if module hasn't started or has ended.
  const getEffectiveCurrentWeek = (weeks, now) => {
    return weeks.find((w) => isDateInRange(now, w.start, w.end)) || null;
  };

  // The questions for week 2 are dealt by the server when the week starts (see the backend
  // job jobs/questionFlow.js). The browser no longer triggers or influences the deal.

  return (
    <Box sx={{ pt: { xs: 3, sm: 4 }, pb: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 2, md: 0 } }}>
      {isFetching ? (
        <CircularProgress />
      ) : moduls && moduls.length > 0 ? (
        <>
          <FormControl fullWidth sx={{ maxWidth: 400, mb: 3 }}>
            <InputLabel id="modul-select-label">Modul</InputLabel>
            <Select
              labelId="modul-select-label"
              value={selectedModulId}
              label="Modul"
              onChange={handleModulChange}
            >
              {moduls.map((modul) => (
                <MenuItem key={modul._id} value={modul._id}>
                  {modul.name || modul.title || modul._id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Debug week override controls disabled. */}
        </>
      ) : (
        <Typography color="text.secondary">Pre tento predmet nie sú žiadne moduly.</Typography>
      )}

      {/* Week columns for selected module: left = actual current week, right = week selector + chosen week */}
      {selectedModul
        ? (() => {
            const weeks = buildWeeks(selectedModul);
            const now = new Date();
            const currentWeek = getEffectiveCurrentWeek(weeks, now);

            const renderWeek = (w, isCurrent) => {
              const status = isCurrent
                ? 'Aktuálny týždeň'
                : now < new Date(w.start)
                  ? 'Ešte nezačal'
                  : 'Ukončený';

              const commonProps = {
                week: w,
                isCurrent,
                status,
                formatDate
              };

              // Week 1: Add questions
              if (w.weekNumber === 1) {
                return (
                  <Week1
                    {...commonProps}
                    questionsByWeekMerged={questionsByWeekMerged}
                    selectedModul={selectedModul}
                    setLocalCreated={setLocalCreated}
                    userId={userId}
                  />
                );
              }

              // Week 2: Validate external questions
              if (w.weekNumber === 2) {
                return (
                  <Week2
                    {...commonProps}
                    userId={userId}
                    selectedModul={selectedModul}
                    setQuestionToValidate={setQuestionToValidate}
                    setValidateOpen={setValidateOpen}
                  />
                );
              }

              // Week 3: Respond to validations
              if (w.weekNumber === 3) {
                return (
                  <Week3
                    {...commonProps}
                    modulQuestions={modulQuestions}
                    userId={userId}
                    setQuestionToRespond={setQuestionToRespond}
                    setRespondOpen={setRespondOpen}
                  />
                );
              }

              // Default for other weeks
              return <DefaultWeek {...commonProps} />;
            };

            const isFinished = !currentWeek && now >= new Date(weeks[weeks.length - 1]?.end || 0);

            // Finished module: 3-column read-only grid
            if (isFinished) {
              return (
                <Box sx={{ mt: { xs: 1.5, sm: 2 } }}>
                  <Chip
                    label="Modul ukončený — len na čítanie"
                    color="default"
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        lg: 'repeat(3, 1fr)'
                      },
                      gap: 2
                    }}
                  >
                    {weeks.map((w) => (
                      <Box key={w.weekNumber}>{renderWeek(w, false)}</Box>
                    ))}
                  </Box>
                </Box>
              );
            }

            // Active or not-started module: current week left + week selector right
            return (
              <Box
                sx={{
                  mt: { xs: 1.5, sm: 2 },
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  alignItems: 'stretch',
                  gap: { xs: 2, md: 0 }
                }}
              >
                {/* Left column */}
                <Box sx={{ width: { xs: '100%', md: '50%' }, pr: { xs: 0, md: 2 } }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Aktuálny týždeň
                  </Typography>
                  {currentWeek ? (
                    renderWeek(currentWeek, true)
                  ) : (
                    <Typography color="text.secondary">
                      Modul ešte nezačal. Začiatok: {formatDate(weeks[0]?.start)}
                    </Typography>
                  )}
                </Box>

                {/* Center separator */}
                <Box
                  sx={{
                    width: '1px',
                    display: { xs: 'none', md: 'block' },
                    backgroundColor: 'divider',
                    mx: 1,
                    alignSelf: 'stretch'
                  }}
                />

                {/* Right column - Week Selector Component */}
                <WeekSelector
                  selectedModul={selectedModul}
                  weeks={weeks}
                  selectedWeekNumber={selectedWeekNumber}
                  setSelectedWeekNumber={setSelectedWeekNumber}
                  formatDate={formatDate}
                  questionsByWeekMerged={questionsByWeekMerged}
                  modulQuestions={modulQuestions}
                  userId={userId}
                  setLocalCreated={setLocalCreated}
                  setQuestionToValidate={setQuestionToValidate}
                  setValidateOpen={setValidateOpen}
                  setQuestionToRespond={setQuestionToRespond}
                  setRespondOpen={setRespondOpen}
                  currentWeekNumber={getEffectiveCurrentWeek(weeks, now)?.weekNumber ?? 0}
                />
              </Box>
            );
          })()
        : null}

      {/* Validation modal for external questions */}
      <ValidateQuestionModal
        open={validateOpen}
        question={questionToValidate?.question || questionToValidate}
        assignment={questionToValidate?.assignment}
        onClose={() => setValidateOpen(false)}
        onSubmit={async (questionId, payload) => {
          try {
            // Submit validation using RTK Query - this will save to database
            await validateQuestion({
              questionId,
              valid: payload.valid,
              comment: payload.comment
            }).unwrap();

            toast.success('Recenzia bola uložená');
          } catch (error) {
            toast.error(error?.data?.message || 'Recenziu sa nepodarilo uložiť');
          }
        }}
      />

      {/* Response modal for week 3 */}
      <RespondToValidationModal
        open={respondOpen}
        question={questionToRespond}
        onClose={() => setRespondOpen(false)}
        onSubmit={async (questionId, payload) => {
          try {
            // Submit response using RTK Query - this will save to database
            await respondToValidation({
              questionId,
              agreed: payload.agreed,
              comment: payload.comment
            }).unwrap();

            toast.success('Vyjadrenie bolo uložené');
          } catch (error) {
            toast.error(error?.data?.message || 'Vyjadrenie sa nepodarilo uložiť');
          }
        }}
      />
    </Box>
  );
};

export default Dashboard;
