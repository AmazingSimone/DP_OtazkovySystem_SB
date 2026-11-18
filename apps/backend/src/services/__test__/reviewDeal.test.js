const { dealReviews } = require("../reviewDeal");

// Small seeded generator so every run of a test is reproducible.
const seeded = (seed) => {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
};

// n students, each wrote `perStudent` questions. Question ids look like "A1", "A2".
const classOf = (names, perStudent = 2) => {
    const questions = [];
    names.forEach((name) => {
        for (let i = 1; i <= perStudent; i++) questions.push({ id: `${name}${i}`, author: name });
    });
    return { questions, reviewers: [...names] };
};

const authorOf = (questions) => Object.fromEntries(questions.map((q) => [q.id, q.author]));
const countBy = (items, key) =>
    items.reduce((acc, it) => ({ ...acc, [it[key]]: (acc[it[key]] || 0) + 1 }), {});
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

describe("dealReviews in a balanced class", () => {
    const input = classOf(["A", "B", "C", "D"]);

    it("gives every reviewer exactly two questions", () => {
        SEEDS.forEach((seed) => {
            const { assignments } = dealReviews({ ...input, rng: seeded(seed) });
            expect(countBy(assignments, "reviewer")).toEqual({ A: 2, B: 2, C: 2, D: 2 });
        });
    });

    it("gives every question exactly one reviewer", () => {
        SEEDS.forEach((seed) => {
            const { assignments, unreviewed } = dealReviews({ ...input, rng: seeded(seed) });
            const perQuestion = countBy(assignments, "question");
            expect(Object.keys(perQuestion).sort()).toEqual(input.questions.map((q) => q.id).sort());
            expect(Object.values(perQuestion).every((n) => n === 1)).toBe(true);
            expect(unreviewed).toEqual([]);
        });
    });

    it("never hands a student their own question", () => {
        const author = authorOf(input.questions);
        SEEDS.forEach((seed) => {
            const { assignments } = dealReviews({ ...input, rng: seeded(seed) });
            assignments.forEach((a) => expect(author[a.question]).not.toBe(a.reviewer));
        });
    });

    it("awards no automatic points", () => {
        const { autoPoints } = dealReviews({ ...input, rng: seeded(1) });
        expect(autoPoints).toEqual({ A: 0, B: 0, C: 0, D: 0 });
    });

    it("is random: the same reviewer does not always get the same questions", () => {
        const seen = new Set();
        SEEDS.forEach((seed) => {
            const { assignments } = dealReviews({ ...input, rng: seeded(seed) });
            seen.add(assignments.filter((a) => a.reviewer === "A").map((a) => a.question).sort().join("+"));
        });
        expect(seen.size).toBeGreaterThan(3);
    });
});

describe("dealReviews soft rules", () => {
    it("sends the two questions of one author to two different reviewers", () => {
        const input = classOf(["A", "B", "C"]);
        const author = authorOf(input.questions);
        SEEDS.forEach((seed) => {
            const { assignments } = dealReviews({ ...input, rng: seeded(seed) });
            const reviewersByAuthor = {};
            assignments.forEach((a) => {
                (reviewersByAuthor[author[a.question]] ||= []).push(a.reviewer);
            });
            Object.values(reviewersByAuthor).forEach((revs) => expect(new Set(revs).size).toBe(revs.length));
        });
    });

    it("avoids direct swaps (A reviews B while B reviews A) when the class is big enough", () => {
        const input = classOf(["A", "B", "C", "D", "E"]);
        const author = authorOf(input.questions);
        SEEDS.forEach((seed) => {
            const { assignments } = dealReviews({ ...input, rng: seeded(seed) });
            const pairs = new Set(assignments.map((a) => `${a.reviewer}>${author[a.question]}`));
            assignments.forEach((a) => {
                expect(pairs.has(`${author[a.question]}>${a.reviewer}`)).toBe(false);
            });
        });
    });
});

describe("dealReviews when there are fewer questions than review slots", () => {
    it("gives everyone one question before anyone gets a second", () => {
        // Only A wrote questions. B and C must get one each; A cannot review their own.
        const input = { questions: [{ id: "A1", author: "A" }, { id: "A2", author: "A" }], reviewers: ["A", "B", "C"] };
        SEEDS.forEach((seed) => {
            const { assignments, autoPoints, unreviewed } = dealReviews({ ...input, rng: seeded(seed) });
            expect(countBy(assignments, "reviewer")).toEqual({ B: 1, C: 1 });
            expect(autoPoints).toEqual({ A: 2, B: 1, C: 1 });
            expect(unreviewed).toEqual([]);
        });
    });

    it("gives each student one question when everyone wrote only one", () => {
        const input = classOf(["A", "B", "C"], 1);
        const author = authorOf(input.questions);
        SEEDS.forEach((seed) => {
            const { assignments, autoPoints } = dealReviews({ ...input, rng: seeded(seed) });
            expect(countBy(assignments, "reviewer")).toEqual({ A: 1, B: 1, C: 1 });
            assignments.forEach((a) => expect(author[a.question]).not.toBe(a.reviewer));
            expect(autoPoints).toEqual({ A: 1, B: 1, C: 1 });
        });
    });

    it("gives two automatic points to a student who is the only author", () => {
        const input = { questions: [{ id: "A1", author: "A" }, { id: "A2", author: "A" }], reviewers: ["A"] };
        const result = dealReviews({ ...input, rng: seeded(1) });
        expect(result.assignments).toEqual([]);
        expect(result.autoPoints).toEqual({ A: 2 });
        expect(result.unreviewed.sort()).toEqual(["A1", "A2"]);
    });

    it("gives two automatic points to everyone when nobody wrote a question", () => {
        const result = dealReviews({ questions: [], reviewers: ["A", "B"], rng: seeded(1) });
        expect(result.assignments).toEqual([]);
        expect(result.autoPoints).toEqual({ A: 2, B: 2 });
    });
});

describe("dealReviews when there are more questions than review slots", () => {
    it("reports the questions that got no reviewer and never reuses a question", () => {
        // X and Y wrote questions but are no longer in the subject, so only A reviews.
        const input = {
            questions: [
                { id: "X1", author: "X" }, { id: "X2", author: "X" },
                { id: "Y1", author: "Y" }, { id: "Y2", author: "Y" },
            ],
            reviewers: ["A"],
        };
        SEEDS.forEach((seed) => {
            const { assignments, unreviewed, autoPoints } = dealReviews({ ...input, rng: seeded(seed) });
            expect(assignments).toHaveLength(2);
            expect(unreviewed).toHaveLength(2);
            const all = [...assignments.map((a) => a.question), ...unreviewed].sort();
            expect(all).toEqual(["X1", "X2", "Y1", "Y2"]);
            expect(autoPoints).toEqual({ A: 0 });
        });
    });
});
