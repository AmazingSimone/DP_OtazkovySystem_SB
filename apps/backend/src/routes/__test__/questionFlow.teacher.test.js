const request = require("supertest");
const app = require("../../../app");
const Question = require("../../models/question");
const QuestionAssignment = require("../../models/questionAssignment");
const User = require("../../models/user");
const Point = require("../../models/point");
const { syncDueModules } = require("../../services/questionReview");
const {
    connect, clearDb, disconnect, writeQuestions,
    createTeacher, createSubject, createStudent, createModule, setPhase, auth,
} = require("../../test/flowHelpers");

let teacher, subject, modul, students;

beforeAll(connect);
afterAll(disconnect);

const post = (account, path, body = {}) => request(app).post(path).set(auth(account)).send(body);
const byId = (id) => students.find((s) => String(s._id) === String(id));
const total = async (student) =>
    (await Point.find({ student: student._id })).reduce((sum, p) => sum + p.points, 0);
const penalties = (student) => Point.find({ student: student._id, category: "question_penalty" });

/**
 * Runs a class of four through the three weeks.
 * Every reviewer gives `verdict(question)`; every author answers and publishes everything.
 */
const runModule = async ({ verdict = () => ({ valid: true }), publish = true } = {}) => {
    for (const s of students) await writeQuestions(s, modul);
    await setPhase(modul, 2);
    await syncDueModules();

    for (const a of await QuestionAssignment.find({}).populate("question")) {
        const v = verdict(a.question);
        if (v) await post(byId(a.assignedTo), `/question/${a.question._id}/validate`, v).expect(200);
    }

    await setPhase(modul, 3);
    await syncDueModules();

    if (publish) {
        for (const q of await Question.find({})) {
            const author = byId(q.createdBy);
            await post(author, `/question/${q._id}/respond`, { agreed: true }).expect(200);
            await post(author, `/question/${q._id}/publish`).expect(200);
        }
    }
};

const listPublished = (account, query = "") =>
    request(app).get(`/question/subject/${subject._id}/published${query}`).set(auth(account));

const judge = (account, questionId, body) => post(account, `/question/${questionId}/teacher-validate`, body);

beforeEach(async () => {
    await clearDb();
    teacher = await createTeacher();
    subject = await createSubject(teacher);
    modul = await createModule(subject, teacher, 1);
    students = [];
    for (let i = 0; i < 4; i++) students.push(await createStudent(subject));
});

describe("teacher review: the pool of published questions", () => {
    it("lists published questions with the real names of author and reviewer", async () => {
        await runModule();
        const res = await listPublished(teacher).expect(200);

        expect(res.body).toHaveLength(8);
        res.body.forEach((q) => {
            expect(q.createdBy.surname).toMatch(/^Dent/);
            expect(q.reviewer.surname).toMatch(/^Dent/);
            expect(String(q.reviewer._id)).not.toBe(String(q.createdBy._id));
            expect(q.modul.title).toBe(modul.title);
            expect(q.teacher_status).toBe("pending");
        });
    });

    it("leaves out questions that were not published", async () => {
        await runModule({ publish: false });
        const res = await listPublished(teacher).expect(200);

        expect(res.body).toEqual([]);
    });

    it("can be filtered to questions tagged missing reviewer", async () => {
        // Three of four students leave before week 2, so six questions have no reviewer.
        for (const s of students) await writeQuestions(s, modul);
        await User.updateMany({ _id: { $in: students.slice(1).map((s) => s._id) } }, { $set: { isActive: false } });
        await setPhase(modul, 2);
        await syncDueModules();
        for (const a of await QuestionAssignment.find({})) {
            await post(students[0], `/question/${a.question}/validate`, { valid: true }).expect(200);
        }
        await setPhase(modul, 3);
        await syncDueModules();
        for (const q of await Question.find({})) {
            await post(byId(q.createdBy), `/question/${q._id}/respond`, { agreed: true }).expect(200);
            await post(byId(q.createdBy), `/question/${q._id}/publish`).expect(200);
        }

        const all = await listPublished(teacher).expect(200);
        const missing = await listPublished(teacher, "?tag=missing_reviewer").expect(200);
        const reviewed = await listPublished(teacher, "?tag=none").expect(200);

        expect(all.body).toHaveLength(8);
        expect(missing.body).toHaveLength(6);
        missing.body.forEach((q) => {
            expect(q.review_tag).toBe("missing_reviewer");
            expect(q.reviewer).toBeNull();
        });
        expect(reviewed.body).toHaveLength(2);
    });

    it("can be filtered by the teacher's decision", async () => {
        await runModule();
        const [first] = (await listPublished(teacher).expect(200)).body;
        await judge(teacher, first._id, { status: "approved", comment: "ok" }).expect(200);

        expect((await listPublished(teacher, "?status=pending").expect(200)).body).toHaveLength(7);
        expect((await listPublished(teacher, "?status=approved").expect(200)).body).toHaveLength(1);
    });

    it("shows the original text next to the corrected one", async () => {
        for (const s of students) await writeQuestions(s, modul);
        await setPhase(modul, 2);
        await syncDueModules();
        const target = await Question.findOne({ createdBy: students[0]._id });
        const assignment = await QuestionAssignment.findOne({ question: target._id });
        await post(byId(assignment.assignedTo), `/question/${target._id}/validate`, { valid: false, comment: "wrong" }).expect(200);
        await setPhase(modul, 3);
        await syncDueModules();
        await request(app).put(`/question/${target._id}`).set(auth(students[0])).send({ text: "Corrected" }).expect(200);
        await post(students[0], `/question/${target._id}/respond`, { agreed: true }).expect(200);
        await post(students[0], `/question/${target._id}/publish`).expect(200);

        const [listed] = (await listPublished(teacher, "?edited=true").expect(200)).body;
        expect(listed.text).toBe("Corrected");
        expect(listed.original.text).toBe(target.text);
    });

    it("is not available to students", async () => {
        await runModule();
        await listPublished(students[0]).expect(403);
    });
});

