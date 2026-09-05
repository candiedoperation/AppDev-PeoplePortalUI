import { describe, expect, it } from "vitest"
import { currentSeason, isExpired, teamLifecycle, partitionByLifecycle } from "./season"

/* Fixed reference points so these never depend on when the suite runs. */
const DURING_FALL_2026 = new Date("2026-09-05T12:00:00")
const DURING_SPRING_2026 = new Date("2026-03-05T12:00:00")

describe("currentSeason", () => {
  it("treats August through December as Fall", () => {
    for (const month of [7, 8, 9, 10, 11]) {
      expect(currentSeason(new Date(2026, month, 15)).type).toBe("FALL")
    }
  })

  it("treats January through July as Spring", () => {
    for (const month of [0, 1, 2, 3, 4, 5, 6]) {
      expect(currentSeason(new Date(2026, month, 15)).type).toBe("SPRING")
    }
  })

  it("reports the calendar year", () => {
    expect(currentSeason(DURING_FALL_2026).year).toBe(2026)
  })

  it("flips on the exact Jul 31 to Aug 1 boundary", () => {
    expect(currentSeason(new Date(2026, 6, 31, 23, 59)).type).toBe("SPRING")
    expect(currentSeason(new Date(2026, 7, 1, 0, 0)).type).toBe("FALL")
  })
})

describe("isExpired", () => {
  it("keeps the current season active", () => {
    expect(isExpired({ seasonType: "FALL", seasonYear: 2026 }, DURING_FALL_2026)).toBe(false)
    expect(isExpired({ seasonType: "SPRING", seasonYear: 2026 }, DURING_SPRING_2026)).toBe(false)
  })

  it("expires Spring once Fall of the same year begins", () => {
    expect(isExpired({ seasonType: "SPRING", seasonYear: 2026 }, DURING_FALL_2026)).toBe(true)
  })

  it("does not expire Fall while Spring of the same year is running", () => {
    /* Fall 2026 is ahead of us in March 2026, not behind. */
    expect(isExpired({ seasonType: "FALL", seasonYear: 2026 }, DURING_SPRING_2026)).toBe(false)
  })

  it("expires any earlier year", () => {
    expect(isExpired({ seasonType: "FALL", seasonYear: 2025 }, DURING_FALL_2026)).toBe(true)
    expect(isExpired({ seasonType: "SPRING", seasonYear: 2019 }, DURING_FALL_2026)).toBe(true)
  })

  it("does not expire a future year", () => {
    expect(isExpired({ seasonType: "SPRING", seasonYear: 2027 }, DURING_FALL_2026)).toBe(false)
  })

  it("never expires ROLLING service teams", () => {
    expect(isExpired({ seasonType: "ROLLING", seasonYear: 2019 }, DURING_FALL_2026)).toBe(false)
  })

  it("accepts lowercase and mixed-case season types", () => {
    expect(isExpired({ seasonType: "spring", seasonYear: 2026 }, DURING_FALL_2026)).toBe(true)
    expect(isExpired({ seasonType: "Fall", seasonYear: 2025 }, DURING_FALL_2026)).toBe(true)
  })

  it("treats incomplete season data as not expired rather than guessing", () => {
    expect(isExpired({ seasonYear: 2019 }, DURING_FALL_2026)).toBe(false)
    expect(isExpired({ seasonType: "FALL" }, DURING_FALL_2026)).toBe(false)
    expect(isExpired({}, DURING_FALL_2026)).toBe(false)
    expect(isExpired({ seasonType: "", seasonYear: 2019 }, DURING_FALL_2026)).toBe(false)
    expect(isExpired({ seasonType: "FALL", seasonYear: 0 }, DURING_FALL_2026)).toBe(false)
  })
})

describe("teamLifecycle", () => {
  it("puts an explicitly archived team in archived even when its season is current", () => {
    expect(
      teamLifecycle(
        { seasonType: "FALL", seasonYear: 2026, archivedAt: "2026-09-01T00:00:00.000Z" },
        DURING_FALL_2026
      )
    ).toBe("archived")
  })

  it("lets archival win over expiry, so archiving clears the expired queue", () => {
    expect(
      teamLifecycle(
        { seasonType: "SPRING", seasonYear: 2019, archivedAt: "2026-09-01T00:00:00.000Z" },
        DURING_FALL_2026
      )
    ).toBe("archived")
  })

  it("classifies the three plain cases", () => {
    expect(teamLifecycle({ seasonType: "FALL", seasonYear: 2026 }, DURING_FALL_2026)).toBe("active")
    expect(teamLifecycle({ seasonType: "SPRING", seasonYear: 2026 }, DURING_FALL_2026)).toBe("expired")
    expect(teamLifecycle({ archivedAt: "2026-01-01T00:00:00.000Z" }, DURING_FALL_2026)).toBe("archived")
  })
})

describe("partitionByLifecycle", () => {
  const teams = [
    { name: "webdev-fa26", seasonType: "FALL", seasonYear: 2026 },
    { name: "infra-sp26", seasonType: "SPRING", seasonYear: 2026 },
    { name: "ml-fa25", seasonType: "FALL", seasonYear: 2025 },
    { name: "exec", seasonType: "ROLLING", seasonYear: 2019 },
    { name: "old-archived", seasonType: "FALL", seasonYear: 2024, archivedAt: "2025-01-01T00:00:00.000Z" },
  ]

  it("sorts every team into exactly one bucket", () => {
    const { active, expired, archived } = partitionByLifecycle(teams, DURING_FALL_2026)
    expect(active.map(t => t.name)).toEqual(["webdev-fa26", "exec"])
    expect(expired.map(t => t.name)).toEqual(["infra-sp26", "ml-fa25"])
    expect(archived.map(t => t.name)).toEqual(["old-archived"])
    expect(active.length + expired.length + archived.length).toBe(teams.length)
  })

  it("preserves input order within a bucket", () => {
    const { expired } = partitionByLifecycle(teams, DURING_FALL_2026)
    expect(expired[0].name).toBe("infra-sp26")
  })

  it("handles an empty list", () => {
    expect(partitionByLifecycle([], DURING_FALL_2026)).toEqual({ active: [], expired: [], archived: [] })
  })
})
