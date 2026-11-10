# TDD, Git & Pull Request Rules

<tdd_workflow>
## 1. Strict Red → Green → Refactor Commits
Graders inspect `git log` to verify failing tests were committed **before** implementation code on every feature and bug-fix branch.

| Step | Commit Format | Allowed Contents | Verification Gate |
|---|---|---|---|
| **1. Red** | `test(<scope>): <rule> (#<n>)` | **ONLY** new/changed tests (`tests/`, `e2e/`), fixtures, and 3-line `501` route stubs | Run the test, confirm it fails on an assertion, and paste the failure line in the commit body |
| **2. Green** | `feat(<scope>): <summary> (#<n>)` or `fix(...)` | Minimal implementation, Prisma migration, OpenAPI registration, UI | All unit, integration, and E2E tests pass |
| **3. Refactor** | `refactor(<scope>): <summary> (#<n>)` | Cleanup with zero behavior change | All tests pass |

- Never combine tests and implementation in the same commit.
- Never delete or weaken an existing test to make a change pass.
</tdd_workflow>

<git_and_pr_workflow>
## 2. Branches, Commits & Pull Requests
- **Start with the spec:** Run `gh issue view <n>` and read `docs/PLAN.md` before coding.
- **Branch naming:** `<type>/<issue-number>-<short-kebab-description>` (`feature/6-itemized-expenses`, `chore/8-openapi-docs`).
- **Conventional Commits:** `<type>(<scope>): <imperative summary, ≤ 72 chars> (#<issue>)`
  - `type`: `test`, `feat`, `fix`, `refactor`, `docs`, `chore`, `ci`, `style`
  - `scope`: `split`, `receipt`, `expenses`, `households`, `balances`, `auth`, `api`, `ui`, `db`, `ci`, `docs`
- **Pull request body:** Start with `Closes #<issue>`, copy the issue's acceptance-criteria checkboxes with matching test names ticked, and paste unit/integration/E2E pass counts.
- **Cross-partner review & merge:** The partner who did not author the PR reviews and approves (`gh pr review <pr> --approve`). Always merge with **Create a merge commit** (`gh pr merge <pr> --merge`) — **never squash merge**, because squash collapses the Red and Green commits into one.
</git_and_pr_workflow>

<output_contract>
## 3. Final Task Report Template
End every task report with this filled-in block:

```text
Issue: #<n> — read with gh | could not read; assumed AC: …
Branch: <name>   Red commit: <sha + subject>   Green commit: <sha + subject>
Tests: unit <pass/fail>, integration <pass/fail>, e2e <pass/fail>
AC:  - [x] <criterion> — <test name>
     - [ ] <criterion> — not done, because …
Not done / open questions: …
```
</output_contract>
