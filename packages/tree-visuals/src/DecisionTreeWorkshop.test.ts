import { describe, expect, it } from "vitest";
import { previewsCandidateFromPointer } from "./DecisionTreeWorkshop";

describe("first split pointer preview", () => {
  it("tracks mouse and pen movement without requiring a pressed pointer", () => {
    expect(previewsCandidateFromPointer("mouse", false)).toBe(true);
    expect(previewsCandidateFromPointer("pen", false)).toBe(true);
  });

  it("keeps touch movement tied to the existing drag gesture", () => {
    expect(previewsCandidateFromPointer("touch", false)).toBe(false);
    expect(previewsCandidateFromPointer("touch", true)).toBe(true);
  });
});
