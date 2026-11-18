import ErrorNotifier from '@app/components/ErrorNotifier';
import * as authService from '@app/pages/auth/authService';
import {
  useLazyGetTeacherMeQuery,
  useLazyGetUserMeQuery,
  useLoginTeacherMutation,
  useLoginUserMutation
} from '@app/redux/api';
import { LoadingButton } from '@mui/lab';
import { Box, Card, Container, Link, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

export const AuthPage = () => {
  const [loginUser, { isLoading: isUserLoading }] = useLoginUserMutation();
  const [loginTeacher, { isLoading: isTeacherLoading }] = useLoginTeacherMutation();
  const [triggerUserMe] = useLazyGetUserMeQuery();
  const [triggerTeacherMe] = useLazyGetTeacherMeQuery();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const email = event.target.email.value.trim();
    const password = event.target.password.value.trim();
    // Staff addresses sign in as teachers, everything else as students.
    let isTeacher = email.endsWith('@uniza.sk');
    let response = isTeacher
      ? await loginTeacher({ email, password })
      : await loginUser({ email, password });
    if (response.error && isTeacher) {
      // A student account can also have a staff-style address (for example test accounts),
      // so try the student sign-in before giving up.
      const asStudent = await loginUser({ email, password });
      if (!asStudent.error) {
        response = asStudent;
        isTeacher = false;
      }
    }
    if (!response.error) {
      authService.saveTokenToStorage(response.data.token);
      let me;
      if (isTeacher) {
        me = await triggerTeacherMe().unwrap();
        // Try to get fullName from response or fallback to name + surname
        let teacherFullName =
          me.fullName || (me.name && me.surname ? `${me.name} ${me.surname}` : undefined);
        if (!teacherFullName && response.data && response.data.name && response.data.surname) {
          teacherFullName = `${response.data.name} ${response.data.surname}`;
        }
        if (!teacherFullName && response.data && response.data.fullName) {
          teacherFullName = response.data.fullName;
        }
        if (!teacherFullName) {
          teacherFullName = email;
        }
        authService.saveUserToStorage({ ...me, isTeacher: true, fullName: teacherFullName });
      } else {
        me = await triggerUserMe().unwrap();
        authService.saveUserToStorage(me);
      }
      navigate(isTeacher ? '/subjects' : '/');
    }
  };

  return (
    <Container
      component="main"
      maxWidth="sm"
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3 },
        pt: { xs: 3, sm: 4 },
        pb: { xs: 4, sm: 6 },
        bgcolor: 'none'
      }}
    >
      <Typography align="center" sx={{ mt: { xs: 1, sm: 2 } }} variant="h6" color="text.secondary">
        Prihláste sa pomocou svojho emailu
      </Typography>
      <Card
        sx={{
          mt: { xs: 2, sm: 3 },
          mb: { xs: 2, sm: 4 },
          width: '100%',
          maxWidth: 600,
          p: { xs: 1.5, sm: 2 }
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            mt: 1,
            width: '100%',
            paddingBlock: { xs: 1, sm: 2 },
            paddingInline: { xs: 0.5, sm: 1 }
          }}
        >
          <Typography component="h1" variant="h4" sx={{ mb: 2 }}>
            Prihlásenie
          </Typography>
          <TextField
            variant="outlined"
            label="Email"
            name="email"
            id="email"
            autoComplete="email"
            fullWidth
            required
          />
          <TextField
            required
            type="password"
            id="password"
            autoComplete="current-password"
            variant="outlined"
            label="Heslo"
            fullWidth
            sx={{ mt: 2 }}
          />
          <ErrorNotifier />
          <LoadingButton
            loading={isUserLoading || isTeacherLoading}
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 4 }}
          >
            Prihlásiť sa
          </LoadingButton>
          <Box
            sx={{
              mt: 4,
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%'
            }}
          >
            <Link component={RouterLink} to="/auth/request-password-reset" variant="body2">
              Zabudnuté heslo
            </Link>
            <Link component={RouterLink} to="/auth/register" variant="body2">
              Registruj sa
            </Link>
          </Box>
        </Box>
      </Card>
    </Container>
  );
};
