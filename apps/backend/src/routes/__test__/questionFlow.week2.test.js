const request = require("supertest");
const app = require("../../../app");
const Question = require("../../models/question");
const QuestionAssignment = require("../../models/questionAssignment");
const Module = require("../../models/modul");
const User = require("../../models/user");
const Point = require("../../models/point");
const { syncDueModules } = require("../../services/questionReview");
const {
    connect, clearDb, disconnect,
    createTeacher, createSubject, createStudent, createModule, setPhase, auth, questionBody,
} = require("../../test/flowHelpers");

let teacher, subject, modul, students;

beforeAll(connect);
afterAll(disconnect);

const writeQuestions = async (student, count = 2) => {
    for (let i = 0; i < count; i++) {
        await request(app).post("/question").set(auth(student)).send(questionBody(modul)).expect(201);
    }
};

const getAssignments = (student, as = student) =>
    request(app).get(`/question/assignments/${student._id}/${modul._id}`).set(auth(as));

const review = (reviewer, questionId, body) =>
    request(app).post(`/question/${questionId}/validate`).set(auth(reviewer)).send(body);

beforeEach(async () => {
    await clearDb();
    teacher = await createTeacher();
    subject = await createSubject(teacher);
    modul = await createModule(subject, teacher, 1);
    students = [];
    for (let i = 0; i < 4; i++) students.push(await createStudent(subject));
});

describe("week 2: dealing the reviews", () => {
    beforeEach(async () => {
        for (const s of students) await writeQuestions(s);
    });

    it("does not deal anything while week 1 is still running", async () => {
        await syncDueModules();
        const res = await getAssignments(students[0]).expect(200);

        expect(res.body.data).toEqual([]);
        expect(await QuestionAssignment.countDocuments({})).toBe(0);
    });

    it("deals two questions of other students to every student when week 2 starts", async () => {
        await setPhase(modul, 2);
        await syncDueModules();

        expect(await QuestionAssignment.countDocuments({})).toBe(8);
        for (const s of students) {
            const mine = await QuestionAssignment.find({ assignedTo: s._id }).populate("question");
            expect(mine).toHaveLength(2);
            mine.forEach((a) => expect(String(a.question.createdBy)).not.toBe(String(s._id)));
        }
    });

    it("gives every question exactly one reviewer", async () => {
        await setPhase(modul, 2);
        await syncDueModules();

        const perQuestion = await QuestionAssignment.aggregate([{ $group: { _id: "$question", n: { $sum: 1 } } }]);
        expect(perQuestion).toHaveLength(8);
        expect(perQuestion.every((g) => g.n === 1)).toBe(true);
    });

    it("deals on the first request of week 2 even if the scheduled job has not run yet", async () => {
        await setPhase(modul, 2);
        const res = await getAssignments(students[0]).expect(200);

        expect(res.body.data).toHaveLength(2);
    });

    it("shows a student the same two questions in the same order on every request", async () => {
        await setPhase(modul, 2);
        const first = (await getAssignments(students[0]).expect(200)).body.data.map((a) => a.question._id);
        await syncDueModules();
        const second = (await getAssignments(students[0]).expect(200)).body.data.map((a) => a.question._id);
        const third = (await getAssignments(students[0]).expect(200)).body.data.map((a) => a.question._id);

        expect(first).toHaveLength(2);
        expect(second).toEqual(first);
        expect(third).toEqual(first);
    });

    it("deals only once even when triggered many times at the same moment", async () => {
        await setPhase(modul, 2);
        await Promise.all([
            syncDueModules(),
            syncDueModules(),
            ...students.map((s) => getAssignments(s)),
        ]);

        expect(await QuestionAssignment.countDocuments({})).toBe(8);
    });

    it("does not deal questions that were added to the module later", async () => {
        await setPhase(modul, 2);
        await syncDueModules();
        await Question.create({ ...questionBody(modul), createdBy: students[0]._id });
        await syncDueModules();

        expect(await QuestionAssignment.countDocuments({})).toBe(8);
    });

    it("hides the author from the reviewer but shows which answer is marked correct", async () => {
        await setPhase(modul, 2);
        const res = await getAssignments(students[0]).expect(200);

        expect(res.body.data).toHaveLength(2);
        res.body.data.forEach((a) => {
            expect(a.question.text).toBeDefined();
            expect(a.question.correct).toBe("d");
            expect(a.question.createdBy).toBeUndefined();
            expect(a.question.createdByName).toBeUndefined();
        });
    });

    it("refuses to show one student the assignments of another", async () => {
        await setPhase(modul, 2);
        await getAssignments(students[1], students[0]).expect(403);
    });

    it("leaves questions written by a teacher out of the deal", async () => {
        const teacherQuestion = (
            await request(app).post("/question").set(auth(teacher)).send(questionBody(modul)).expect(201)
        ).body;
        await setPhase(modul, 2);
        await syncDueModules();

        expect(await QuestionAssignment.countDocuments({})).toBe(8);
        expect(await QuestionAssignment.countDocuments({ question: teacherQuestion._id })).toBe(0);
        expect((await Question.findById(teacherQuestion._id)).review_tag).toBeNull();
    });
});

