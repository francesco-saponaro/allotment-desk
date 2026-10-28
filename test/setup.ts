import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { latency } from "@/data/api";

// no pretend network delay in tests
latency.ms = 0;

// jsdom has no matchMedia; the tests run at desktop width, so every min-width query matches
window.matchMedia = (query: string) =>
  ({
    matches: query.includes("min-width"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
