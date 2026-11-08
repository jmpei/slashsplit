"use server";
// Server actions behind the create and join forms (#4). Same rules as the API routes.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHouseholdBody, joinHouseholdBody } from "@/lib/schemas/households";
import { auth } from "@/server/auth";
import { createHousehold, joinHousehold, NotFoundError } from "@/server/households";

export type FormState = { error: string };

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return session.user.id;
}

export async function createHouseholdAction(_prev: FormState, form: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = createHouseholdBody.safeParse({ name: form.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const household = await createHousehold(userId, parsed.data.name);
  redirect(`/households/${household.id}`);
}

export async function joinHouseholdAction(_prev: FormState, form: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = joinHouseholdBody.safeParse({ inviteCode: form.get("inviteCode") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let id: string;
  try {
    id = (await joinHousehold(userId, parsed.data.inviteCode)).id;
  } catch (error) {
    if (error instanceof NotFoundError) return { error: error.message };
    throw error;
  }
  redirect(`/households/${id}`);
}
