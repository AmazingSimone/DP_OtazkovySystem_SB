/**
 * Week 2 review deal: decides which student reviews which question.
 *
 * Pure function, no database access, so the rules can be tested in isolation.
 *
 * Hard rules
 *  - a question gets at most one reviewer and is never reused
 *  - nobody reviews their own question
 *  - every reviewer gets one question before anyone gets a second
 * Soft rules (kept whenever the class allows it)
 *  - the questions of one author go to different reviewers
 *  - no direct swaps (A reviews a question of B while B reviews a question of A)
 */

const TRIALS = 25;
const MAX_IMPROVEMENT_PASSES = 200;

const shuffle = (items, rng) => {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

// One reviewer holding both questions of an author is worse than any number of swaps,
// because in a small class swaps cannot be avoided but shared reviewers can.
const SAME_AUTHOR_WEIGHT = 1000;
const SWAP_WEIGHT = 1;

/** Weighted soft-rule violations in a list of { reviewer, question } pairs. */
const softPenalty = (assignments, authorOf) => {
    let penalty = 0;
    const authorsByReviewer = new Map();
    const reviews = new Set();

    assignments.forEach(({ reviewer, question }) => {
        const author = authorOf.get(question);
        const seen = authorsByReviewer.get(reviewer) || [];
        if (seen.includes(author)) penalty += SAME_AUTHOR_WEIGHT;
        authorsByReviewer.set(reviewer, [...seen, author]);
        reviews.add(`${reviewer}>${author}`);
    });

    assignments.forEach(({ reviewer, question }) => {
        if (reviews.has(`${authorOf.get(question)}>${reviewer}`)) penalty += SWAP_WEIGHT;
    });

    return penalty;
};

/** One randomised attempt: a maximum matching per round, preferring soft-rule-friendly picks. */
const dealOnce = ({ questions, reviewers, perReviewer, rng, authorOf }) => {
    const assignments = [];
    const taken = new Set();

    for (let round = 0; round < perReviewer; round++) {
        const free = shuffle(
            questions.filter((q) => !taken.has(q.id)).map((q) => q.id),
            rng
        );
        const reviewerOfQuestion = new Map();

        const candidatesFor = (reviewer) =>
            free
                .filter((question) => authorOf.get(question) !== reviewer)
                .map((question) => ({
                    question,
                    cost: softPenalty([...assignments, { reviewer, question }], authorOf),
                }))
                .sort((x, y) => x.cost - y.cost)
                .map((c) => c.question);

        const candidateCache = new Map();
        const tryAssign = (reviewer, visited) => {
            if (!candidateCache.has(reviewer)) candidateCache.set(reviewer, candidatesFor(reviewer));
            for (const question of candidateCache.get(reviewer)) {
                if (visited.has(question)) continue;
                visited.add(question);
                const holder = reviewerOfQuestion.get(question);
                if (holder === undefined || tryAssign(holder, visited)) {
                    reviewerOfQuestion.set(question, reviewer);
                    return true;
                }
            }
            return false;
        };

        shuffle(reviewers, rng).forEach((reviewer) => tryAssign(reviewer, new Set()));

        reviewerOfQuestion.forEach((reviewer, question) => {
            assignments.push({ reviewer, question });
            taken.add(question);
        });
    }

    return assignments;
};

/** Swap questions between two reviewers while that lowers the soft penalty. */
const improve = (assignments, authorOf) => {
    let current = assignments;
    let penalty = softPenalty(current, authorOf);

    for (let pass = 0; pass < MAX_IMPROVEMENT_PASSES && penalty > 0; pass++) {
        let improved = false;

        for (let i = 0; i < current.length && !improved; i++) {
            for (let j = i + 1; j < current.length && !improved; j++) {
                const a = current[i];
                const b = current[j];
                if (a.reviewer === b.reviewer) continue;
                if (authorOf.get(b.question) === a.reviewer || authorOf.get(a.question) === b.reviewer) continue;

                const candidate = [...current];
                candidate[i] = { reviewer: a.reviewer, question: b.question };
                candidate[j] = { reviewer: b.reviewer, question: a.question };
                const candidatePenalty = softPenalty(candidate, authorOf);

                if (candidatePenalty < penalty) {
                    current = candidate;
                    penalty = candidatePenalty;
                    improved = true;
                }
            }
        }

        if (!improved) break;
    }

    return { assignments: current, penalty };
};

/**
 * @param {{ questions: {id: string, author: string}[], reviewers: string[], perReviewer?: number, rng?: () => number }} input
 * @returns {{ assignments: {reviewer: string, question: string}[], autoPoints: Record<string, number>, unreviewed: string[] }}
 *   autoPoints = review slots a reviewer could not be given a question for
 *   unreviewed = questions that ended up without a reviewer
 */
const dealReviews = ({ questions, reviewers, perReviewer = 2, rng = Math.random }) => {
    const authorOf = new Map(questions.map((q) => [q.id, q.author]));
    const mostPossible = Math.min(questions.length, reviewers.length * perReviewer);

    let best = { assignments: [], penalty: 0 };
    for (let trial = 0; trial < TRIALS; trial++) {
        const attempt = improve(dealOnce({ questions, reviewers, perReviewer, rng, authorOf }), authorOf);
        const better =
            trial === 0 ||
            attempt.assignments.length > best.assignments.length ||
            (attempt.assignments.length === best.assignments.length && attempt.penalty < best.penalty);
        if (better) best = attempt;
        if (best.penalty === 0 && best.assignments.length === mostPossible) break;
    }

    const assignedCount = new Map(reviewers.map((r) => [r, 0]));
    const reviewed = new Set();
    best.assignments.forEach(({ reviewer, question }) => {
        assignedCount.set(reviewer, assignedCount.get(reviewer) + 1);
        reviewed.add(question);
    });

    const order = new Map(reviewers.map((r, i) => [r, i]));
    const assignments = [...best.assignments].sort((x, y) => order.get(x.reviewer) - order.get(y.reviewer));

    return {
        assignments,
        autoPoints: Object.fromEntries(reviewers.map((r) => [r, perReviewer - assignedCount.get(r)])),
        unreviewed: questions.filter((q) => !reviewed.has(q.id)).map((q) => q.id),
    };
};

module.exports = { dealReviews };
