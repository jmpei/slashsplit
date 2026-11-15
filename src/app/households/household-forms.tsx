"use client";
// Create-a-household and join-with-a-code forms. Errors are announced in a status region.
import { useActionState } from "react";
import { createHouseholdAction, joinHouseholdAction, type FormState } from "./actions";

const field =
  "min-h-11 w-full rounded-lg border border-foreground/20 bg-background px-3 text-base outline-none focus:border-foreground/60";
const button =
  "min-h-11 rounded-lg bg-foreground px-4 font-medium text-background disabled:opacity-50";
const initial: FormState = { error: "" };

function HouseholdForm(props: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  formLabel: string;
  label: string;
  name: string;
  submit: string;
  autoCapitalize?: string;
}) {
  const [state, formAction, pending] = useActionState(props.action, initial);
  return (
    <form action={formAction} aria-label={props.formLabel} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm">
        {props.label}
        <input name={props.name} required className={field} autoCapitalize={props.autoCapitalize} />
      </label>
      <button type="submit" className={button} disabled={pending}>
        {props.submit}
      </button>
      <p role="status" className="min-h-5 text-sm text-red-600 dark:text-red-400">
        {state.error}
      </p>
    </form>
  );
}

export function HouseholdForms() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <HouseholdForm
        action={createHouseholdAction}
        formLabel="Create a household"
        label="Household name" name="name" submit="Create household" />
      <HouseholdForm
        action={joinHouseholdAction}
        formLabel="Join a household"
        label="Invite code"
        name="inviteCode"
        submit="Join household"
        autoCapitalize="characters"
      />
    </div>
  );
}
