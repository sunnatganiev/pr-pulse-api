<!--
  Custom Command: /debug-prod
  Purpose: Debug a production issue using the bug-fix-in-production pattern
  Created: Session 3
  Used by: All bug reports from QA, production incidents
  Pattern: Based on Image 4 from ByteByteAI roadmap

  Usage:
    /debug-prod <bug report with stack trace>

  Example:
    /debug-prod Issue #007 — PR list 500 error.
    Stack: prs.service.ts:47 "Cannot read property 'username' of undefined"
    ~30% of users affected. Started 2025-04-15 after deploy abc123.
-->

Debug a production issue following the rigorous **bug-fix-in-production pattern**.

## Steps (do these in order, do not skip)

### 1. Understand the bug

Read the bug report carefully. Extract:
- **Symptom** — what does the user see?
- **Stack trace** — exact file:line if provided
- **Reproduction** — when does it happen?
- **Impact** — how many users? how often?
- **Timeline** — when did it start?

Bug report: $ARGUMENTS

### 2. Locate the code

Use @ mentions to read relevant files. Start narrow:
- The file in the stack trace
- The function in the stack trace
- Direct callers (1 level up)

Avoid reading the whole codebase. Surgical precision.

### 3. Write a failing test FIRST

Before fixing, **reproduce the bug as a test**:
- Unit test if logic-level bug
- E2E test if integration-level bug
- The test must FAIL for the current (buggy) code

Run the test and confirm it fails. **Show the failure output.**

### 4. Identify ROOT cause

Don't fix symptoms. Ask:
- Why does this happen?
- What invariant was violated?
- Is this a one-off or a class of bugs?

Document the root cause in 1-2 sentences before patching.

### 5. Write minimal patch

The fix should be:
- **Minimal** — change as little as possible
- **Targeted** — addresses root cause, not symptom
- **Safe** — does not introduce new behavior

Show the diff.

### 6. Verify

- The failing test now PASSES
- Other tests still PASS
- Manual test (if applicable) — describe steps

### 7. Write postmortem

Save to `docs/postmortems/<issue-number>-<slug>.md`:

```markdown
# Postmortem: <title>

**Issue:** #<number>
**Severity:** P0 / P1 / P2
**Affected:** N users / N% / etc.
**Detected:** YYYY-MM-DD
**Resolved:** YYYY-MM-DD

## What happened

[1-2 paragraphs, user-facing description]

## Root cause

[Technical, specific. Not "code was wrong" — what invariant broke?]

## How we missed it

- Tests: what coverage was missing?
- Review: what review caught/missed it?
- Monitoring: did alerts fire?

## Fix

[Brief description + commit reference]

## Prevention

[Concrete actions to prevent class of bugs:]
- New test patterns to add
- ESLint/CI rules
- Documentation updates
- Process changes
```

### 8. Commit

Use this format:

```
fix(<scope>): <one-line summary>

<body explaining what and why, not how>

Closes #<issue-number>

Co-authored-by: Claude <noreply@anthropic.com>
```

---

**Important:** Do not skip steps. The discipline IS the value. Quick fixes without
tests and postmortems cause the same bug to come back in 6 months.
