// Request bodies for the household API (#4). Shared by route handlers, server actions and, later,
// the OpenAPI document.
import { z } from "zod";

export const createHouseholdBody = z.object({
  name: z.string().trim().min(1, "Give the household a name.").max(60, "Keep the name under 60 characters."),
});

export const joinHouseholdBody = z.object({
  inviteCode: z.string().trim().min(1, "Enter an invite code."),
});
