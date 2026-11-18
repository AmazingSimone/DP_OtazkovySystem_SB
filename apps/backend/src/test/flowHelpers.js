/**
 * Helpers for the question-flow tests.
 *
 * These tests run against a real MongoDB, in a separate database whose name ends with
 * "_test". Every destructive helper checks that name first, so the tests can never
 * clear the application database.
 */
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const request = require("supertest");

const app = require("../../app");
const User = require("../models/user");
const Teacher = require("../models/teacher");
const Subject = require("../models/subject");
const Module = require("../models/modul");

const DAY = 24 * 60 * 60 * 1000;

const testDbUrl = () => {
    const url = process.env.MONGO_DATABASE_URL || "";
    const testUrl = url.replace(/\/otazkovySystem(\?|$)/, "/otazkovySystem_test$1");
    if (!url || testUrl === url) {
        throw new Error("Cannot derive a test database URL from MONGO_DATABASE_URL; refusing to run");
    }
    return testUrl;
};

const assertTestDb = () => {
    const name = mongoose.connection.name || "";
    if (!name.endsWith("_test")) {
        throw new Error(`Connected to "${name}", which is not a test database; refusing to continue`);
    }
};

const connect = async () => {
    await mongoose.connect(testDbUrl());
    assertTestDb();
};

const clearDb = async () => {
    assertTestDb();
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
        await collection.deleteMany({});
    }
};

const disconnect = async () => {
    assertTestDb();
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
};

let seq = 0;
const next = () => ++seq;

const createTeacher = async () => {
    const n = next();
    return Teacher.create({
        email: `teacher${n}@test.sk`,
        name: "Tea",
        surname: `Cher${n}`,
        isActive: true,
        emailConfirmed: true,
    });
};

const createSubject = async (teacher) => {
    const n = next();
    return Subject.create({
        name: `Subject ${n}`,
        code: `SUB${n}`,
        createdBy: teacher._id,
        assigned_teachers: [teacher._id],
    });
};

/** Creates an active student. Pass a subject to enrol them in it. */
const createStudent = async (subject) => {
    const n = next();
    const student = await User.create({
        email: `student${n}@test.sk`,
        name: "Stu",
        surname: `Dent${n}`,
        groupNumber: "G1",
        studentNumber: 100000 + n,
        isActive: true,
        emailConfirmed: true,
        assignedSubjects: subject ? [subject._id] : [],
    });
    if (subject) {
        await Subject.updateOne({ _id: subject._id }, { $push: { assigned_students: student._id } });
    }
    return student;
};

/**
 * Module dates that make `phase` the current one right now.
 * 0 = not started, 1-3 = that week is running, 4 = finished. Each week lasts one day.
 */
const phaseDates = (phase) => {
    const daysFromNowToStart = { 0: 1, 1: -0.5, 2: -1.5, 3: -2.5, 4: -5 }[phase];
    const start = Date.now() + daysFromNowToStart * DAY;
    return {
        date_start: new Date(start),
        week2_start: new Date(start + DAY),
        week3_start: new Date(start + 2 * DAY),
        date_end: new Date(start + 3 * DAY - 1),
    };
};

const createModule = async (subject, teacher, phase = 1) => {
    const n = next();
    return Module.create({
        title: `Module ${n}`,
        week_number: 3,
        subject: subject._id,
        createdBy: teacher._id,
        ...phaseDates(phase),
    });
};

/** Moves the module in time so that `phase` is the current one. */
const setPhase = async (modul, phase) => {
    await Module.updateOne({ _id: modul._id }, { $set: phaseDates(phase) });
};

const auth = (account) => ({
    "x-access-token": jwt.sign({ user_id: account._id }, process.env.TOKEN_KEY),
});

const questionBody = (modul, overrides = {}) => ({
    text: `What is 2 + 2? (${next()})`,
    options: { a: "1", b: "2", c: "3", d: "4" },
    correct: "d",
    modul: String(modul._id),
    ...overrides,
});

/** Creates `count` questions as the student through the API (the module must be in week 1). */
const writeQuestions = async (student, modul, count = 2) => {
    const created = [];
    for (let i = 0; i < count; i++) {
        const res = await request(app).post("/question").set(auth(student)).send(questionBody(modul)).expect(201);
        created.push(res.body);
    }
    return created;
};

module.exports = {
    writeQuestions,
    connect,
    clearDb,
    disconnect,
    createTeacher,
    createSubject,
    createStudent,
    createModule,
    setPhase,
    auth,
    questionBody,
};
