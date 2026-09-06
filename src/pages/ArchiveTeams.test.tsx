import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { ArchiveTeams } from "./ArchiveTeams"

/* Fall 2026, so Spring 2026 and anything earlier has expired. */
const NOW = new Date("2026-09-05T12:00:00")

const TEAMS = [
  { pk: "1", name: "webdev-fa26", friendlyName: "Web Dev", teamType: "PROJECT", seasonType: "FALL", seasonYear: 2026 },
  { pk: "2", name: "infra-sp26", friendlyName: "Infrastructure", teamType: "PROJECT", seasonType: "SPRING", seasonYear: 2026 },
  { pk: "3", name: "ml-fa25", friendlyName: "ML Bootcamp", teamType: "BOOTCAMP", seasonType: "FALL", seasonYear: 2025 },
  { pk: "4", name: "exec", friendlyName: "Executive Board", teamType: "SERVICE", seasonType: "ROLLING", seasonYear: 2019 },
  { pk: "5", name: "legacy", friendlyName: "Legacy Team", teamType: "PROJECT", seasonType: "FALL", seasonYear: 2024, archivedAt: "2025-01-01T00:00:00.000Z" },
]

const renderPage = () => render(<MemoryRouter><ArchiveTeams /></MemoryRouter>)

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(NOW)
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    statusText: "OK",
    json: async () => ({ teams: TEAMS }),
  })))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("ArchiveTeams", () => {
  it("offers Active, Expired and Archived tabs", async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole("tab", { name: /Active/ })).toBeInTheDocument())
    expect(screen.getByRole("tab", { name: /Expired/ })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Archived/ })).toBeInTheDocument()
  })

  it("counts teams into the right buckets", async () => {
    renderPage()
    /* Active: Web Dev (current) + Executive Board (ROLLING never expires) */
    await waitFor(() => expect(screen.getByRole("tab", { name: /Active \(2\)/ })).toBeInTheDocument())
    /* Expired: Infrastructure (Spring 2026) + ML Bootcamp (Fall 2025) */
    expect(screen.getByRole("tab", { name: /Expired \(2\)/ })).toBeInTheDocument()
    /* Archived: Legacy Team, explicitly archived */
    expect(screen.getByRole("tab", { name: /Archived \(1\)/ })).toBeInTheDocument()
  })

  it("shows the current-season and rolling teams under Active", async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText("Web Dev")).toBeInTheDocument())
    expect(screen.getByText("Executive Board")).toBeInTheDocument()
    expect(screen.queryByText("Infrastructure")).not.toBeInTheDocument()
  })

  it("lists past-season teams that were never archived under Expired", async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByRole("tab", { name: /Expired/ })).toBeInTheDocument())

    await user.click(screen.getByRole("tab", { name: /Expired/ }))

    await waitFor(() => expect(screen.getByText("Infrastructure")).toBeInTheDocument())
    expect(screen.getByText("ML Bootcamp")).toBeInTheDocument()
    /* An explicitly archived team belongs in Archived, not here. */
    expect(screen.queryByText("Legacy Team")).not.toBeInTheDocument()
  })

  it("keeps the Archive action on Expired, so it doubles as the archiving queue", async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByRole("tab", { name: /Expired/ })).toBeInTheDocument())

    await user.click(screen.getByRole("tab", { name: /Expired/ }))

    await waitFor(() => expect(screen.getAllByRole("button", { name: /archive/i }).length).toBeGreaterThan(0))
  })

  it("requests archived teams from the API so the Archived tab can be populated", async () => {
    renderPage()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const url = String((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(url).toContain("includeArchived=true")
  })
})

describe("ArchiveTeams superuser notice", () => {
  it("states up front that archiving needs superuser access", async () => {
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/Archiving a team requires/i)).toBeInTheDocument()
    )
    expect(screen.getByText(/superuser/i)).toBeInTheDocument()
  })

  it("repeats the requirement in the confirmation dialog", async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText("Web Dev")).toBeInTheDocument())

    await user.click(screen.getAllByRole("button", { name: /archive/i })[0])

    await waitFor(() =>
      expect(screen.getByText(/Requires superuser access/i)).toBeInTheDocument()
    )
  })
})
