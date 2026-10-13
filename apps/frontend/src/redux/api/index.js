import * as authService from '@app/pages/auth/authService';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
// import { use } from 'react';

const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers) => {
    const token = authService.geTokenFromStorage();
    if (token) {
      headers.set('x-access-token', token);
    }
    return headers;
  }
});

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Users', 'Subjects', 'Moduls', 'Questions', 'QuestionRatings', 'ForumQuestions', 'Comments', 'Tests', 'Points', 'Projects', 'ProjectRatings', 'PendingAssignments', 'CalendarEvents'],
  endpoints: (builder) => ({
    // USERS
    getUserMe: builder.query({
      query: () => ({
        url: '/user/current',
        method: 'GET'
      })
    }),
    getTeacherMe: builder.query({
      query: () => ({
        url: '/teacher/current',
        method: 'GET'
      })
    }),
    // Auth
    loginUser: builder.mutation({
      query: (data) => ({
        url: '/public/signin',
        method: 'POST',
        body: data
      })
    }),
    loginTeacher: builder.mutation({
      query: (data) => ({
        url: '/public/signin-teacher',
        method: 'POST',
        body: data
      })
    }),
    requestPasswordReset: builder.mutation({
      query: (data) => ({
        url: '/public/request-password-reset',
        method: 'POST',
        body: data
      })
    }),
    resetPassword: builder.mutation({
      query: (data) => ({
        url: '/public/reset-password',
        method: 'POST',
        body: data
      })
    }),
    createUser: builder.mutation({
      query: (data) => ({
        url: '/admin/user',
        method: 'POST',
        body: data
      }),
      invalidatesTags: (result) => (result ? ['Users'] : [])
    }),
    createTeacher: builder.mutation({
      query: (data) => ({
        url: '/admin/teacher',
        method: 'POST',
        body: data
      }),
      invalidatesTags: (result) => (result ? ['Teachers'] : [])
    }),
    getAllTeachers: builder.query({
      query: () => ({
        url: '/admin/getAllTeachers',
        method: 'GET'
      }),
      providesTags: ['Teachers']
    }),
    removeTeacher: builder.mutation({
      query: (teacherId) => ({
        url: `/admin/teacher/${teacherId}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Teachers']
    }),
    updateTeacher: builder.mutation({
      query: (data) => ({
        url: `/admin/teacher/${data.teacherId}`,
        method: 'PUT',
        body: data.data
      }),
      invalidatesTags: (result) => (result ? ['Teachers'] : [])
    }),
    getUserById: builder.query({
      query: (userId) => ({
        url: `/user/${userId}`,
        method: 'GET'
      }),
      providesTags: ['Users']
    }),
    updateUser: builder.mutation({
      query: (data) => ({
        url: `/admin/user/${data.userId}`,
        method: 'PUT',
        body: data.data
      }),
      invalidatesTags: (result) => (result ? ['Users'] : [])
    }),
    removeUser: builder.mutation({
      query: (userId) => ({
        url: `/admin/user/${userId}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Users', 'Subjects']
    }),
    getUsersList: builder.query({
      query: ({ subjectId } = {}) => {
        const params = new URLSearchParams();
        if (subjectId) params.append('subjectId', subjectId);

        return {
          url: `/admin/getAllUsers?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Users'],
    }),
    getAdminUserDetails: builder.query({
      query: (userId) => ({
        url: `/admin/user/${userId}/details`,
        method: 'GET'
      }),
      providesTags: (result, error, userId) => [{ type: 'Users', id: userId }, 'Users']
    }),
    updateUserAcademicProfile: builder.mutation({
      query: ({ userId, data }) => ({
        url: `/admin/user/${userId}/academic-profile`,
        method: 'PATCH',
        body: data
      }),
      invalidatesTags: (result, error, { userId }) => [{ type: 'Users', id: userId }, 'Users']
    }),
    // SUBJECTS
    createSubject: builder.mutation({
      query: (data) => ({
        url: '/subject',
        method: 'POST',
        body: data
      })
    }),
    getUsersAssignedToSubject: builder.query({
      query: ({ subjectId }) => ({
        url: `/teacher/getAllUsersAssignedToSubject/${subjectId}`,
        method: 'GET',
      }),
      providesTags: ['Users'],
    }),
    getAllSubjects: builder.query({
      query: () => ({
        url: '/subject',
        method: 'GET'
      }),
      providesTags: ['Subjects']
    }),
    getAllSubjectsAssignedToUser: builder.query({
      query: (userId) => ({
        url: `/subject/assigned/${userId}`,
        method: 'GET'
      }),
      providesTags: ['Subjects']
    }),
    editSubject: builder.mutation({
      query: (data) => ({
        url: `/subject/${data.subjectId}`,
        method: 'PUT',
        body: data.data
      }),
      invalidatesTags: ['Subjects']
    }),
    deleteSubject: builder.mutation({
      query: (subjectId) => ({
        url: `/subject/${subjectId}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Subjects'],
    }),
    getSubjectById: builder.query({
      query: (subjectId) => ({
        url: `/subject/${subjectId}`,
        method: 'GET'
      }),
      providesTags: (result, error, subjectId) => [
        { type: 'Subjects', id: subjectId },
        'Subjects'
      ]
    }),
    asignUserToSubject: builder.mutation({
      query: (data) => ({
        url: '/subject/assign-user',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Users', 'Subjects']
    }),
    unasignUserFromSubject: builder.mutation({
      query: (data) => ({
        url: '/subject/unassign-user',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Users', 'Subjects']
    }),
    assignTeacherToSubject: builder.mutation({
      query: (data) => ({
        url: '/subject/assign-teacher',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Subjects', 'Teachers']
    }),
    unassignTeacherFromSubject: builder.mutation({
      query: (data) => ({
        url: '/subject/unassign-teacher',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Subjects', 'Teachers']
    }),
    triggerYearlyUnassignment: builder.mutation({
      query: () => ({
        url: '/subject/trigger-yearly-unassignment',
        method: 'POST'
      }),
      invalidatesTags: ['Users', 'Subjects']
    }),
    getTeacherSubjects: builder.query({
      query: () => ({
        url: '/subject/teacher/subjects',
        method: 'GET'
      }),
      providesTags: ['Subjects']
    }),
    // PENDING SUBJECT ASSIGNMENTS
    createPendingAssignments: builder.mutation({
      query: (data) => ({
        url: '/subject/pending-assignments',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['PendingAssignments']
    }),
    getPendingAssignments: builder.query({
      query: (subjectId) => ({
        url: `/subject/pending-assignments/${subjectId}`,
        method: 'GET'
      }),
      providesTags: (result, error, subjectId) => [
        { type: 'PendingAssignments', id: subjectId },
        'PendingAssignments'
      ]
    }),
    deletePendingAssignment: builder.mutation({
      query: (id) => ({
        url: `/subject/pending-assignment/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['PendingAssignments']
    }),
    deleteAllPendingAssignments: builder.mutation({
      query: (subjectId) => ({
        url: `/subject/pending-assignments/${subjectId}/all`,
        method: 'DELETE'
      }),
      invalidatesTags: ['PendingAssignments']
    }),
    // MODULES
    createModul: builder.mutation({
      query: (data) => ({
        url: '/modul',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Moduls']
    }),

    getAllModuls: builder.query({
      query: () => ({
        url: '/modul',
        method: 'GET'
      }),
      providesTags: ['Moduls']
    }),

    getModulById: builder.query({
      query: (modulId) => ({
        url: `/modul/${modulId}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [{ type: 'Moduls', id: arg }]
    }),

    getModulsBySubject: builder.query({
      query: (subjectId) => ({
        url: `/modul/subject/${subjectId}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [
        { type: 'Moduls', id: `SUBJECT-${arg}` },
        'Moduls'
      ]
    }),

    editModul: builder.mutation({
      query: ({ modulId, data }) => ({
        url: `/modul/${modulId}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'Moduls', id: arg.modulId },
        { type: 'Moduls', id: `SUBJECT-${result?.subject}` }
      ]
    }),

    deleteModul: builder.mutation({
      query: (modulId) => ({
        url: `/modul/${modulId}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Moduls']
    }),

    deleteAllModulsBySubject: builder.mutation({
      query: (subjectId) => ({
        url: `/modul/subject/${subjectId}`,
        method: 'DELETE'
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'Moduls', id: `SUBJECT-${arg}` },
        'Moduls'
      ]
    }),

    // QUESTIONS
    createQuestion: builder.mutation({
      query: (data) => ({
        url: '/question',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Questions', 'Points', 'ValidatedQuestions']
    }),
    getQuestionsByModul: builder.query({
      query: (modulId) => ({
        url: `/question/module/${modulId}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [
        { type: 'Questions', id: `MODUL-${arg}` },
        'Questions'
      ]
    }),
    deleteQuestion: builder.mutation({
      query: (questionId) => ({
        url: `/question/${questionId}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Questions']
    }),
    validateQuestion: builder.mutation({
      query: ({ questionId, valid, comment }) => ({
        url: `/question/${questionId}/validate`,
        method: 'POST',
        body: { valid, comment }
      }),
      invalidatesTags: (result, error, { questionId }) => [
        { type: 'Questions', id: questionId },
        'Questions',
        'Points'
      ]
    }),
    respondToValidation: builder.mutation({
      query: ({ questionId, agreed, comment }) => ({
        url: `/question/${questionId}/respond`,
        method: 'POST',
        body: { agreed, comment }
      }),
      invalidatesTags: (result, error, { questionId }) => [
        { type: 'Questions', id: questionId },
        'Questions',
        'Points'
      ]
    }),
    teacherValidateQuestion: builder.mutation({
      query: ({ questionId, validated_by_teacher, validated_by_teacher_comment }) => ({
        url: `/question/${questionId}/teacher-validate`,
        method: 'POST',
        body: { validated_by_teacher, validated_by_teacher_comment }
      }),
      invalidatesTags: (result, error, { questionId }) => [
        { type: 'Questions', id: questionId },
        'Questions'
      ]
    }),
    updateQuestion: builder.mutation({
      query: ({ questionId, ...data }) => ({
        url: `/question/${questionId}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (result, error, { questionId }) => [
        { type: 'Questions', id: questionId },
        'Questions'
      ]
    }),
    getQuestionsBySubjectId: builder.query({
      query: (subjectId) => ({
        url: `/question/subject/${subjectId}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [
        { type: 'Questions', id: `SUBJECT-${arg}` },
        'Questions'
      ]
    }),
    getValidatedQuestionsWithAgreementBySubject: builder.query({
      query: ({ subjectId, filter = 'all' }) => ({
        url: `/question/subject/${subjectId}/validated-with-agreement?filter=${filter}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [
        { type: 'Questions', id: `VALIDATED-SUBJECT-${arg.subjectId}-${arg.filter}` },
        'Questions'
      ]
    }),
    lazyGetQuestionsByModul: builder.query({
      query: (modulId) => ({
        url: `/question/modul/${modulId}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [
        { type: 'Questions', id: `MODUL-${arg}` },
        'Questions'
      ]
    }),
    getQuestionById: builder.query({
      query: (questionId) => ({
        url: `/question/${questionId}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [
        { type: 'Questions', id: arg }
      ]
    }),
    getQuestionByUserId: builder.query({
      query: (userId) => ({
        url: `/question/user/${userId}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [
        { type: 'Questions', id: `USER-${arg}` },
        'Questions'
      ]
    }),

    // QUESTION ASSIGNMENTS (Week 2)
    getQuestionAssignments: builder.query({
      query: ({ userId, modulId }) => ({
        url: `/question/assignments/${userId}/${modulId}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [
        { type: 'Questions', id: `ASSIGNMENTS-${arg.userId}-${arg.modulId}` },
        'Questions'
      ]
    }),

    // Bulk assign all questions for a module (call once when transitioning to Week 2)
    bulkAssignQuestions: builder.mutation({
      query: (modulId) => ({
        url: `/question/assignments/bulk/${modulId}`,
        method: 'POST'
      }),
      invalidatesTags: ['Questions']
    }),

    // QUESTION RATINGS
    createQuestionRating: builder.mutation({
      query: (data) => ({
        url: '/questionRating',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['QuestionRatings']
    }),
    editQuestionRating: builder.mutation({
      query: ({ id, data }) => ({
        url: `/questionRating/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: ['QuestionRatings']
    }),
    deleteQuestionRating: builder.mutation({
      query: (id) => ({
        url: `/questionRating/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['QuestionRatings']
    }),
    getRatingsByQuestionId: builder.query({
      query: (questionId) => ({
        url: `/questionRating/question/${questionId}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [
        { type: 'QuestionRatings', id: `QUESTION-${arg}` },
        'QuestionRatings'
      ]
    }),
    getRatingsByUserId: builder.query({
      query: (userId) => ({
        url: `/questionRating/user/${userId}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [
        { type: 'QuestionRatings', id: `USER-${arg}` },
        'QuestionRatings'
      ]
    }),

    // FORUM QUESTIONS
    getForumQuestions: builder.query({
      query: ({ page = 1, limit = 10, modul, tags, search, sortBy, createdByModel, createdBy } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (modul) params.append('modul', modul);
        if (tags) params.append('tags', tags);
        if (search) params.append('search', search);
        if (sortBy) params.append('sortBy', sortBy);
        if (createdByModel) params.append('createdByModel', createdByModel);
        if (createdBy) params.append('createdBy', createdBy);

        return {
          url: `/forum/questions?${params.toString()}`,
          method: 'GET'
        };
      },
      providesTags: (result) => [
        ...(result?.data || []).map(({ _id }) => ({ type: 'ForumQuestions', id: _id })),
        'ForumQuestions'
      ]
    }),

    getForumQuestion: builder.query({
      query: (id) => ({
        url: `/forum/questions/${id}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [
        { type: 'ForumQuestions', id: arg },
        { type: 'Comments', id: `QUESTION-${arg}` }
      ]
    }),

    createForumQuestion: builder.mutation({
      query: (data) => ({
        url: '/forum/questions',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['ForumQuestions']
    }),

    addComment: builder.mutation({
      query: ({ questionId, ...data }) => ({
        url: `/forum/questions/${questionId}/comments`,
        method: 'POST',
        body: data
      }),
      invalidatesTags: (result, error, { questionId }) => [
        { type: 'ForumQuestions', id: questionId },
        { type: 'Comments', id: `QUESTION-${questionId}` }
      ]
    }),

    likeForumQuestion: builder.mutation({
      query: (questionId) => ({
        url: `/forum/questions/${questionId}/like`,
        method: 'POST'
      }),
      async onQueryStarted(questionId, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled;

          // Get current state to find all relevant cache entries
          const state = getState();
          const queriesState = state.api.queries;

          // Update all getForumQuestions cache entries
          Object.keys(queriesState).forEach(key => {
            if (key.startsWith('getForumQuestions')) {
              const match = key.match(/getForumQuestions\((.+)\)/);
              if (match) {
                try {
                  const queryArg = JSON.parse(match[1]);
                  dispatch(
                    api.util.updateQueryData('getForumQuestions', queryArg, (draft) => {
                      if (draft?.data) {
                        const question = draft.data.find(q => q._id === questionId);
                        if (question) {
                          question.likes_count = data.data.likes_count;
                          question.dislikes_count = data.data.dislikes_count;
                          question.user_liked = data.data.user_liked;
                          question.user_disliked = data.data.user_disliked;
                        }
                      }
                    })
                  );
                } catch {
                  // Skip malformed cache keys
                }
              }
            }
          });

          // Update specific question cache
          dispatch(
            api.util.updateQueryData('getForumQuestion', questionId, (draft) => {
              if (draft?.data?.question) {
                draft.data.question.likes_count = data.data.likes_count;
                draft.data.question.dislikes_count = data.data.dislikes_count;
                draft.data.question.user_liked = data.data.user_liked;
                draft.data.question.user_disliked = data.data.user_disliked;
              }
            })
          );
        } catch (error) {
          console.error('[RTK] Like mutation failed:', error);
        }
      }
    }),

    dislikeForumQuestion: builder.mutation({
      query: (questionId) => ({
        url: `/forum/questions/${questionId}/dislike`,
        method: 'POST'
      }),
      async onQueryStarted(questionId, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled;

          // Get current state to find all relevant cache entries
          const state = getState();
          const queriesState = state.api.queries;

          // Update all getForumQuestions cache entries
          Object.keys(queriesState).forEach(key => {
            if (key.startsWith('getForumQuestions')) {
              const match = key.match(/getForumQuestions\((.+)\)/);
              if (match) {
                try {
                  const queryArg = JSON.parse(match[1]);
                  dispatch(
                    api.util.updateQueryData('getForumQuestions', queryArg, (draft) => {
                      if (draft?.data) {
                        const question = draft.data.find(q => q._id === questionId);
                        if (question) {
                          question.likes_count = data.data.likes_count;
                          question.dislikes_count = data.data.dislikes_count;
                          question.user_liked = data.data.user_liked;
                          question.user_disliked = data.data.user_disliked;
                        }
                      }
                    })
                  );
                } catch {
                  // Skip malformed cache keys
                }
              }
            }
          });

          // Update specific question cache
          dispatch(
            api.util.updateQueryData('getForumQuestion', questionId, (draft) => {
              if (draft?.data?.question) {
                draft.data.question.likes_count = data.data.likes_count;
                draft.data.question.dislikes_count = data.data.dislikes_count;
                draft.data.question.user_liked = data.data.user_liked;
                draft.data.question.user_disliked = data.data.user_disliked;
              }
            })
          );
        } catch (error) {
          console.error('[RTK] Dislike mutation failed:', error);
        }
      }
    }),

    likeComment: builder.mutation({
      query: (commentId) => ({
        url: `/forum/comments/${commentId}/like`,
        method: 'POST'
      }),
      async onQueryStarted(commentId, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled;

          // Update all cached instances of getForumQuestion
          const state = getState();
          const queriesState = state.api.queries;

          Object.keys(queriesState).forEach(key => {
            if (key.startsWith('getForumQuestion')) {
              const match = key.match(/getForumQuestion\((.+)\)/);
              if (match) {
                try {
                  const queryArg = JSON.parse(match[1].replace(/"/g, '"'));
                  dispatch(
                    api.util.updateQueryData('getForumQuestion', queryArg, (draft) => {
                      const updateCommentInTree = (comments) => {
                        for (let comment of comments) {
                          if (comment._id === commentId) {
                            comment.likes_count = data.data.likes_count;
                            comment.dislikes_count = data.data.dislikes_count;
                            comment.user_liked = data.data.user_liked;
                            comment.user_disliked = data.data.user_disliked;
                            return true;
                          }
                          if (comment.replies && updateCommentInTree(comment.replies)) {
                            return true;
                          }
                        }
                        return false;
                      };
                      if (draft?.data?.comments) {
                        updateCommentInTree(draft.data.comments);
                      }
                    })
                  );
                } catch {
                  // Skip malformed cache keys
                }
              }
            }
          });
        } catch (error) {
          console.error('[RTK] Comment like mutation failed:', error);
        }
      },
      invalidatesTags: ['ForumQuestions']
    }),

    dislikeComment: builder.mutation({
      query: (commentId) => ({
        url: `/forum/comments/${commentId}/dislike`,
        method: 'POST'
      }),
      async onQueryStarted(commentId, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled;

          // Update all cached instances of getForumQuestion
          const state = getState();
          const queriesState = state.api.queries;

          Object.keys(queriesState).forEach(key => {
            if (key.startsWith('getForumQuestion')) {
              const match = key.match(/getForumQuestion\((.+)\)/);
              if (match) {
                try {
                  const queryArg = JSON.parse(match[1].replace(/"/g, '"'));
                  dispatch(
                    api.util.updateQueryData('getForumQuestion', queryArg, (draft) => {
                      const updateCommentInTree = (comments) => {
                        for (let comment of comments) {
                          if (comment._id === commentId) {
                            comment.likes_count = data.data.likes_count;
                            comment.dislikes_count = data.data.dislikes_count;
                            comment.user_liked = data.data.user_liked;
                            comment.user_disliked = data.data.user_disliked;
                            return true;
                          }
                          if (comment.replies && updateCommentInTree(comment.replies)) {
                            return true;
                          }
                        }
                        return false;
                      };
                      if (draft?.data?.comments) {
                        updateCommentInTree(draft.data.comments);
                      }
                    })
                  );
                } catch {
                  // Skip malformed cache keys
                }
              }
            }
          });
        } catch (error) {
          console.error('[RTK] Comment dislike mutation failed:', error);
        }
      },
      invalidatesTags: ['ForumQuestions']
    }),

    // Get all forum tags for suggestions
    getForumTags: builder.query({
      query: () => ({
        url: '/forum/tags',
        method: 'GET'
      }),
      providesTags: ['ForumQuestions']
    }),

    // TESTS
    createTest: builder.mutation({
      query: (data) => ({
        url: '/test',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Tests']
    }),
    getTestsBySubject: builder.query({
      query: ({ subjectId, is_published }) => ({
        url: `/test/subject/${subjectId}`,
        method: 'GET',
        params: is_published !== undefined ? { is_published } : {}
      }),
      providesTags: (result, error, arg) => [
        { type: 'Tests', id: `SUBJECT-${arg.subjectId}` },
        'Tests'
      ]
    }),
    getTestsByTeacher: builder.query({
      query: () => ({
        url: '/test/teacher',
        method: 'GET'
      }),
      providesTags: ['Tests']
    }),
    getTestById: builder.query({
      query: (id) => ({
        url: `/test/${id}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [
        { type: 'Tests', id: arg },
        'Tests'
      ]
    }),
    updateTest: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/test/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Tests', id },
        'Tests'
      ]
    }),
    deleteTest: builder.mutation({
      query: (id) => ({
        url: `/test/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Tests']
    }),
    toggleTestPublication: builder.mutation({
      query: ({ id, is_published }) => ({
        url: `/test/${id}/publish`,
        method: 'PATCH',
        body: { is_published }
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Tests', id },
        'Tests'
      ]
    }),
    getTestStatistics: builder.query({
      query: (id) => ({
        url: `/test/${id}/statistics`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [
        { type: 'Tests', id: `STATS-${arg}` }
      ]
    }),
    startTestAttempt: builder.mutation({
      query: (testId) => ({
        url: `/test/${testId}/start-attempt`,
        method: 'POST'
      }),
      invalidatesTags: ['TestAttempts']
    }),
    submitTestAttempt: builder.mutation({
      query: ({ attemptId, answers }) => ({
        url: `/test/attempt/${attemptId}/submit`,
        method: 'POST',
        body: { answers }
      }),
      invalidatesTags: (result, error, arg) => {
        // Invalidate all test attempts queries
        const tags = [
          'TestAttempts',
          { type: 'TestAttempt', id: arg.attemptId }
        ];
        // Also invalidate the specific test's attempts if we have the testId
        if (result?.data?.testAttempt?.test) {
          tags.push({ type: 'TestAttempts', id: `TEST-${result.data.testAttempt.test}` });
        }
        return tags;
      }
    }),
    getTestAttemptById: builder.query({
      query: (attemptId) => ({
        url: `/test/attempt/${attemptId}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [{ type: 'TestAttempt', id: arg }]
    }),
    getUserTestAttempts: builder.query({
      query: (testId) => ({
        url: `/test/${testId}/user-attempts`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [{ type: 'TestAttempts', id: `TEST-${arg}` }]
    }),
    deleteTestAttempt: builder.mutation({
      query: (attemptId) => ({
        url: `/test/attempt/${attemptId}`,
        method: 'DELETE'
      }),
      invalidatesTags: (result, error, attemptId) => [
        { type: 'TestAttempts', id: 'LIST' },
        { type: 'TestAttempt', id: attemptId }
      ]
    }),

    // CALENDAR
    getCalendarEvents: builder.query({
      query: () => ({
        url: '/calendar',
        method: 'GET'
      }),
      providesTags: (result) => [
        ...(result?.data || []).map(({ _id, id }) => ({ type: 'CalendarEvents', id: _id || id })),
        'CalendarEvents'
      ]
    }),
    getMyCalendarEvents: builder.query({
      query: () => ({
        url: '/calendar/my-events',
        method: 'GET'
      }),
      providesTags: (result) => [
        ...(result?.data || []).map(({ _id, id }) => ({ type: 'CalendarEvents', id: _id || id })),
        'CalendarEvents'
      ]
    }),
    exportCalendarIcs: builder.query({
      query: () => ({
        url: '/calendar/calendar.ics',
        method: 'GET',
        responseHandler: (response) => response.text()
      })
    }),
    getCalendarEventById: builder.query({
      query: (id) => ({
        url: `/calendar/${id}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [{ type: 'CalendarEvents', id: arg }]
    }),
    createCalendarEvent: builder.mutation({
      query: (data) => ({
        url: '/calendar',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['CalendarEvents']
    }),
    updateCalendarEvent: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/calendar/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'CalendarEvents', id }, 'CalendarEvents']
    }),
    deleteCalendarEvent: builder.mutation({
      query: (id) => ({
        url: `/calendar/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['CalendarEvents']
    }),

    // TEACHER VALIDATED QUESTIONS FOR TESTS
    getValidatedQuestionsForTest: builder.query({
      query: (testId) => ({
        url: `/teacher-validated-questions/test/${testId}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [
        { type: 'ValidatedQuestions', id: `TEST-${arg}` },
        'ValidatedQuestions'
      ]
    }),
    getValidatedQuestionsByModules: builder.query({
      query: (moduleIds) => ({
        url: `/teacher-validated-questions/by-modules?moduleIds=${moduleIds}`,
        method: 'GET'
      }),
      providesTags: ['ValidatedQuestions']
    }),
    getValidatedQuestionsCount: builder.query({
      query: (moduleIds) => ({
        url: `/teacher-validated-questions/count?moduleIds=${moduleIds}`,
        method: 'GET'
      })
    }),
    addQuestionToTestPool: builder.mutation({
      query: (data) => ({
        url: '/teacher-validated-questions',
        method: 'POST',
        body: data
      }),
      invalidatesTags: (result, error, { testId }) => [
        { type: 'ValidatedQuestions', id: `TEST-${testId}` },
        'ValidatedQuestions'
      ]
    }),
    removeQuestionFromTestPool: builder.mutation({
      query: (id) => ({
        url: `/teacher-validated-questions/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['ValidatedQuestions']
    }),

    // POINTS
    getUserPoints: builder.query({
      query: (userId) => ({
        url: `/point/user/${userId}`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [
        { type: 'Points', id: `USER-${arg}` },
        'Points'
      ]
    }),
    getUserPointsSummary: builder.query({
      query: (userId) => ({
        url: `/point/user/${userId}/summary`,
        method: 'GET'
      }),
      providesTags: (result, error, arg) => [
        { type: 'Points', id: `SUMMARY-USER-${arg}` },
        'Points'
      ]
    }),
    getUsersPointsSummary: builder.mutation({
      query: ({ userIds, subjectId }) => ({
        url: `/point/users/summary`,
        method: 'POST',
        body: { userIds, subjectId }
      }),
      invalidatesTags: ['Points']
    }),
    awardPointsForQuestionCreation: builder.mutation({
      query: (teacherId) => ({
        url: '/point/award/week1',
        method: 'POST',
        body: { teacherId }
      }),
      invalidatesTags: ['Points']
    }),
    awardPointsForQuestionValidation: builder.mutation({
      query: (teacherId) => ({
        url: '/point/award/week2',
        method: 'POST',
        body: { teacherId }
      }),
      invalidatesTags: ['Points']
    }),
    awardPointsForQuestionReparation: builder.mutation({
      query: (teacherId) => ({
        url: '/point/award/week3',
        method: 'POST',
        body: { teacherId }
      }),
      invalidatesTags: ['Points']
    }),
    awardCustomPoints: builder.mutation({
      query: (data) => ({
        url: '/point/award/custom',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Points']
    }),
    updatePoint: builder.mutation({
      query: ({ pointId, points, reason }) => ({
        url: `/point/${pointId}`,
        method: 'PUT',
        body: { points, reason }
      }),
      invalidatesTags: ['Points']
    }),
    deletePoint: builder.mutation({
      query: (pointId) => ({
        url: `/point/${pointId}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Points']
    }),

    // PROJECTS
    createProject: builder.mutation({
      query: (projectData) => ({
        url: '/project',
        method: 'POST',
        body: projectData
      }),
      invalidatesTags: ['Projects']
    }),
    getAllProjects: builder.query({
      query: ({ subject, status } = {}) => {
        const params = new URLSearchParams();
        if (subject) params.append('subject', subject);
        if (status) params.append('status', status);
        return {
          url: `/project?${params.toString()}`,
          method: 'GET'
        };
      },
      providesTags: ['Projects']
    }),
    getProjectById: builder.query({
      query: (id) => ({
        url: `/project/${id}`,
        method: 'GET'
      }),
      providesTags: (result, error, id) => [{ type: 'Projects', id }]
    }),
    getUserProjects: builder.query({
      query: () => ({
        url: '/project/my-projects',
        method: 'GET'
      }),
      providesTags: ['Projects']
    }),
    updateProject: builder.mutation({
      query: ({ id, ...projectData }) => ({
        url: `/project/${id}`,
        method: 'PUT',
        body: projectData
      }),
      invalidatesTags: (result, error, { id }) => ['Projects', { type: 'Projects', id }]
    }),
    deleteProject: builder.mutation({
      query: (id) => ({
        url: `/project/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Projects']
    }),
    assignUsersToProject: builder.mutation({
      query: ({ id, userIds }) => ({
        url: `/project/${id}/assign-users`,
        method: 'POST',
        body: { userIds }
      }),
      invalidatesTags: (result, error, { id }) => ['Projects', { type: 'Projects', id }]
    }),
    removeUserFromProject: builder.mutation({
      query: ({ projectId, userId }) => ({
        url: `/project/${projectId}/users/${userId}`,
        method: 'DELETE'
      }),
      invalidatesTags: (result, error, { projectId }) => ['Projects', { type: 'Projects', id: projectId }]
    }),

    // PROJECT RATINGS (Peer Evaluation)
    saveProjectRating: builder.mutation({
      query: (ratingData) => ({
        url: '/project/ratings',
        method: 'POST',
        body: ratingData
      }),
      invalidatesTags: ['ProjectRatings']
    }),
    getAllProjectRatings: builder.query({
      query: ({ subjectId } = {}) => {
        const params = new URLSearchParams();
        if (subjectId) params.append('subjectId', subjectId);
        return {
          url: `/project/ratings/all?${params.toString()}`,
          method: 'GET'
        };
      },
      providesTags: ['ProjectRatings']
    }),
    getProjectRatingsSummary: builder.query({
      query: ({ subjectId } = {}) => {
        const params = new URLSearchParams();
        if (subjectId) params.append('subjectId', subjectId);
        return {
          url: `/project/ratings/summary?${params.toString()}`,
          method: 'GET'
        };
      },
      providesTags: ['ProjectRatings']
    }),


  })
});

export const {
  // USERS / TEACHERS
  useGetUsersAssignedToSubjectQuery,
  useGetUserMeQuery,
  useLazyGetUserMeQuery,
  useGetTeacherMeQuery,
  useLazyGetTeacherMeQuery,
  useLoginUserMutation,
  useLoginTeacherMutation,
  useRequestPasswordResetMutation,
  useResetPasswordMutation,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useCreateTeacherMutation,
  useRemoveTeacherMutation,
  useUpdateUserMutation,
  useGetAdminUserDetailsQuery,
  useUpdateUserAcademicProfileMutation,
  useUpdateTeacherMutation,
  useRemoveUserMutation,
  useGetUsersListQuery,
  useGetAllTeachersQuery,
  // SUBJECTS
  useCreateSubjectMutation,
  useGetAllSubjectsQuery,
  useGetAllSubjectsAssignedToUserQuery,
  useEditSubjectMutation,
  useDeleteSubjectMutation,
  useGetSubjectByIdQuery,
  useAsignUserToSubjectMutation,
  useUnasignUserFromSubjectMutation,
  useAssignTeacherToSubjectMutation,
  useUnassignTeacherFromSubjectMutation,
  useTriggerYearlyUnassignmentMutation,
  useGetTeacherSubjectsQuery,
  // PENDING ASSIGNMENTS
  useCreatePendingAssignmentsMutation,
  useGetPendingAssignmentsQuery,
  useDeletePendingAssignmentMutation,
  useDeleteAllPendingAssignmentsMutation,
  // MODULS
  useCreateModulMutation,
  useGetAllModulsQuery,
  useLazyGetAllModulsQuery,
  useGetModulByIdQuery,
  useLazyGetModulByIdQuery,
  useGetModulsBySubjectQuery,
  useLazyGetModulsBySubjectQuery,
  useEditModulMutation,
  useDeleteModulMutation,
  useDeleteAllModulsBySubjectMutation,
  // QUESTIONS
  useCreateQuestionMutation,
  useGetQuestionsByModulQuery,
  useLazyGetQuestionsByModulQuery,
  useDeleteQuestionMutation,
  useValidateQuestionMutation,
  useRespondToValidationMutation,
  useTeacherValidateQuestionMutation,
  useUpdateQuestionMutation,
  useGetQuestionsBySubjectIdQuery,
  useLazyGetQuestionsBySubjectIdQuery,
  useGetValidatedQuestionsWithAgreementBySubjectQuery,
  useLazyGetValidatedQuestionsWithAgreementBySubjectQuery,
  useGetQuestionByIdQuery,
  useLazyGetQuestionByIdQuery,
  useGetQuestionByUserIdQuery,
  useGetQuestionAssignmentsQuery,
  useBulkAssignQuestionsMutation,
  // QUESTION RATINGS
  useCreateQuestionRatingMutation,
  useEditQuestionRatingMutation,
  useDeleteQuestionRatingMutation,
  useGetRatingsByQuestionIdQuery,
  useGetRatingsByUserIdQuery,
  // FORUM
  useGetForumQuestionsQuery,
  useLazyGetForumQuestionsQuery,
  useGetForumQuestionQuery,
  useLazyGetForumQuestionQuery,
  useCreateForumQuestionMutation,
  useAddCommentMutation,
  useLikeForumQuestionMutation,
  useDislikeForumQuestionMutation,
  useLikeCommentMutation,
  useDislikeCommentMutation,
  useGetForumTagsQuery,
  useLazyGetForumTagsQuery,
  // TESTS
  useCreateTestMutation,
  useGetTestsBySubjectQuery,
  useLazyGetTestsBySubjectQuery,
  useGetTestsByTeacherQuery,
  useLazyGetTestsByTeacherQuery,
  useGetTestByIdQuery,
  useLazyGetTestByIdQuery,
  useUpdateTestMutation,
  useDeleteTestMutation,
  useToggleTestPublicationMutation,
  useGetTestStatisticsQuery,
  useLazyGetTestStatisticsQuery,
  useStartTestAttemptMutation,
  useSubmitTestAttemptMutation,
  useGetTestAttemptByIdQuery,
  useLazyGetTestAttemptByIdQuery,
  useGetUserTestAttemptsQuery,
  useLazyGetUserTestAttemptsQuery,
  useDeleteTestAttemptMutation,
  // TEACHER VALIDATED QUESTIONS
  useGetValidatedQuestionsForTestQuery,
  useLazyGetValidatedQuestionsForTestQuery,
  useGetValidatedQuestionsByModulesQuery,
  useLazyGetValidatedQuestionsByModulesQuery,
  useGetValidatedQuestionsCountQuery,
  useLazyGetValidatedQuestionsCountQuery,
  useAddQuestionToTestPoolMutation,
  useRemoveQuestionFromTestPoolMutation,
  // CALENDAR
  useGetCalendarEventsQuery,
  useLazyGetCalendarEventsQuery,
  useGetMyCalendarEventsQuery,
  useLazyGetMyCalendarEventsQuery,
  useExportCalendarIcsQuery,
  useLazyExportCalendarIcsQuery,
  useGetCalendarEventByIdQuery,
  useLazyGetCalendarEventByIdQuery,
  useCreateCalendarEventMutation,
  useUpdateCalendarEventMutation,
  useDeleteCalendarEventMutation,
  // POINTS
  useGetUserPointsQuery,
  useLazyGetUserPointsQuery,
  useGetUserPointsSummaryQuery,
  useLazyGetUserPointsSummaryQuery,
  useGetUsersPointsSummaryMutation,
  useAwardPointsForQuestionCreationMutation,
  useAwardPointsForQuestionValidationMutation,
  useAwardPointsForQuestionReparationMutation,
  useAwardCustomPointsMutation,
  useUpdatePointMutation,
  useDeletePointMutation,
  // PROJECTS
  useCreateProjectMutation,
  useGetAllProjectsQuery,
  useLazyGetAllProjectsQuery,
  useGetProjectByIdQuery,
  useLazyGetProjectByIdQuery,
  useGetUserProjectsQuery,
  useLazyGetUserProjectsQuery,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useAssignUsersToProjectMutation,
  useRemoveUserFromProjectMutation,
  // PROJECT RATINGS
  useSaveProjectRatingMutation,
  useGetAllProjectRatingsQuery,
  useLazyGetAllProjectRatingsQuery,
  useGetProjectRatingsSummaryQuery,
  useLazyGetProjectRatingsSummaryQuery,
} = api;
