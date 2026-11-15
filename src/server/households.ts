// Household service (#4): create, join by invite code, members, and the membership check that
// guards every household route. Returns plain objects, never Prisma models.
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type Role = "OWNER" | "MEMBER";
export type HouseholdSummary = { id: string; name: string; role: Role };
export type Member = { userId: string; name: string; role: Role; joinedAt: string };

export class NotFoundError extends Error {}

// No I, O, 0 or 1: people read these codes aloud and type them on phones. 32 symbols divide 256
// evenly, so taking a random byte mod 32 has no bias.
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_LENGTH = 8;

function newInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(INVITE_LENGTH));
  return Array.from(bytes, (b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join("");
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createHousehold(
  userId: string,
  name: string,
): Promise<HouseholdSummary & { inviteCode: string }> {
  // A clash among 32^8 codes is rare; retry a few times rather than check first.
  for (let attempt = 0; ; attempt++) {
    try {
      const household = await prisma.household.create({
        data: {
          name,
          inviteCode: newInviteCode(),
          memberships: { create: { userId, role: "OWNER" } },
        },
      });
      return { id: household.id, name: household.name, inviteCode: household.inviteCode, role: "OWNER" };
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= 4) throw error;
    }
  }
}

export async function listHouseholds(userId: string): Promise<HouseholdSummary[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { household: true },
    orderBy: { joinedAt: "asc" },
  });
  return memberships.map((m) => ({ id: m.household.id, name: m.household.name, role: m.role }));
}

// Joining a household you are already in is a no-op that returns your existing role.
export async function joinHousehold(userId: string, inviteCode: string): Promise<HouseholdSummary> {
  const household = await prisma.household.findUnique({
    where: { inviteCode: normalizeInviteCode(inviteCode) },
  });
  if (!household) throw new NotFoundError("No household has that invite code.");
  const membership = await prisma.membership.upsert({
    where: { userId_householdId: { userId, householdId: household.id } },
    create: { userId, householdId: household.id },
    update: {},
  });
  return { id: household.id, name: household.name, role: membership.role };
}

export async function isMember(userId: string, householdId: string): Promise<boolean> {
  const membership = await prisma.membership.findUnique({
    where: { userId_householdId: { userId, householdId } },
  });
  return membership !== null;
}

export async function getHousehold(
  householdId: string,
): Promise<{ id: string; name: string; inviteCode: string } | null> {
  const household = await prisma.household.findUnique({ where: { id: householdId } });
  return household && { id: household.id, name: household.name, inviteCode: household.inviteCode };
}

export async function listMembers(householdId: string): Promise<Member[]> {
  const memberships = await prisma.membership.findMany({
    where: { householdId },
    include: { user: true },
    orderBy: [{ joinedAt: "asc" }, { userId: "asc" }],
  });
  return memberships.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    role: m.role,
    joinedAt: m.joinedAt.toISOString(),
  }));
}
