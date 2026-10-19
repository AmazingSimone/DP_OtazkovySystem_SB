const express = require("express");
const router = express.Router();
const {
  SignIn,
  Register,
  RegisterTeacher,
  checkUiVersion,
  signinTeacher,
  ConfirmEmail,
  requestPasswordReset,
  resetPassword,
} = require("../controllers/publicController");

const {
  exportPublicCalendarIcs,
} = require("../controllers/calendarController");

router.get("/calendar/:userId/calendar.ics", exportPublicCalendarIcs);
router.post("/signin", SignIn);
router.post("/signin-teacher", signinTeacher);
router.post("/register", Register);
router.post("/register-teacher", RegisterTeacher);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.get("/confirm-email/:token", ConfirmEmail);
router.post("/activation/:email/:hash", (req, res) => {
  res.status(404).send();
});

router.get("/checkUiVersion/:version", checkUiVersion);
router.get("/checkUiVersion", checkUiVersion);

module.exports = router;
