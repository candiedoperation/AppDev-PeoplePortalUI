/**
 * Season helpers.
 *
 * The current season is derived from the calendar rather than stored as a
 * setting: the date already tells us, and a stored copy can only drift.
 * Fall runs August through December, Spring January through July.
 */

export type SeasonType = "FALL" | "SPRING";

export interface Season {
    type: SeasonType;
    year: number;
}

/** A team as far as season logic is concerned. */
export interface SeasonedTeam {
    seasonType?: string;
    seasonYear?: number;
    /** ISO timestamp set when explicitly archived; absent means not archived. */
    archivedAt?: string;
}

export type TeamLifecycle = "active" | "expired" | "archived";

/** The season containing `now`, defaulting to the present moment. */
export function currentSeason(now: Date = new Date()): Season {
    return { type: now.getMonth() >= 7 ? "FALL" : "SPRING", year: now.getFullYear() };
}

/**
 * Whether a team's season has already passed.
 *
 * ROLLING teams (service teams) run continuously and never expire, and a team
 * missing either half of its season cannot be judged, so both are treated as
 * not expired rather than guessed at.
 */
export function isExpired(team: SeasonedTeam, now: Date = new Date()): boolean {
    const season = (team.seasonType ?? "").toUpperCase();
    if (season !== "FALL" && season !== "SPRING") return false;
    if (!team.seasonYear) return false;

    const current = currentSeason(now);
    if (team.seasonYear !== current.year) return team.seasonYear < current.year;

    /* Same year: Spring is behind us once Fall begins. */
    return season === "SPRING" && current.type === "FALL";
}

/**
 * Which of the three Archive Teams buckets a team belongs to. Explicit
 * archival wins over season, so archiving an old team moves it out of Expired.
 */
export function teamLifecycle(team: SeasonedTeam, now: Date = new Date()): TeamLifecycle {
    if (team.archivedAt) return "archived";
    return isExpired(team, now) ? "expired" : "active";
}

/** Splits teams into the three buckets, preserving input order within each. */
export function partitionByLifecycle<T extends SeasonedTeam>(
    teams: T[],
    now: Date = new Date()
): Record<TeamLifecycle, T[]> {
    const buckets: Record<TeamLifecycle, T[]> = { active: [], expired: [], archived: [] };
    for (const team of teams) buckets[teamLifecycle(team, now)].push(team);
    return buckets;
}
