// OpenAPI 3.1 specification builder (#8): converts our zod request and response schemas via Zod 4's
// built-in z.toJSONSchema() so route validation and API documentation never drift.
import { z } from "zod";
import { draftEditsBody, expenseBody } from "@/lib/schemas/expenses";
import { createHouseholdBody, joinHouseholdBody } from "@/lib/schemas/households";
import { recordSettlementBody } from "@/lib/schemas/settlements";
import { createTokenBody } from "@/lib/schemas/tokens";
import { scanReceiptJsonBody } from "@/lib/schemas/receipts";

function jsonSchema(schema: z.ZodType) {
  const { $schema: _unused, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  void _unused;
  return rest;
}

const errorSchema = z.object({ error: z.string() });
const householdSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["OWNER", "MEMBER"]),
});
const createdHouseholdSchema = householdSummarySchema.extend({
  inviteCode: z.string(),
});
const memberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  role: z.enum(["OWNER", "MEMBER"]),
  joinedAt: z.string(),
});
const shareSchema = z.object({
  userId: z.string(),
  amountCents: z.number().int(),
});
const expenseRecordSchema = expenseBody.extend({
  id: z.string(),
  householdId: z.string(),
  status: z.enum(["DRAFT", "CONFIRMED"]),
  scanError: z.string().nullable().describe("Why the receipt scan failed; set only on such drafts (#9)."),
  shares: z.array(shareSchema),
});
const householdVersionSchema = z.object({ version: z.number().int().nonnegative() });

const balanceSchema = z.object({
  userId: z.string(),
  netCents: z.number().int(),
});
const transferSchema = z.object({
  fromUserId: z.string(),
  toUserId: z.string(),
  amountCents: z.number().int(),
});
const settlementRecordSchema = recordSettlementBody.extend({
  id: z.string(),
  householdId: z.string(),
  paidAt: z.string(),
});

const tokenSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
});
const createdTokenSchema = z.object({
  id: z.string(),
  name: z.string(),
  token: z.string().describe("Plaintext token (ss_ + 48 hex). Shown only in this response."),
  createdAt: z.string(),
});

// Request example sent with a personal API token (#13), in Redoc's x-codeSamples shape.
function bearerCurl(method: string, path: string, body: unknown) {
  return [
    {
      lang: "Shell",
      label: "curl",
      source: [
        `curl -X ${method} https://slashsplit.vercel.app${path} \\`,
        `  -H "Authorization: Bearer ss_..." \\`,
        `  -H "Content-Type: application/json" \\`,
        `  -d '${JSON.stringify(body)}'`,
      ].join("\n"),
    },
  ];
}

const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "Household id.",
};

const eidParam = {
  name: "eid",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "Expense id.",
};

const authErrors = {
  "401": {
    description: "Not signed in.",
    content: { "application/json": { schema: jsonSchema(errorSchema) } },
  },
  "403": {
    description: "Caller is not a member of this household.",
    content: { "application/json": { schema: jsonSchema(errorSchema) } },
  },
};

