"use server";
// Server actions for recording and deleting expenses inside a household (#6).
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { expenseBody, type ExpenseInput } from "@/lib/schemas/expenses";
import { auth } from "@/server/auth";
import { createExpense, deleteExpense, ValidationError } from "@/server/expenses";
import { isMember, NotFoundError } from "@/server/households";

export async function recordExpensePayloadAction(
  householdId: string,
  payload: ExpenseInput,
): Promise<{ error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  if (!(await isMember(session.user.id, householdId))) {
    return { error: "You’re not a member of this household." };
  }
  const parsed = expenseBody.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  try {
    await createExpense(householdId, parsed.data);
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/households/${householdId}`);
  return {};
}

export async function removeExpenseAction(householdId: string, expenseId: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  if (!(await isMember(session.user.id, householdId))) return;
  try {
    await deleteExpense(householdId, expenseId);
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
  }
  revalidatePath(`/households/${householdId}`);
}
