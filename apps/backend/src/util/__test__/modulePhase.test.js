const { getPhases, getCurrentPhase, getPhaseStart } = require("../modulePhase");

const d = (s) => new Date(s);

const customModule = {
    date_start: d("2026-01-01T00:00:00Z"),
    week2_start: d("2026-01-08T00:00:00Z"),
    week3_start: d("2026-01-15T00:00:00Z"),
    date_end: d("2026-01-21T23:59:59.999Z"),
    week_number: 3,
};

const defaultModule = {
    date_start: d("2026-01-01T00:00:00Z"),
    week2_start: null,
    week3_start: null,
    date_end: d("2026-01-21T23:59:59.999Z"),
    week_number: 3,
};

describe("getCurrentPhase with teacher-set boundaries", () => {
    it("is 0 before the module starts", () => {
        expect(getCurrentPhase(customModule, d("2025-12-31T23:59:59Z"))).toBe(0);
    });
    it("is 1 between module start and week 2 start", () => {
        expect(getCurrentPhase(customModule, d("2026-01-03T12:00:00Z"))).toBe(1);
    });
    it("switches to 2 exactly at week2_start", () => {
        expect(getCurrentPhase(customModule, d("2026-01-07T23:59:59.999Z"))).toBe(1);
        expect(getCurrentPhase(customModule, d("2026-01-08T00:00:00Z"))).toBe(2);
    });
    it("switches to 3 exactly at week3_start", () => {
        expect(getCurrentPhase(customModule, d("2026-01-14T23:59:59.999Z"))).toBe(2);
        expect(getCurrentPhase(customModule, d("2026-01-15T00:00:00Z"))).toBe(3);
    });
    it("stays 3 through the last millisecond of date_end and is 4 afterwards", () => {
        expect(getCurrentPhase(customModule, d("2026-01-21T23:59:59.999Z"))).toBe(3);
        expect(getCurrentPhase(customModule, d("2026-01-22T00:00:00Z"))).toBe(4);
    });
});

describe("getCurrentPhase with default 7-day weeks", () => {
    it("uses 7-day blocks from date_start", () => {
        expect(getCurrentPhase(defaultModule, d("2026-01-07T23:59:59Z"))).toBe(1);
        expect(getCurrentPhase(defaultModule, d("2026-01-08T00:00:00Z"))).toBe(2);
        expect(getCurrentPhase(defaultModule, d("2026-01-15T00:00:00Z"))).toBe(3);
        expect(getCurrentPhase(defaultModule, d("2026-01-22T00:00:00Z"))).toBe(4);
    });
    it("has only one phase when week_number is 1", () => {
        const oneWeek = { ...defaultModule, week_number: 1 };
        expect(getPhases(oneWeek).map((p) => p.number)).toEqual([1]);
        expect(getCurrentPhase(oneWeek, d("2026-01-08T00:00:00Z"))).toBe(4);
    });
});

describe("getPhases", () => {
    it("returns three contiguous phases for teacher-set boundaries", () => {
        const phases = getPhases(customModule);
        expect(phases.map((p) => p.number)).toEqual([1, 2, 3]);
        expect(phases[0].start).toEqual(customModule.date_start);
        expect(phases[0].end).toEqual(customModule.week2_start);
        expect(phases[1].start).toEqual(customModule.week2_start);
        expect(phases[1].end).toEqual(customModule.week3_start);
        expect(phases[2].start).toEqual(customModule.week3_start);
    });
    it("lets phase 2 run to the module end when only week2_start is set", () => {
        const m = { ...customModule, week3_start: null };
        expect(getPhases(m).map((p) => p.number)).toEqual([1, 2]);
        expect(getCurrentPhase(m, d("2026-01-20T00:00:00Z"))).toBe(2);
    });
});

describe("getPhaseStart", () => {
    it("returns the start of the requested phase or null when the module has no such phase", () => {
        expect(getPhaseStart(customModule, 2)).toEqual(customModule.week2_start);
        expect(getPhaseStart(defaultModule, 3)).toEqual(d("2026-01-15T00:00:00Z"));
        expect(getPhaseStart({ ...defaultModule, week_number: 1 }, 2)).toBeNull();
    });
});
