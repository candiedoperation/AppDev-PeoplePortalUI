import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

/* Unmount between tests so a leaked component cannot affect the next query. */
afterEach(() => cleanup())

/* jsdom implements no media queries, but shadcn's sidebar calls matchMedia
   through use-mobile on mount, so any component inside SidebarProvider throws
   without this. Reports desktop, which is the layout worth testing by default. */
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},      // deprecated, still called by some libraries
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