export function buildOpenApiSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "SlashSplit API",
      version: "1.0.0",
      description:
        "Public REST API for SlashSplit households, itemized expenses, net balances, and settlements. Authenticate with a session cookie or a Bearer API token (#13).",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Personal API token sent in the Authorization header.",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/v1/households": {
        get: {
          summary: "List the households the caller belongs to",
          responses: {
            "200": {
              description: "Household list.",
              content: {
                "application/json": { schema: jsonSchema(z.array(householdSummarySchema)) },
              },
            },
            "401": authErrors["401"],
          },
        },
        post: {
          summary: "Create a household and become its owner",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: jsonSchema(createHouseholdBody),
                examples: { household: { summary: "A new household", value: { name: "Maple House" } } },
              },
            },
          },
          "x-codeSamples": bearerCurl("POST", "/api/v1/households", { name: "Maple House" }),
          responses: {
            "201": {
              description: "Created household with its 8-character invite code.",
              content: { "application/json": { schema: jsonSchema(createdHouseholdSchema) } },
            },
            "400": {
              description: "Invalid household name.",
              content: { "application/json": { schema: jsonSchema(errorSchema) } },
            },
            "401": authErrors["401"],
          },
        },
      },
      "/api/v1/tokens": {
        get: {
          summary: "List the caller's personal API tokens (never the token itself)",
          responses: {
            "200": {
              description: "Tokens, newest first.",
              content: { "application/json": { schema: jsonSchema(z.array(tokenSummarySchema)) } },
            },
            "401": authErrors["401"],
          },
        },
        post: {
          summary: "Create a personal API token; the plaintext is returned once",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: jsonSchema(createTokenBody),
                examples: { script: { summary: "A token for a script", value: { name: "Laptop script" } } },
              },
            },
          },
          "x-codeSamples": bearerCurl("POST", "/api/v1/tokens", { name: "Laptop script" }),
          responses: {
            "201": {
              description: "Created token, with its plaintext value shown only here.",
              content: { "application/json": { schema: jsonSchema(createdTokenSchema) } },
            },
            "400": {
              description: "Invalid token name.",
              content: { "application/json": { schema: jsonSchema(errorSchema) } },
            },
            "401": authErrors["401"],
          },
        },
      },
      "/api/v1/tokens/{id}": {
        delete: {
          summary: "Revoke one of the caller's API tokens",
          parameters: [{ ...idParam, description: "Token id." }],
          responses: {
            "204": { description: "Token revoked." },
            "401": authErrors["401"],
            "404": {
              description: "The caller has no token with this id.",
              content: { "application/json": { schema: jsonSchema(errorSchema) } },
            },
          },
        },
      },
      "/api/v1/households/join": {
        post: {
          summary: "Join a household by invite code",
          requestBody: {
            required: true,
            content: { "application/json": { schema: jsonSchema(joinHouseholdBody) } },
          },
          responses: {
            "200": {
              description: "Joined household.",
              content: { "application/json": { schema: jsonSchema(householdSummarySchema) } },
            },
            "401": authErrors["401"],
            "404": {
              description: "No household has that invite code.",
              content: { "application/json": { schema: jsonSchema(errorSchema) } },
            },
          },
        },
      },
      "/api/v1/households/{id}/members": {
        get: {
          summary: "List members of a household in join order",
          parameters: [idParam],
          responses: {
            "200": {
              description: "Members in join order.",
              content: { "application/json": { schema: jsonSchema(z.array(memberSchema)) } },
            },
            ...authErrors,
          },
        },
      },
      "/api/v1/households/{id}/expenses": {
        get: {
          summary: "List confirmed expenses in a household, or its receipt drafts",
          parameters: [
            idParam,
            {
              name: "status",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["CONFIRMED", "DRAFT"], default: "CONFIRMED" },
              description: "CONFIRMED (default) lists expenses; DRAFT lists scanned receipts awaiting confirmation.",
            },
          ],
          responses: {
            "200": {
              description: "Expenses with items, taxes and computed shares.",
              content: { "application/json": { schema: jsonSchema(z.array(expenseRecordSchema)) } },
            },
            "400": {
              description: "Unknown status value.",
              content: { "application/json": { schema: jsonSchema(errorSchema) } },
            },
            ...authErrors,
          },
        },
        post: {
          summary: "Record a new itemized, equal or ratio expense",
          parameters: [idParam],
          requestBody: {
            required: true,
            content: { "application/json": { schema: jsonSchema(expenseBody) } },
          },
          responses: {
            "201": {
              description: "Created expense with computed member shares.",
              content: { "application/json": { schema: jsonSchema(expenseRecordSchema) } },
            },
            "400": {
              description: "Validation failed.",
              content: { "application/json": { schema: jsonSchema(errorSchema) } },
            },
            ...authErrors,
          },
        },
      },
      "/api/v1/households/{id}/expenses/{eid}": {
        get: {
          summary: "Get one expense in a household",
          parameters: [idParam, eidParam],
          responses: {
            "200": {
              description: "Expense details.",
              content: { "application/json": { schema: jsonSchema(expenseRecordSchema) } },
            },
            "404": {
              description: "Expense not found.",
              content: { "application/json": { schema: jsonSchema(errorSchema) } },
            },
            ...authErrors,
          },
        },
        patch: {
          summary: "Update an expense and recompute member shares",
          parameters: [idParam, eidParam],
          requestBody: {
            required: true,
            content: { "application/json": { schema: jsonSchema(expenseBody) } },
          },
          responses: {
            "200": {
              description: "Updated expense.",
              content: { "application/json": { schema: jsonSchema(expenseRecordSchema) } },
            },
            "400": {
              description: "Validation failed.",
              content: { "application/json": { schema: jsonSchema(errorSchema) } },
            },
            "404": {
              description: "Expense not found.",
              content: { "application/json": { schema: jsonSchema(errorSchema) } },
            },
            ...authErrors,
          },
        },
        delete: {
          summary: "Delete an expense",
          parameters: [idParam, eidParam],
          responses: {
            "204": { description: "Expense deleted." },
            "404": {
              description: "Expense not found.",
              content: { "application/json": { schema: jsonSchema(errorSchema) } },
            },
            ...authErrors,
          },
        },
      },
      "/api/v1/households/{id}/expenses/{eid}/confirm": {
        post: {
          summary: "Confirm a DRAFT expense and compute member shares",
          description:
            "Optionally send the reviewed receipt; it replaces the stored items and taxes. Items plus taxes must equal totalCents and there must be at least one item, otherwise the expense stays DRAFT.",
          parameters: [idParam, eidParam],
          requestBody: {
            required: false,
            content: { "application/json": { schema: jsonSchema(draftEditsBody) } },
          },
          responses: {
            "200": {
              description: "Confirmed expense with its shares.",
              content: { "application/json": { schema: jsonSchema(expenseRecordSchema) } },
            },
            "400": {
              description: "No items, or items plus taxes do not equal the total; the expense stays DRAFT.",
              content: { "application/json": { schema: jsonSchema(errorSchema) } },
            },
            "404": {
              description: "Expense not found in this household.",
              content: { "application/json": { schema: jsonSchema(errorSchema) } },
            },
            "409": {
              description: "The expense is already confirmed.",
              content: { "application/json": { schema: jsonSchema(errorSchema) } },
            },
            ...authErrors,
          },
        },
      },
      "/api/v1/households/{id}/receipts/scan": {
        post: {
          summary: "Scan a receipt image into a DRAFT itemized expense (the image is not stored)",
          description:
            "Accepts a jpg, png, heic or webp image up to 10 MB. Gemini's reply becomes a DRAFT with every member ticked on every item; a reply that fails validation becomes an empty DRAFT with `scanError`. Drafts do not affect balances.",
          parameters: [idParam],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: { file: { type: "string", format: "binary" } },
                  required: ["file"],
                },
              },
              "application/json": { schema: jsonSchema(scanReceiptJsonBody) },
            },
          },
          responses: {
            "201": {
              description: "Created DRAFT expense (empty with scanError if the scan could not be read).",
              content: { "application/json": { schema: jsonSchema(expenseRecordSchema) } },
            },
            "400": {
              description: "Missing file, unsupported image type, or larger than 10 MB.",
              content: { "application/json": { schema: jsonSchema(errorSchema) } },
            },
            ...authErrors,
          },
        },
      },
      "/api/v1/households/{id}/balances": {
        get: {
          summary: "Get net balances (in cents) for each household member",
          parameters: [idParam],
          responses: {
            "200": {
              description: "Net balances in member join order.",
              content: { "application/json": { schema: jsonSchema(z.array(balanceSchema)) } },
            },
            ...authErrors,
          },
        },
      },
      "/api/v1/households/{id}/version": {
        get: {
          summary: "Get the household's change counter for real-time polling",
          description:
            "Increases with every expense create, edit, delete or confirm and every recorded settlement. Clients without Pusher poll it every 2 seconds and refresh when it changes.",
          parameters: [idParam],
          responses: {
            "200": {
              description: "Current change counter.",
              content: { "application/json": { schema: jsonSchema(householdVersionSchema) } },
            },
            ...authErrors,
          },
        },
      },
      "/api/v1/households/{id}/settlement-plan": {
        get: {
          summary: "Get the greedy settlement plan (at most n-1 transfers)",
          parameters: [idParam],
          responses: {
            "200": {
              description: "Recommended transfers to settle all balances.",
              content: { "application/json": { schema: jsonSchema(z.array(transferSchema)) } },
            },
            ...authErrors,
          },
        },
      },
      "/api/v1/households/{id}/settlements": {
        post: {
          summary: "Record a completed transfer between two members",
          parameters: [idParam],
          requestBody: {
            required: true,
            content: { "application/json": { schema: jsonSchema(recordSettlementBody) } },
          },
          responses: {
            "201": {
              description: "Recorded settlement transfer.",
              content: { "application/json": { schema: jsonSchema(settlementRecordSchema) } },
            },
            "400": {
              description: "Invalid settlement transfer.",
              content: { "application/json": { schema: jsonSchema(errorSchema) } },
            },
            ...authErrors,
          },
        },
      },
    },
  };
}
