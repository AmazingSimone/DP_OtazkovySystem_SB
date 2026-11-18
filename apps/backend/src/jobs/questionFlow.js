const cron = require('node-cron');
const { syncDueModules } = require('../services/questionReview');

let running = false;

/**
 * Moves modules through the question flow when their week changes:
 * deals the reviews at the start of week 2 and closes them at the start of week 3.
 * The work itself is idempotent, so a missed or repeated run does no harm.
 */
const checkModules = async () => {
    if (running) return;
    running = true;
    try {
        await syncDueModules();
    } catch (err) {
        console.error('[Question flow] Scheduled check failed:', err.message);
    } finally {
        running = false;
    }
};

/**
 * Checks every minute, and once right away so a restart during a week change loses nothing.
 * Call after the database connection is open.
 */
const scheduleQuestionFlow = () => {
    cron.schedule('* * * * *', checkModules);
    checkModules();
    console.log('[Question flow] Scheduled to check modules every minute');
};

module.exports = { scheduleQuestionFlow, checkModules };
