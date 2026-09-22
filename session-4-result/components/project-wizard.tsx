"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { emptyProject, type Project } from "@/lib/project";

/** A label and its value on one hairline row, the forum pattern. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-rule px-3 py-2 last:border-b-0">
      <span className="w-32 shrink-0 text-sm text-ink-mute">{label}</span>
      <span className="min-w-0 text-base text-ink">{value || "not set"}</span>
    </div>
  );
}

export function ProjectWizard({ today }: { today: string }) {
  // biome-ignore lint/correctness/noUnusedVariables: setProject gets its caller in step 22
  const [project, setProject] = useState<Project>(emptyProject);
  const [instruction, setInstruction] = useState("");
  const [status, setStatus] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // ---------------------------------------------------------------------
    // Step 22 plugs in here: the card becomes an A2UI surface and onSubmit
    // runs the project agent. Until then `setProject` has no caller, and the
    // card only ever shows the empty project.
    // ---------------------------------------------------------------------
    setStatus("Not connected to an agent yet.");
    setInstruction("");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <section className="flex-1 overflow-y-auto border border-edge bg-surface">
        <div className="border-b border-edge px-3 py-2">
          <h1 className="text-xl font-semibold text-ink">Project card</h1>
          <p className="text-sm text-ink-mute">Planning as of {today}.</p>
        </div>
        <Row label="Title" value={project.title} />
        <Row label="Description" value={project.description} />
        <Row label="Start date" value={project.startDate} />
        <Row label="End date" value={project.endDate} />
        <Row
          label="Effort"
          value={
            project.effortPersonDays > 0
              ? `${project.effortPersonDays} person-days`
              : ""
          }
        />
        <Row label="Criticality" value={project.criticality} />
      </section>

      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <Field
            id="instruction"
            label="Instruction"
            className="w-full"
            autoComplete="off"
            placeholder="Plan a six month website relaunch"
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
          />
        </div>
        <Button type="submit">Send</Button>
      </form>
      <p aria-live="polite" className="min-h-5 text-sm text-ink-soft">
        {status}
      </p>
    </div>
  );
}