describe("teacher review: approving and rejecting", () => {
    let question;
    beforeEach(async () => {
        await runModule();
        question = await Question.findOne({ createdBy: students[0]._id });
    });

    const inTestPool = async (id) => {
        const res = await request(app)
            .get(`/teacher-validated-questions/by-modules?moduleIds=${modul._id}`)
            .set(auth(teacher)).expect(200);
        return res.body.data.some((q) => q._id === String(id));
    };

    it("puts an approved question into the pool used for tests", async () => {
        expect(await inTestPool(question._id)).toBe(false);
        await judge(teacher, question._id, { status: "approved", comment: "Good question" }).expect(200);

        const after = await Question.findById(question._id);
        expect(after.teacher_status).toBe("approved");
        expect(after.validated_by_teacher).toBe(true);
        expect(await inTestPool(question._id)).toBe(true);
    });

    it("keeps a rejected question out of the pool and leaves the points alone", async () => {
        const before = await total(students[0]);
        await judge(teacher, question._id, { status: "rejected", comment: "Too easy" }).expect(200);

        expect((await Question.findById(question._id)).teacher_status).toBe("rejected");
        expect(await inTestPool(question._id)).toBe(false);
        expect(await total(students[0])).toBe(before);
    });

    it("still accepts the request shape of the existing teacher screen", async () => {
        await judge(teacher, question._id, { validated_by_teacher: true, validated_by_teacher_comment: "ok" }).expect(200);
        expect((await Question.findById(question._id)).teacher_status).toBe("approved");

        await judge(teacher, question._id, { validated_by_teacher: false, validated_by_teacher_comment: "no" }).expect(200);
        expect((await Question.findById(question._id)).teacher_status).toBe("rejected");
    });

    it("requires a comment", async () => {
        await judge(teacher, question._id, { status: "approved", comment: " " }).expect(400);
    });

    it("refuses a decision from a student", async () => {
        await judge(students[1], question._id, { status: "approved", comment: "self service" }).expect(403);

        expect((await Question.findById(question._id)).teacher_status).toBe("pending");
    });
});

