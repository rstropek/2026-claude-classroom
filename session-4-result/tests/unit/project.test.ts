// @vitest-environment node
import { describe, expect, test } from "vitest";

import {
  applyProjectPatch,
  describeChanges,
  emptyProject,
  type Project,
  projectPatchSchema,
  projectSchema,
} from "@/lib/project";

const planned: Project = {
  title: "Site relaunch",
  description: "Rebuild the public website.",
  startDate: "2026-04-13",
  endDate: "2026-09-30",
  effortPersonDays: 30,
  criticality: "medium",
};

test("the empty project parses and every patch field is optional", () => {
  expect(projectSchema.parse(emptyProject)).toEqual(emptyProject);
  expect(projectPatchSchema.parse({})).toEqual({});
});

describe("applyProjectPatch", () => {
  test("merges the given fields and keeps the rest", () => {
    const { project, errors } = applyProjectPatch(emptyProject, {
      title: "Site relaunch",
      criticality: "high",
    });

    expect(errors).toEqual({});
    expect(project).toEqual({
      ...emptyProject,
      title: "Site relaunch",
      criticality: "high",
    });
    // The input is untouched, so callers can compare before and after.
    expect(emptyProject.title).toBe("");
  });

  test("refuses an end date before the start date", () => {
    const { project, errors } = applyProjectPatch(planned, {
      endDate: "2026-01-01",
    });

    expect(project.endDate).toBe("2026-09-30");
    expect(errors.endDate).toBe("The end date is before the start date.");
  });

  test("refuses a start date after the end date", () => {
    const { project, errors } = applyProjectPatch(planned, {
      startDate: "2026-12-01",
    });

    expect(project.startDate).toBe("2026-04-13");
    expect(errors.startDate).toBe("The start date is after the end date.");
  });

  test("accepts a pair that only makes sense together", () => {
    const { project, errors } = applyProjectPatch(planned, {
      startDate: "2027-01-04",
      endDate: "2027-03-31",
    });

    expect(errors).toEqual({});
    expect(project.startDate).toBe("2027-01-04");
    expect(project.endDate).toBe("2027-03-31");
  });

  test("does not compare dates while one of them is unset", () => {
    const { project, errors } = applyProjectPatch(emptyProject, {
      endDate: "2026-02-01",
    });

    expect(errors).toEqual({});
    expect(project.endDate).toBe("2026-02-01");
  });

  test("clears a date on an empty string", () => {
    const { project, errors } = applyProjectPatch(planned, { endDate: "" });

    expect(errors).toEqual({});
    expect(project.endDate).toBe("");
  });

  test("refuses a day that does not exist", () => {
    const { project, errors } = applyProjectPatch(planned, {
      startDate: "2026-02-30",
    });

    expect(project.startDate).toBe("2026-04-13");
    expect(errors.startDate).toBe(
      '"2026-02-30" is not a date. Use the form 2026-04-13.',
    );
  });

  test("refuses a date that is not in the ISO form", () => {
    const { errors } = applyProjectPatch(planned, { endDate: "13.04.2026" });

    expect(errors.endDate).toContain("is not a date");
  });

  test("refuses effort of zero or less", () => {
    expect(applyProjectPatch(planned, { effortPersonDays: 0 })).toEqual({
      project: planned,
      errors: {
        effortPersonDays: "Effort has to be more than zero person-days.",
      },
    });
    expect(
      applyProjectPatch(planned, { effortPersonDays: -5 }).project
        .effortPersonDays,
    ).toBe(30);
  });

  test("applies the good fields of a patch whose other field fails", () => {
    const { project, errors } = applyProjectPatch(planned, {
      criticality: "high",
      effortPersonDays: 0,
      startDate: "2026-05-01",
    });

    expect(project.criticality).toBe("high");
    expect(project.startDate).toBe("2026-05-01");
    expect(project.effortPersonDays).toBe(30);
    expect(Object.keys(errors)).toEqual(["effortPersonDays"]);
  });
});

describe("describeChanges", () => {
  test("names the fields that changed", () => {
    const { project } = applyProjectPatch(emptyProject, {
      effortPersonDays: 30,
      criticality: "high",
    });

    expect(describeChanges(emptyProject, project)).toBe(
      "Set effort to 30 person-days and criticality to high.",
    );
  });

  test("quotes text fields and lists three changes", () => {
    const { project } = applyProjectPatch(emptyProject, {
      title: "Site relaunch",
      startDate: "2026-04-13",
      criticality: "low",
    });

    expect(describeChanges(emptyProject, project)).toBe(
      'Set title to "Site relaunch", start date to 2026-04-13 and criticality to low.',
    );
  });

  test("reports a cleared field on its own", () => {
    const { project } = applyProjectPatch(planned, { endDate: "" });

    expect(describeChanges(planned, project)).toBe("Cleared the end date.");
  });

  test("reports set and cleared fields together", () => {
    const { project } = applyProjectPatch(planned, {
      endDate: "",
      criticality: "high",
    });

    expect(describeChanges(planned, project)).toBe(
      "Set criticality to high. Cleared the end date.",
    );
  });

  test("says so when nothing changed", () => {
    expect(describeChanges(planned, planned)).toBe("Nothing changed.");
    const { project } = applyProjectPatch(planned, { effortPersonDays: 0 });
    expect(describeChanges(planned, project)).toBe("Nothing changed.");
  });
});
