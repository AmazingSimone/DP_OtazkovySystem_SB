const request = require("supertest");
const app = require("../../../app");
const Question = require("../../models/question");
const Point = require("../../models/point");
const {
    connect, clearDb, disconnect,
    createTeacher, createSubject, createStudent, createModule, setPhase, auth, questionBody,
} = require("../../test/flowHelpers");

let teacher, subject, modul, student, other;

beforeAll(connect);
afterAll(disconnect);

beforeEach(async () => {
    await clearDb();
    teacher = await createTeacher();
    subject = await createSubject(teacher);
    modul = await createModule(subject, teacher, 1);
    student = await createStudent(subject);
    other = await createStudent(subject);
});

const create = (account, overrides) =>
    request(app).post("/question").set(auth(account)).send(questionBody(modul, overrides));

describe("week 1: creating questions", () => {
    it("lets a student create a question during week 1 and awards one creation point", async () => {
        const res = await create(student).expect(201);

        expect(res.body.text).toMatch(/2 \+ 2/);
        const points = await Point.find({ student: student._id });
        expect(points).toHaveLength(1);
        expect(points[0].category).toBe("question_creation");
        expect(points[0].points).toBe(1);
    });

    it("records the logged-in student as author even if another id is sent", async () => {
        const res = await create(student, { createdBy: String(other._id) }).expect(201);

        expect(String(res.body.createdBy)).toBe(String(student._id));
        expect(await Point.countDocuments({ student: other._id })).toBe(0);
    });

    it("refuses a third question in the same module", async () => {
        await create(student).expect(201);
        await create(student).expect(201);
        await create(student).expect(400);

        expect(await Question.countDocuments({ createdBy: student._id })).toBe(2);
        expect(await Point.countDocuments({ student: student._id })).toBe(2);
    });

    it("refuses a question whose four answers are not all different", async () => {
        await create(student, { options: { a: "4", b: "4", c: "3", d: "5" }, correct: "a" }).expect(400);

        expect(await Question.countDocuments({})).toBe(0);
    });

    it("refuses a new question once week 1 is over", async () => {
        await setPhase(modul, 2);
        await create(student).expect(403);

        expect(await Question.countDocuments({})).toBe(0);
        expect(await Point.countDocuments({})).toBe(0);
    });

    it("refuses a new question before the module has started", async () => {
        await setPhase(modul, 0);
        await create(student).expect(403);
    });

    it("refuses a student who is not enrolled in the subject", async () => {
        const outsider = await createStudent();
        await create(outsider).expect(403);
    });

    it("lets a teacher create a question at any time, without awarding a point", async () => {
        await setPhase(modul, 3);
        const res = await create(teacher, { createdBy: String(teacher._id) }).expect(201);

        expect(String(res.body.createdBy)).toBe(String(teacher._id));
        expect(await Point.countDocuments({})).toBe(0);
    });
});

describe("week 1: editing and deleting own questions", () => {
    let question;
    beforeEach(async () => {
        question = (await create(student).expect(201)).body;
    });

    it("lets the author edit the question during week 1", async () => {
        await request(app).put(`/question/${question._id}`).set(auth(student))
            .send({ text: "Changed text" }).expect(200);

        expect((await Question.findById(question._id)).text).toBe("Changed text");
    });

    it("refuses an edit by another student", async () => {
        await request(app).put(`/question/${question._id}`).set(auth(other))
            .send({ text: "Hijacked" }).expect(403);

        expect((await Question.findById(question._id)).text).not.toBe("Hijacked");
    });

    it("refuses an edit by the author during week 2", async () => {
        await setPhase(modul, 2);
        await request(app).put(`/question/${question._id}`).set(auth(student))
            .send({ text: "Too late" }).expect(403);

        expect((await Question.findById(question._id)).text).not.toBe("Too late");
    });

    it("removes the creation point when the author deletes the question during week 1", async () => {
        await request(app).delete(`/question/${question._id}`).set(auth(student)).expect(200);

        expect(await Question.countDocuments({})).toBe(0);
        expect(await Point.countDocuments({ student: student._id })).toBe(0);
    });

    it("refuses deletion by the author after week 1", async () => {
        await setPhase(modul, 2);
        await request(app).delete(`/question/${question._id}`).set(auth(student)).expect(403);

        expect(await Question.countDocuments({})).toBe(1);
    });

    it("refuses deletion by another student", async () => {
        await request(app).delete(`/question/${question._id}`).set(auth(other)).expect(403);

        expect(await Question.countDocuments({})).toBe(1);
    });
});
