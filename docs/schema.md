# Database schema

Every model in [`prisma/schema.prisma`](../prisma/schema.prisma). Money columns are integer cents
(`*Cents`); `Expense.date` is a `YYYY-MM-DD` string. Deleting a user or household cascades to the rows
that reference it.

```mermaid
erDiagram
  User ||--o{ Session : "signs in with"
  User ||--o{ Account : "has"
  User ||--o{ Membership : "belongs via"
  Household ||--o{ Membership : "has"
  Household ||--o{ Expense : "records"
  Household ||--o{ Settlement : "records"
  User ||--o{ Expense : "paid (payerId)"
  Expense ||--o{ ExpenseItem : "lists"
  Expense ||--o{ ExpenseTax : "carries"
  Expense ||--o{ ExpenseWeight : "weights (RATIO)"
  Expense ||--o{ ExpenseShare : "splits into"
  ExpenseItem ||--o{ ItemParticipant : "shared by"
  User ||--o{ ItemParticipant : "shares"
  User ||--o{ ExpenseWeight : "weighted"
  User ||--o{ ExpenseShare : "owes"
  User ||--o{ Settlement : "pays (fromUserId)"
  User ||--o{ Settlement : "receives (toUserId)"
  User ||--o{ ApiToken : "owns"

  User {
    String id PK
    String name
    String email UK
    Boolean emailVerified
    String image
    DateTime createdAt
    DateTime updatedAt
  }
  Session {
    String id PK
    String token UK
    DateTime expiresAt
    String ipAddress
    String userAgent
    String userId FK
    DateTime createdAt
    DateTime updatedAt
  }
  Account {
    String id PK
    String accountId
    String providerId
    String userId FK
    String accessToken
    String refreshToken
    String idToken
    DateTime accessTokenExpiresAt
    DateTime refreshTokenExpiresAt
    String scope
    String password
    DateTime createdAt
    DateTime updatedAt
  }
  Verification {
    String id PK
    String identifier
    String value
    DateTime expiresAt
    DateTime createdAt
    DateTime updatedAt
  }
  Household {
    String id PK
    String name
    String inviteCode UK
    DateTime createdAt
    Int version
  }
  Membership {
    String userId PK, FK
    String householdId PK, FK
    Role role "OWNER | MEMBER"
    DateTime joinedAt
  }
  Expense {
    String id PK
    String householdId FK
    String payerId FK
    String merchant
    String date
    Int totalCents
    SplitMode splitMode "EQUAL | RATIO | ITEMIZED"
    ExpenseStatus status "DRAFT | CONFIRMED"
    String scanError
    DateTime createdAt
  }
  ExpenseItem {
    String id PK
    String expenseId FK
    String name
    Int priceCents
    String[] taxCodes
    Int sortOrder
  }
  ItemParticipant {
    String itemId PK, FK
    String userId PK, FK
  }
  ExpenseTax {
    String id PK
    String expenseId FK
    String code
    Int amountCents
    Int sortOrder
  }
  ExpenseWeight {
    String expenseId PK, FK
    String userId PK, FK
    Int weight
  }
  ExpenseShare {
    String expenseId PK, FK
    String userId PK, FK
    Int amountCents
  }
  Settlement {
    String id PK
    String householdId FK
    String fromUserId FK
    String toUserId FK
    Int amountCents
    DateTime paidAt
  }
  ApiToken {
    String id PK
    String userId FK
    String name
    String tokenHash UK
    DateTime lastUsedAt
    DateTime createdAt
  }
```

| Model | Purpose |
|---|---|
| `User`, `Session`, `Account`, `Verification` | Better Auth tables (#3). `Account.password` holds the hashed test-login password. |
| `Household`, `Membership` | A household and its members (#4). `joinedAt` orders members for split rounding; `version` is bumped on every balance-changing write so clients know when to refresh (#11). |
| `Expense` | One expense (#6). A scanned receipt starts as `DRAFT` (with `scanError` if the scan failed) and counts toward balances only once `CONFIRMED` (#9, #10). |
| `ExpenseItem`, `ItemParticipant`, `ExpenseTax` | Itemized lines, who shared each line, and the tax lines the items' `taxCodes` refer to. |
| `ExpenseWeight` | Per-member weights for `RATIO` splits. |
| `ExpenseShare` | Each member's computed share of a confirmed expense; balances are built from these and `Settlement`. |
| `Settlement` | A recorded transfer between two members (#7). |
| `ApiToken` | A personal API token (#13); only the SHA-256 hex of the token is stored. |
