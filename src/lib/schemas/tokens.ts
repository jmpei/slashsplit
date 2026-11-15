// Request body for creating a personal API token (#13). Shared by the route, the settings page
// action and the OpenAPI document.
import { z } from "zod";

export const createTokenBody = z.object({
  name: z.string().trim().min(1, "Give the token a name.").max(60, "Keep the name under 60 characters."),
});
