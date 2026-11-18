/**
 * Phase (week) calculation for a module's question flow.
 *
 * Phase 1 = students create questions, 2 = students review, 3 = authors respond and publish.
 * A module either has teacher-set boundaries (week2_start / week3_start) or is cut into
 * 7-day blocks from date_start (week_number says how many, at most 3).
 *
 * Every phase is { number, start, end } with `end` exclusive. date_end is stored as the last
 * included millisecond of the module, so the last teacher-set phase ends at date_end + 1 ms.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PHASES = 3;

const PHASE_NOT_STARTED = 0;
const PHASE_FINISHED = 4;

const toDate = (value) => (value ? new Date(value) : null);

const getPhases = (modul) => {
    if (!modul) return [];
    const start = toDate(modul.date_start);
    const end = toDate(modul.date_end);
    if (!start || !end) return [];

    const week2 = toDate(modul.week2_start);
    const week3 = toDate(modul.week3_start);

    if (week2 || week3) {
        const moduleEnd = new Date(end.getTime() + 1);
        const phases = [{ number: 1, start, end: week2 || week3 }];
        if (week2) phases.push({ number: 2, start: week2, end: week3 || moduleEnd });
        if (week3) phases.push({ number: 3, start: week3, end: moduleEnd });
        return phases;
    }

    const count = Math.min(Math.max(Number(modul.week_number) || MAX_PHASES, 1), MAX_PHASES);
    return Array.from({ length: count }, (_, i) => ({
        number: i + 1,
        start: new Date(start.getTime() + i * WEEK_MS),
        end: new Date(start.getTime() + (i + 1) * WEEK_MS),
    }));
};

/**
 * @returns {number} 0 before the module starts, 1-3 while a phase is running, 4 once it is over
 */
const getCurrentPhase = (modul, now = new Date()) => {
    const phases = getPhases(modul);
    if (phases.length === 0) return PHASE_NOT_STARTED;

    const t = new Date(now).getTime();
    if (t < phases[0].start.getTime()) return PHASE_NOT_STARTED;

    const current = phases.find((p) => t >= p.start.getTime() && t < p.end.getTime());
    return current ? current.number : PHASE_FINISHED;
};

const getPhaseStart = (modul, number) => {
    const phase = getPhases(modul).find((p) => p.number === number);
    return phase ? phase.start : null;
};

module.exports = { getPhases, getCurrentPhase, getPhaseStart, PHASE_NOT_STARTED, PHASE_FINISHED };
