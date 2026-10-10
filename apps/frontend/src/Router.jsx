import { createBrowserRouter } from 'react-router-dom';
import MinimalLayout from './components/layout/MinimalLayout';
import Protected from './components/layout/Protected';
import { RouteNotFound } from './components/RouteNotFound.component';
import Dashboard from './pages/admin/dashboard/Dashboard';
import authRoutes from './pages/auth';

import adminRoutes from '@app/pages/admin';
import SubjectDetail from './pages/admin/subjects/SubjectDetail';
import Subjects from './pages/admin/subjects/Subjects';
import AllUsersQuestions from './pages/all-users-questions/AllUsersQuestions';
import ResetPassword from './pages/auth/reset-password';
import CalendarPage from './pages/calendar/CalendarPage';
import Forum from './pages/forum/Forum';
import MyQuestions from './pages/my-questions/MyQuestions';
import Projects from './pages/projects/Projects';
import TeacherDashboard from './pages/teacher-dashboard/TeacherDashboard';
import TakeTest from './pages/tests/TakeTest';
import TestResults from './pages/tests/TestResults';
import Tests from './pages/tests/Tests';
export const router = createBrowserRouter([
  {
    element: <MinimalLayout />,
    children: [
      {
        path: 'auth',
        children: authRoutes
      },
      {
        path: 'reset-password/:token',
        element: <ResetPassword />
      }
    ]
  },
  {
    element: <Protected />, // <MainLayout> is already inside Protected!
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/teacher-dashboard', element: <TeacherDashboard /> },
      { path: '/tests', element: <Tests /> },
      { path: '/test/:testId/take', element: <TakeTest /> },
      { path: '/test-results/:attemptId', element: <TestResults /> },
      { path: '/my-questions', element: <MyQuestions /> },
      { path: '/all-users-questions', element: <AllUsersQuestions /> },
      { path: '/forum', element: <Forum /> },
      { path: '/calendar', element: <CalendarPage /> },
      { path: '/subjects', element: <Subjects /> },
      { path: '/subjects/:subjectId', element: <SubjectDetail /> },
      { path: '/projects', element: <Projects /> },
      { path: 'admin', children: adminRoutes },
      { path: '*', element: <RouteNotFound /> }
    ]
  },
  {
    path: '*',
    element: <RouteNotFound />
  }
]);
