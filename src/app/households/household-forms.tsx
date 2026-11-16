"use client";
// Create-a-household and join-with-a-code forms. Errors, including a request that never reaches the
// server, are announced in a status region.
import { unstable_rethrow } from "next/navigation";
import { useActionState } from "react";
import { buttonPrimary, card, errorText, field, h2, label, NETWORK_ERROR } from "../ui";
import { createHouseholdAction, joinHouseholdAction, type FormState } from "./actions";

const initial: FormState = { error: "" };

function HouseholdForm(props: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  formLabel: string;
  label: string;
  name: string;
  submit: string;
  autoCapitalize?: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: FormState, form: FormData): Promise<FormState> => {
      try {
        return await props.action(prev, form);
      } catch (error) {
        unstable_rethrow(error); // a successful create or join redirects by throwing
        return { error: NETWORK_ERROR };
      }
    },
    initial,
  );
  return (
    <form action={formAction} aria-label={props.formLabel} className={card}>
      <h2 className={h2}>{props.formLabel}</h2>
      <label className={label}>
        {props.label}
        <input name={props.name} required className={field} autoCapitalize={props.autoCapitalize} />
      </label>
      <button type="submit" className={buttonPrimary} disabled={pending}>
        {props.submit}
      </button>
      <p role="status" aria-live="polite" className={errorText}>
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
        label="Household name"
        name="name"
        submit="Create household"
      />
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
