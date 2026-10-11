require("dotenv").config();
require("express-async-errors");
const express = require("express");
const i18next = require("i18next");
const middleware = require("i18next-http-middleware");
const { json } = require("body-parser");
const authMiddleware = require("./src/middlewares/auth");
const { throwError } = require("./src/util/universal");
const { errorHandler } = require("./src/middlewares/error-handler");
const { scheduleYearlyUnassignment } = require("./src/jobs/yearlyUnassignment");
const { scheduleInactiveUserCleanup } = require("./src/jobs/cleanupInactiveUsers");

const app = express();

// LOCALIZATION START
i18next.init({
  lng: "sk",
  fallbackLng: "sk",
  resources: {
    sk: {
      translation: require("./src/locales/sk").sk,
    },
  },
});
app.use(middleware.handle(i18next));
// LOCALIZATION END

app.use(express.json({ limit: "50mb" }));
app.use(json());

// Initialize scheduled jobs
scheduleYearlyUnassignment();
scheduleInactiveUserCleanup();

// Public routes should not use authMiddleware
app.use("/public", require("./src/routes/public")); // This is for public routes like signin and register

// Protected routes should use authMiddleware
app.use(authMiddleware); // Apply auth middleware after public routes

app.use("/user", require("./src/routes/user"));
app.use("/teacher", require("./src/routes/teacher"));
app.use("/subject", require("./src/routes/subject"));
app.use("/modul", require("./src/routes/modul"));
app.use("/question", require("./src/routes/question"));
app.use("/test", require("./src/routes/test"));
app.use("/calendar", require("./src/routes/calendar"));
app.use("/teacher-validated-questions", require("./src/routes/teacherValidatedQuestion"));
app.use("/project", require("./src/routes/project"));
app.use("/point", require("./src/routes/point"));
app.use("/forum", require("./src/routes/forumRoutes"));
app.use("/questionRating", require("./src/routes/questionRating"));
app.use("/admin", require("./src/routes/admin"));

app.use(function (req, res, next) {
  throwError("Hľadaná stránka neexistuje", 404);
});

app.use(errorHandler);

module.exports = app;
