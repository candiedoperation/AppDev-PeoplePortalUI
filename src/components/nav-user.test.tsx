import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { NavUser } from "./nav-user"
import { SidebarProvider } from "@/components/ui/sidebar"

const USER = { pk: 42, name: "Ada Lovelace", email: "ada@example.invalid", avatar: "" }

const renderMenu = () =>
  render(
    <MemoryRouter>
      <SidebarProvider>
        <NavUser user={USER} />
      </SidebarProvider>
    </MemoryRouter>
  )

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /Ada Lovelace/i }))
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, statusText: "OK" })))
})
afterEach(() => vi.unstubAllGlobals())

describe("NavUser menu", () => {
  it("offers Account and Log out", async () => {
    const user = userEvent.setup()
    renderMenu()
    await openMenu(user)

    await waitFor(() => expect(screen.getByText("Account")).toBeInTheDocument())
    expect(screen.getByText("Log out")).toBeInTheDocument()
  })

  it("does not offer Notifications, which had nothing behind it", async () => {
    const user = userEvent.setup()
    renderMenu()
    await openMenu(user)

    await waitFor(() => expect(screen.getByText("Account")).toBeInTheDocument())
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument()
  })

  it("logs out through the real endpoint", async () => {
    /* This is the bug that mattered: the item rendered but called nothing, so
       the corp dashboard had no way to sign out at all. */
    const user = userEvent.setup()
    renderMenu()
    await openMenu(user)
    await waitFor(() => expect(screen.getByText("Log out")).toBeInTheDocument())

    await user.click(screen.getByText("Log out"))

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(url)).toContain("/api/auth/logout")
    expect(init).toMatchObject({ method: "POST", credentials: "include" })
  })
})