describe("teacher review: rejecting as abuse", () => {
    it("takes from the author and from the approving reviewer the points they earned on the question", async () => {
        await runModule();
        const question = await Question.findOne({ createdBy: students[0]._id });
        const author = students[0];
        const reviewer = byId(question.validated_by);
        const authorBefore = await total(author);
        const reviewerBefore = await total(reviewer);

        await judge(teacher, question._id, { status: "abuse", comment: "This is a joke question" }).expect(200);

        expect((await Question.findById(question._id)).teacher_status).toBe("abuse");
        expect(await total(author)).toBe(authorBefore - 2); // creating + publishing
        expect(await total(reviewer)).toBe(reviewerBefore - 1); // reviewing

        const [authorPenalty] = await penalties(author);
        expect(authorPenalty.points).toBe(-2);
        expect(authorPenalty.reason).toMatch(/This is a joke question/);
        expect(String(authorPenalty.assigned_by)).toBe(String(teacher._id));
    });

    it("does not punish a reviewer who marked the question as fault", async () => {
        await runModule({ verdict: () => ({ valid: false, comment: "Not serious" }) });
        const question = await Question.findOne({ createdBy: students[0]._id });
        const reviewer = byId(question.validated_by);

        await judge(teacher, question._id, { status: "abuse", comment: "Joke" }).expect(200);

        expect(await penalties(reviewer)).toHaveLength(0);
        expect(await penalties(students[0])).toHaveLength(1);
    });

    it("punishes only the author when the review was automatic", async () => {
        await runModule({ verdict: () => null });
        const question = await Question.findOne({ createdBy: students[0]._id });
        expect(question.review_tag).toBe("reviewer_no_response");

        await judge(teacher, question._id, { status: "abuse", comment: "Joke" }).expect(200);

        expect(await Point.countDocuments({ category: "question_penalty" })).toBe(1);
        expect(await penalties(students[0])).toHaveLength(1);
    });

    it("adds an extra deduction for each punished student when the teacher sets one", async () => {
        await runModule();
        const question = await Question.findOne({ createdBy: students[0]._id });
        const reviewer = byId(question.validated_by);

        await judge(teacher, question._id, { status: "abuse", comment: "Joke", extraPenalty: 3 }).expect(200);

        expect((await penalties(students[0]))[0].points).toBe(-5);
        expect((await penalties(reviewer))[0].points).toBe(-4);
    });

    it("does not deduct twice when the same decision is sent again", async () => {
        await runModule();
        const question = await Question.findOne({ createdBy: students[0]._id });

        await judge(teacher, question._id, { status: "abuse", comment: "Joke" }).expect(200);
        await judge(teacher, question._id, { status: "abuse", comment: "Joke" }).expect(200);

        expect(await penalties(students[0])).toHaveLength(1);
    });

    it("gives the points back when the teacher changes the decision", async () => {
        await runModule();
        const question = await Question.findOne({ createdBy: students[0]._id });
        const before = await total(students[0]);

        await judge(teacher, question._id, { status: "abuse", comment: "Joke" }).expect(200);
        await judge(teacher, question._id, { status: "approved", comment: "I misread it" }).expect(200);

        expect(await Point.countDocuments({ category: "question_penalty" })).toBe(0);
        expect(await total(students[0])).toBe(before);
    });

    it("shows the deduction in the punished student's own point list", async () => {
        await runModule();
        const question = await Question.findOne({ createdBy: students[0]._id });
        await judge(teacher, question._id, { status: "abuse", comment: "Joke" }).expect(200);

        const res = await request(app).get(`/point/user/${students[0]._id}`).set(auth(students[0])).expect(200);
        const penalty = res.body.data.find((p) => p.category === "question_penalty");

        expect(penalty.points).toBe(-2);
        expect(penalty.reason).toMatch(/Joke/);
    });
});

describe("old batch point endpoints", () => {
    it("no longer hand out points outside the rules of the three weeks", async () => {
        // Reviewed and answered, but nothing published: nobody has earned a week 3 point.
        await runModule({ publish: false });
        for (const q of await Question.find({})) {
            await post(byId(q.createdBy), `/question/${q._id}/respond`, { agreed: true }).expect(200);
        }
        const before = await Point.countDocuments({});

        for (const week of ["week1", "week2", "week3"]) {
            await post(teacher, `/point/award/${week}`).expect(410);
        }

        expect(await Point.countDocuments({})).toBe(before);
        expect(await Point.countDocuments({ category: "question_reparation" })).toBe(0);
    });
});

describe("older listing with names", () => {
    it("is not available to students, who must not learn who wrote or reviewed a question", async () => {
        await runModule();
        const path = `/question/subject/${subject._id}/validated-with-agreement?filter=student`;

        await request(app).get(path).set(auth(students[0])).expect(403);
        await request(app).get(path).set(auth(teacher)).expect(200);
    });
});
