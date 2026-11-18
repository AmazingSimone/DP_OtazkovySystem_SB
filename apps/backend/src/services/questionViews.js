/**
 * What each role may see of a question.
 *
 * Students review and are reviewed anonymously, so identities are removed on the server,
 * not hidden by the screens.
 */

/** A reviewer sees the question and its marked answer, never the author. */
const reviewerView = (question) => {
    const q = typeof question.toObject === "function" ? question.toObject() : question;
    return {
        _id: q._id,
        text: q.text,
        options: q.options,
        correct: q.correct,
        modul: q.modul,
    };
};

/**
 * An author sees their own question. The review appears only from week 3 on, and the
 * reviewer stays anonymous at all times.
 */
const authorView = (question, phase) => {
    const q = typeof question.toObject === "function" ? question.toObject() : { ...question };
    delete q.validated_by;

    if (phase < 3) {
        delete q.validated;
        delete q.validated_at;
        delete q.validation_comment;
        delete q.review_tag;
    }
    q.has_review = phase >= 3 && Boolean(q.validated_at);

    return q;
};

module.exports = { reviewerView, authorView };
