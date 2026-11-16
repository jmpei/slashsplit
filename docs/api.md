# Using the SlashSplit API

Every endpoint, with request and response schemas, is documented interactively at
[`/api/docs`](https://slashsplit.vercel.app/api/docs) (Swagger UI) and as OpenAPI 3.1 at
[`/api/openapi.json`](https://slashsplit.vercel.app/api/openapi.json). This guide shows how to get a
token and make your first calls.

## 1. Create a token

1. Sign in at https://slashsplit.vercel.app and open **API tokens** (`/settings/tokens`).
2. Enter a name (for example `Laptop script`) and click **Create token**.
3. Copy the `ss_...` value now. It is shown once; the server keeps only its SHA-256 hash.

Revoke one on the same page; scripts using it then get `401`. Tokens are managed only with the browser
session: a token sent to `/api/v1/tokens` gets `403`, so a leaked token cannot mint a replacement.

## 2. Call the API

Send the token in the `Authorization` header. A token acts as the user who created it, so it reaches
only that user's households.

```bash
export SLASHSPLIT=https://slashsplit.vercel.app
export TOKEN=ss_...   # your token

# Your households
curl -H "Authorization: Bearer $TOKEN" "$SLASHSPLIT/api/v1/households"

# Create one (you become its owner); the response includes its id and invite code
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name": "Maple House"}' "$SLASHSPLIT/api/v1/households"

# Members of a household (their userIds are used in expenses)
curl -H "Authorization: Bearer $TOKEN" "$SLASHSPLIT/api/v1/households/<id>/members"

# Record a $9.00 bill split equally; money is always integer cents
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"payerId": "<userId>", "merchant": "Internet", "date": "2026-11-15", "splitMode": "EQUAL", "totalCents": 900}' \
  "$SLASHSPLIT/api/v1/households/<id>/expenses"

# Net balances and the suggested transfers
curl -H "Authorization: Bearer $TOKEN" "$SLASHSPLIT/api/v1/households/<id>/balances"
curl -H "Authorization: Bearer $TOKEN" "$SLASHSPLIT/api/v1/households/<id>/settlement-plan"
```

## 3. Errors

Errors are JSON `{"error": "..."}`:

| Status | Meaning |
|---|---|
| `400` | The body failed validation (the message names the field). |
| `401` | No session or token, or the token is unknown or revoked. |
| `403` | You are not a member of that household, or a token was sent to a token-management route. |
| `404` | The expense or token does not exist (an unknown household answers `403`). |
