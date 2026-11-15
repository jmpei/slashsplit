"use server";
// Server actions behind the API tokens page (#13). Same rules as the /api/v1/tokens routes.
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createTokenBody } from "@/lib/schemas/tokens";
import { auth } from "@/server/auth";
import { createToken, revokeToken } from "@/server/tokens";

export type CreateTokenState = { error: string; token?: string; name?: string };

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return session.user.id;
}

export async function createTokenAction(_prev: CreateTokenState, form: FormData): Promise<CreateTokenState> {
  const userId = await requireUserId();
  const parsed = createTokenBody.safeParse({ name: form.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const created = await createToken(userId, parsed.data.name);
  revalidatePath("/settings/tokens");
  return { error: "", token: created.token, name: created.name };
}

export async function revokeTokenAction(tokenId: string): Promise<void> {
  const userId = await requireUserId();
  await revokeToken(userId, tokenId);
  revalidatePath("/settings/tokens");
}