describe("week 2: when questions and reviewers do not match up", () => {
    it("awards an automatic point for every review slot that has no question", async () => {
        // Only the first student wrote questions, so the other three share two questions.
        await writeQuestions(students[0]);
        await setPhase(modul, 2);
        await syncDueModules();

        const auto = (s) => Point.countDocuments({
            student: s._id,
            category: "question_validation",
            "related_entity.entity_type": "Module",
            "related_entity.entity_id": modul._id,
        });
        const assigned = (s) => QuestionAssignment.countDocuments({ assignedTo: s._id });

        expect(await assigned(students[0])).toBe(0);
        expect(await auto(students[0])).toBe(2);

        let totalAssigned = 0;
        for (const s of students.slice(1)) {
            const n = await assigned(s);
            expect(n).toBeLessThanOrEqual(1);
            expect(await auto(s)).toBe(2 - n);
            totalAssigned += n;
        }
        expect(totalAssigned).toBe(2);
    });

    it("reports the automatic points of this module to the student", async () => {
        await writeQuestions(students[0]);
        await setPhase(modul, 2);
        const res = await getAssignments(students[0]).expect(200);

        expect(res.body.data).toEqual([]);
        expect(res.body.automaticPoints).toBe(2);
    });

    it("gives a question without a reviewer an automatic fault review tagged missing_reviewer", async () => {
        // Everyone wrote two questions, then three of the four students left the subject.
        for (const s of students) await writeQuestions(s);
        const leavers = students.slice(1).map((s) => s._id);
        await User.updateMany({ _id: { $in: leavers } }, { $set: { isActive: false } });

        await setPhase(modul, 2);
        await syncDueModules();

        expect(await QuestionAssignment.countDocuments({})).toBe(2);
        const unreviewed = await Question.find({ review_tag: "missing_reviewer" });
        expect(unreviewed).toHaveLength(6);
        unreviewed.forEach((q) => {
            expect(q.validated).toBe(false);
            expect(q.validated_at).toBeInstanceOf(Date);
            expect(q.validated_by).toBeFalsy();
            expect(q.validation_comment).toMatch(/nebol dostatok recenzentov/);
        });
    });
});

describe("week 2: reviewing an assigned question", () => {
    let reviewer, assignment;

    beforeEach(async () => {
        for (const s of students) await writeQuestions(s);
        await setPhase(modul, 2);
        await syncDueModules();
        reviewer = students[0];
        assignment = await QuestionAssignment.findOne({ assignedTo: reviewer._id });
    });

    it("stores the verdict and awards one review point", async () => {
        await review(reviewer, assignment.question, { valid: true, comment: "Looks fine" }).expect(200);

        const saved = await QuestionAssignment.findById(assignment._id);
        expect(saved.validated).toBe(true);
        expect(saved.validation_result).toBe(true);

        const question = await Question.findById(assignment.question);
        expect(question.validated).toBe(true);
        expect(question.validation_comment).toBe("Looks fine");
        expect(String(question.validated_by)).toBe(String(reviewer._id));
        expect(question.validated_at).toBeInstanceOf(Date);

        const points = await Point.find({ student: reviewer._id, category: "question_validation" });
        expect(points).toHaveLength(1);
        expect(points[0].points).toBe(1);
    });

    it("lets the reviewer change the verdict during week 2 without a second point", async () => {
        await review(reviewer, assignment.question, { valid: true }).expect(200);
        await review(reviewer, assignment.question, { valid: false, comment: "Two answers are correct" }).expect(200);

        const question = await Question.findById(assignment.question);
        expect(question.validated).toBe(false);
        expect(question.validation_comment).toBe("Two answers are correct");
        expect(await Point.countDocuments({ student: reviewer._id, category: "question_validation" })).toBe(1);
    });

    it("requires a comment when the verdict is fault", async () => {
        await review(reviewer, assignment.question, { valid: false, comment: "  " }).expect(400);

        expect((await QuestionAssignment.findById(assignment._id)).validated).toBe(false);
    });

    it("refuses a review from a student who was not assigned the question", async () => {
        const stranger = students.find(
            (s) => String(s._id) !== String(reviewer._id)
        );
        const notTheirs = await QuestionAssignment.findOne({ assignedTo: { $ne: stranger._id } });
        await review(stranger, notTheirs.question, { valid: true }).expect(403);

        expect(await Point.countDocuments({ student: stranger._id, category: "question_validation" })).toBe(0);
    });

    it("refuses a review once week 2 is over", async () => {
        await setPhase(modul, 3);
        await review(reviewer, assignment.question, { valid: true }).expect(403);

        expect((await QuestionAssignment.findById(assignment._id)).validated).toBe(false);
    });

    it("does not tell the reviewer who wrote the question in the response", async () => {
        const res = await review(reviewer, assignment.question, { valid: true }).expect(200);

        expect(res.body.question.createdBy).toBeUndefined();
        expect(res.body.question.createdByName).toBeUndefined();
    });
});

describe("week 2: what a student can see of other questions", () => {
    beforeEach(async () => {
        for (const s of students) await writeQuestions(s);
        await setPhase(modul, 2);
        await syncDueModules();
    });

    it("lists only the student's own questions for a module", async () => {
        const res = await request(app).get(`/question/module/${modul._id}`).set(auth(students[0])).expect(200);

        expect(res.body).toHaveLength(2);
        res.body.forEach((q) => expect(String(q.createdBy)).toBe(String(students[0]._id)));
    });

    it("lists all questions of the module for a teacher", async () => {
        const res = await request(app).get(`/question/module/${modul._id}`).set(auth(teacher)).expect(200);

        expect(res.body).toHaveLength(8);
    });

    it("refuses to list the questions of another student", async () => {
        await request(app).get(`/question/user/${students[1]._id}`).set(auth(students[0])).expect(403);
    });

    it("keeps the module's dealt flag so the deal is never repeated", async () => {
        expect((await Module.findById(modul._id)).review_dealt_at).toBeInstanceOf(Date);
    });
});
