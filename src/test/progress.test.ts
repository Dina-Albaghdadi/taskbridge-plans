import { describe, expect, it } from "vitest";
import { computeProgress } from "@/lib/progress";

describe("computeProgress", () => {
  it("is 0% when a plan has no tasks", () => {
    expect(computeProgress([])).toEqual({ total: 0, done: 0, percent: 0 });
  });
  it("divides completed tasks by total tasks", () => {
    const r = computeProgress([{ status: "Done" }, { status: "To Do" }, { status: "In Progress" }, { status: "Done" }]);
    expect(r).toEqual({ total: 4, done: 2, percent: 50 });
  });
  it("does not count In Progress as completed", () => {
    expect(computeProgress([{ status: "In Progress" }]).percent).toBe(0);
  });
});
