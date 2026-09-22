import { z } from "zod";

/**
 * The project record the wizard page edits, plus the rules that decide which
 * parts of an incoming change are allowed to land.
 *
 * Plain module on purpose: no `server-only`, no database, no network. The
 * client component, a Server Component and a Vitest file all import it.
 */

export const criticalities = ["low", "medium", "high"] as const;

/** True for a string that is both shaped `YYYY-MM-DD` and a day that exists. */
function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** An ISO calendar date, or "" while the field has not been filled in. */
const calendarDate = z
  .string()
  .refine((value) => value === "" || isCalendarDate(value));

export const projectSchema = z.object({
  title: z.string(),
  description: z.string(),
  startDate: calendarDate,
  endDate: calendarDate,
  effortPersonDays: z.number(),
  criticality: z.enum(criticalities),
});

export type Project = z.infer<typeof projectSchema>;

/** What a fresh wizard starts from: nothing filled in, criticality in the middle. */
export const emptyProject: Project = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  effortPersonDays: 0,
  criticality: "medium",
};

/**
 * One change to the project. Every field is optional, so a change can touch a
 * single field. The `.describe()` text is written for a language model that
 * fills this in as tool input, so it has to state the formats.
 */
export const projectPatchSchema = z.object({
  title: z.string().describe("Short name of the project.").optional(),
  description: z
    .string()
    .describe("One or two sentences about what the project delivers.")
    .optional(),
  startDate: z
    .string()
    .describe(
      'Day the project starts, as an ISO calendar date such as 2026-04-13. Send "" to clear it.',
    )
    .optional(),
  endDate: z
    .string()
    .describe(
      'Day the project ends, as an ISO calendar date such as 2026-09-30. It must not be before the start date. Send "" to clear it.',
    )
    .optional(),
  effortPersonDays: z
    .number()
    .describe(
      "Total estimated effort in person-days, counting every person on the team. Must be above zero.",
    )
    .optional(),
  criticality: z
    .enum(criticalities)
    .describe(
      "How critical the project is for the business: low, medium, or high.",
    )
    .optional(),
});

export type ProjectPatch = z.infer<typeof projectPatchSchema>;

type ProjectErrors = Partial<Record<keyof Project, string>>;

/**
 * Merges a change into the current project and checks the result. A field that
 * breaks a rule keeps its previous value and reports a message; the other
 * fields of the same change still land.
 */
export function applyProjectPatch(
  current: Project,
  patch: ProjectPatch,
): { project: Project; errors: ProjectErrors } {
  const project: Project = { ...current };
  const errors: ProjectErrors = {};

  if (patch.title !== undefined) project.title = patch.title;
  if (patch.description !== undefined) project.description = patch.description;
  if (patch.criticality !== undefined) project.criticality = patch.criticality;

  if (patch.effortPersonDays !== undefined) {
    if (patch.effortPersonDays > 0) {
      project.effortPersonDays = patch.effortPersonDays;
    } else {
      errors.effortPersonDays = "Effort has to be more than zero person-days.";
    }
  }

  for (const key of ["startDate", "endDate"] as const) {
    const value = patch[key];
    if (value === undefined) continue;
    if (value === "" || isCalendarDate(value)) {
      project[key] = value;
    } else {
      errors[key] = `"${value}" is not a date. Use the form 2026-04-13.`;
    }
  }

  // Only the pair can break this rule, so it is checked on the merged result.
  // The field the change touched is the one that gives way.
  if (
    project.startDate &&
    project.endDate &&
    project.endDate < project.startDate
  ) {
    if (patch.endDate !== undefined && !errors.endDate) {
      errors.endDate = "The end date is before the start date.";
      project.endDate = current.endDate;
    } else if (patch.startDate !== undefined && !errors.startDate) {
      errors.startDate = "The start date is after the end date.";
      project.startDate = current.startDate;
    }
  }

  return { project, errors };
}

function quote(text: string) {
  const short = text.length > 40 ? `${text.slice(0, 40).trimEnd()}...` : text;
  return `"${short}"`;
}

/** Joins "a", "b", "c" into "a, b and c". */
function list(parts: string[]) {
  if (parts.length < 2) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * One line for the status display under the input, such as
 * "Set effort to 30 person-days and criticality to high."
 */
export function describeChanges(before: Project, after: Project): string {
  const set: string[] = [];
  const cleared: string[] = [];

  if (before.title !== after.title) {
    if (after.title) set.push(`title to ${quote(after.title)}`);
    else cleared.push("title");
  }
  if (before.description !== after.description) {
    if (after.description)
      set.push(`description to ${quote(after.description)}`);
    else cleared.push("description");
  }
  if (before.startDate !== after.startDate) {
    if (after.startDate) set.push(`start date to ${after.startDate}`);
    else cleared.push("start date");
  }
  if (before.endDate !== after.endDate) {
    if (after.endDate) set.push(`end date to ${after.endDate}`);
    else cleared.push("end date");
  }
  if (before.effortPersonDays !== after.effortPersonDays) {
    if (after.effortPersonDays > 0) {
      set.push(`effort to ${after.effortPersonDays} person-days`);
    } else {
      cleared.push("effort");
    }
  }
  if (before.criticality !== after.criticality) {
    set.push(`criticality to ${after.criticality}`);
  }

  const sentences: string[] = [];
  if (set.length > 0) sentences.push(`Set ${list(set)}.`);
  if (cleared.length > 0) sentences.push(`Cleared the ${list(cleared)}.`);
  return sentences.length > 0 ? sentences.join(" ") : "Nothing changed.";
}
