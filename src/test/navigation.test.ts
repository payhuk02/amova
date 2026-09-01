import { describe, it, expect } from "vitest";
import { navGroups } from "@/lib/navigation";

/** Protected user routes that must appear in the AppShell sidebar */
const REQUIRED_SIDEBAR_PATHS = [
  "/discover",
  "/nearby",
  "/dashboard",
  "/liked-me",
  "/messages",
  "/notifications",
  "/stories",
  "/events",
  "/speed-dating",
  "/edit-profile",
  "/coach",
  "/premium",
  "/settings",
];

describe("navigation sidebar coverage", () => {
  const sidebarPaths = navGroups.flatMap((g) => g.items.map((i) => i.path));

  it.each(REQUIRED_SIDEBAR_PATHS)("includes %s", (path) => {
    expect(sidebarPaths).toContain(path);
  });

  it("has no duplicate paths", () => {
    expect(new Set(sidebarPaths).size).toBe(sidebarPaths.length);
  });
});
