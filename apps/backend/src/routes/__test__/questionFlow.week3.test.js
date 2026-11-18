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
const reviewerOf = async (questionId) => {
    const assignment = await QuestionAssignment.findOne({ question: questionId });
    return students.find((s) => String(s._id) === String(assignment.assignedTo));
};

/** Week 1 for the whole class, then the deal at the start of week 2. */
const reachWeek2 = async () => {
    for (const s of students) await writeQuestions(s, modul);
    await setPhase(modul, 2);
    await syncDueModules();
};

/** Has the assigned reviewer review the question, then moves the module into week 3. */
const reviewThenWeek3 = async (questionId, verdict) => {
    const reviewer = await reviewerOf(questionId);
    await post(reviewer, `/question/${questionId}/validate`, verdict).expect(200);
    await setPhase(modul, 3);
    await syncDueModules();
    return reviewer;
};

beforeEach(async () => {
    await clearDb();
    teacher = await createTeacher();
    subject = await createSubject(teacher);
    modul = await createModule(subject, teacher, 1);
    students = [];
    for (let i = 0; i < 4; i++) students.push(await createStudent(subject));
});

describe("start of week 3: questions nobody reviewed", () => {
    beforeEach(reachWeek2);

    it("does nothing while week 2 is still running", async () => {
        await syncDueModules();

        expect(await Question.countDocuments({ validated_at: { $ne: null } })).toBe(0);
    });

    it("gives an assigned but unreviewed question an automatic fault review tagged reviewer_no_response", async () => {
        await setPhase(modul, 3);
        await syncDueModules();

        const questions = await Question.find({});
        expect(questions).toHaveLength(8);
        questions.forEach((q) => {
            expect(q.review_tag).toBe("reviewer_no_response");
            expect(q.validated).toBe(false);
            expect(q.validated_at).toBeInstanceOf(Date);
            expect(q.validation_comment).toMatch(/recenzent ju neohodnotil/);
        });
    });

    it("keeps a review that a student wrote", async () => {
        const question = await Question.findOne({ createdBy: students[0]._id });
        await reviewThenWeek3(question._id, { valid: true, comment: "Good one" });

        const after = await Question.findById(question._id);
        expect(after.review_tag).toBeNull();
        expect(after.validated).toBe(true);
        expect(after.validation_comment).toBe("Good one");
    });

    it("closes the reviews on the author's first request of week 3 even before the scheduled job", async () => {
        await setPhase(modul, 3);
        const res = await request(app).get(`/question/module/${modul._id}`).set(auth(students[0])).expect(200);

        expect(res.body).toHaveLength(2);
        res.body.forEach((q) => expect(q.review_tag).toBe("reviewer_no_response"));
    });
});

describe("week 3: what the author sees of the review", () => {
    let author, question;

    beforeEach(async () => {
        await reachWeek2();
        author = students[0];
        question = await Question.findOne({ createdBy: author._id });
        const reviewer = await reviewerOf(question._id);
        await post(reviewer, `/question/${question._id}/validate`, { valid: false, comment: "Answer b is also right" }).expect(200);
    });

    const ownQuestion = async () => {
        const res = await request(app).get(`/question/module/${modul._id}`).set(auth(author)).expect(200);
        return res.body.find((q) => q._id === String(question._id));
    };

    it("hides the review from the author during week 2", async () => {
        const seen = await ownQuestion();

        expect(seen.validation_comment).toBeUndefined();
        expect(seen.validated_at).toBeUndefined();
        expect(seen.has_review).toBe(false);
    });

    it("shows the review to the author in week 3", async () => {
        await setPhase(modul, 3);
        const seen = await ownQuestion();

        expect(seen.validated).toBe(false);
        expect(seen.validation_comment).toBe("Answer b is also right");
        expect(seen.has_review).toBe(true);
    });

    it("never tells the author who the reviewer was", async () => {
        await setPhase(modul, 3);
        const seen = await ownQuestion();

        expect(seen.validated_by).toBeUndefined();
    });
});

