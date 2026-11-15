// Personal API tokens (#13). A token is "ss_" + 48 hex chars; only its sha256 hex is stored, so the
// plaintext exists only in the create response.
import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type TokenSummary = { id: string; name: string; lastUsedAt: string | null; createdAt: string };
export type CreatedToken = { id: string; name: string; token: string; createdAt: string };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createToken(userId: string, name: string): Promise<CreatedToken> {
  const token = "ss_" + randomBytes(24).toString("hex");
  const row = await prisma.apiToken.create({ data: { userId, name, tokenHash: hashToken(token) } });
  return { id: row.id, name: row.name, token, createdAt: row.createdAt.toISOString() };
}

export async function listTokens(userId: string): Promise<TokenSummary[]> {
  const rows = await prisma.apiToken.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }));
}

// Returns false when the token doesn't exist or belongs to someone else.
export async function revokeToken(userId: string, tokenId: string): Promise<boolean> {
  const { count } = await prisma.apiToken.deleteMany({ where: { id: tokenId, userId } });
  return count > 0;
}

// The user a plaintext token belongs to, or null. Records when the token was last used.
export async function userIdForToken(token: string): Promise<string | null> {
  try {
    const row = await prisma.apiToken.update({
      where: { tokenHash: hashToken(token) },
      data: { lastUsedAt: new Date() },
    });
    return row.userId;
  } catch (error) {
    // P2025: no row has this hash.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;
    throw error;
  }
}