describe("week 3: answering the review and publishing", () => {
    let author, question;

    beforeEach(async () => {
        await reachWeek2();
        author = students[0];
        question = await Question.findOne({ createdBy: author._id });
        await reviewThenWeek3(question._id, { valid: true, comment: "Fine" });
    });

    const pointsOf = (student, category) => Point.countDocuments({ student: student._id, category });

    it("stores the author's answer to the review without awarding a point", async () => {
        await post(author, `/question/${question._id}/respond`, { agreed: true, comment: "Thanks" }).expect(200);

        const after = await Question.findById(question._id);
        expect(after.user_agreement.agreed).toBe(true);
        expect(after.user_agreement.comment).toBe("Thanks");
        expect(await pointsOf(author, "question_reparation")).toBe(0);
    });

    it("refuses an answer from a student who is not the author", async () => {
        await post(students[1], `/question/${question._id}/respond`, { agreed: true }).expect(403);
    });

    it("refuses an answer outside week 3", async () => {
        await setPhase(modul, 4);
        await post(author, `/question/${question._id}/respond`, { agreed: true }).expect(403);
    });

    it("publishes the question after the author answered the review and awards one point", async () => {
        await post(author, `/question/${question._id}/respond`, { agreed: true }).expect(200);
        const res = await post(author, `/question/${question._id}/publish`).expect(200);

        expect(res.body.question.published).toBe(true);
        const after = await Question.findById(question._id);
        expect(after.published).toBe(true);
        expect(after.published_at).toBeInstanceOf(Date);
        expect(await pointsOf(author, "question_reparation")).toBe(1);
    });

    it("awards the publishing point only once", async () => {
        await post(author, `/question/${question._id}/respond`, { agreed: true }).expect(200);
        await post(author, `/question/${question._id}/publish`).expect(200);
        await post(author, `/question/${question._id}/publish`).expect(409);

        expect(await pointsOf(author, "question_reparation")).toBe(1);
    });

    it("refuses to publish before the author answered the review", async () => {
        await post(author, `/question/${question._id}/publish`).expect(400);

        expect((await Question.findById(question._id)).published).toBe(false);
    });

    it("refuses to publish once week 3 is over", async () => {
        await post(author, `/question/${question._id}/respond`, { agreed: true }).expect(200);
        await setPhase(modul, 4);
        await post(author, `/question/${question._id}/publish`).expect(403);

        expect(await pointsOf(author, "question_reparation")).toBe(0);
    });

    it("refuses publishing by a student who is not the author", async () => {
        await post(author, `/question/${question._id}/respond`, { agreed: true }).expect(200);
        await post(students[1], `/question/${question._id}/publish`).expect(403);
    });

    it("refuses to change the answer after publishing", async () => {
        await post(author, `/question/${question._id}/respond`, { agreed: true }).expect(200);
        await post(author, `/question/${question._id}/publish`).expect(200);
        await post(author, `/question/${question._id}/respond`, { agreed: false }).expect(403);
    });

    it("refuses to edit a question that was reviewed as valid", async () => {
        await request(app).put(`/question/${question._id}`).set(auth(author)).send({ text: "Sneaky change" }).expect(403);

        expect((await Question.findById(question._id)).text).not.toBe("Sneaky change");
    });
});

describe("week 3: correcting a question reviewed as fault", () => {
    let author, question;

    beforeEach(async () => {
        await reachWeek2();
        author = students[0];
        question = await Question.findOne({ createdBy: author._id });
        await reviewThenWeek3(question._id, { valid: false, comment: "Typo in answer c" });
    });

    const edit = (body) => request(app).put(`/question/${question._id}`).set(auth(author)).send(body);

    it("lets the author correct it and keeps the original for the teacher", async () => {
        await edit({ text: "Corrected text" }).expect(200);

        const after = await Question.findById(question._id);
        expect(after.text).toBe("Corrected text");
        expect(after.original.text).toBe(question.text);
        expect(after.original.correct).toBe(question.correct);
    });

    it("keeps the very first version as original when the author edits twice", async () => {
        await edit({ text: "First correction" }).expect(200);
        await edit({ text: "Second correction" }).expect(200);

        const after = await Question.findById(question._id);
        expect(after.text).toBe("Second correction");
        expect(after.original.text).toBe(question.text);
    });

    it("refuses further edits once the question is published", async () => {
        await post(author, `/question/${question._id}/respond`, { agreed: true }).expect(200);
        await post(author, `/question/${question._id}/publish`).expect(200);
        await edit({ text: "After publishing" }).expect(403);

        expect((await Question.findById(question._id)).text).not.toBe("After publishing");
    });

    it("lets the author publish it unchanged even when disagreeing with the review", async () => {
        await post(author, `/question/${question._id}/respond`, { agreed: false, comment: "c is fine" }).expect(200);
        await post(author, `/question/${question._id}/publish`).expect(200);

        const after = await Question.findById(question._id);
        expect(after.published).toBe(true);
        expect(after.original).toBeNull();
    });
});

describe("week 3: a question that never had a reviewer", () => {
    it("can still be corrected and published by its author for the point", async () => {
        // All four wrote questions, then three left, so six questions have no reviewer.
        for (const s of students) await writeQuestions(s, modul);
        await User.updateMany({ _id: { $in: students.slice(1).map((s) => s._id) } }, { $set: { isActive: false } });
        await setPhase(modul, 2);
        await syncDueModules();
        await setPhase(modul, 3);
        await syncDueModules();

        const author = students[0];
        const question = await Question.findOne({ createdBy: author._id });
        expect(question.review_tag).toBe("missing_reviewer");

        await request(app).put(`/question/${question._id}`).set(auth(author)).send({ text: "Checked again" }).expect(200);
        await post(author, `/question/${question._id}/respond`, { agreed: true }).expect(200);
        await post(author, `/question/${question._id}/publish`).expect(200);

        expect(await Point.countDocuments({ student: author._id, category: "question_reparation" })).toBe(1);
        expect((await Question.findById(question._id)).review_tag).toBe("missing_reviewer");
    });
});

describe("the whole module for one student", () => {
    it("earns six points: two for creating, two for reviewing, two for publishing", async () => {
        await reachWeek2();
        const me = students[0];

        const toReview = await QuestionAssignment.find({ assignedTo: me._id });
        for (const a of toReview) {
            await post(me, `/question/${a.question}/validate`, { valid: true }).expect(200);
        }
        await setPhase(modul, 3);
        await syncDueModules();

        const mine = await Question.find({ createdBy: me._id });
        for (const q of mine) {
            await post(me, `/question/${q._id}/respond`, { agreed: true }).expect(200);
            await post(me, `/question/${q._id}/publish`).expect(200);
        }

        const points = await Point.find({ student: me._id });
        const total = points.reduce((sum, p) => sum + p.points, 0);
        expect(total).toBe(6);
        expect(points.filter((p) => p.category === "question_creation")).toHaveLength(2);
        expect(points.filter((p) => p.category === "question_validation")).toHaveLength(2);
        expect(points.filter((p) => p.category === "question_reparation")).toHaveLength(2);
    });
});
