<!--
  Custom Command: /review-changes
  Purpose: Review staged git changes before commit/PR
  Created: Session 3
  Used by: Pre-commit review, PR self-review
-->

Review the currently staged changes (`git diff --staged`) like a senior engineer would.

## Steps

1. **Read the staged diff**
   - Run `git diff --staged` to see what's about to be committed
   - Read each changed file in full (not just the diff) for context

2. **Check against project conventions**
   - Read @CLAUDE.md (and any relevant nested CLAUDE.md)
   - Verify code follows documented rules

3. **Look for these issue categories**

   **Security:**
   - Secrets, tokens, API keys in code
   - SQL injection / unsanitized input
   - Missing authentication / authorization
   - XSS vulnerabilities
   - Insecure cookie settings

   **Anti-patterns:**
   - `any` casts (TypeScript)
   - Silent failure (catch blocks that hide errors)
   - `console.log` instead of project logger
   - Inline magic strings/numbers
   - Mutation where immutability expected

   **Missing tests:**
   - New function without unit test
   - New endpoint without e2e test
   - Edge cases not covered

   **YAGNI violations:**
   - Generic interfaces with one implementation
   - Premature optimization
   - Unused abstractions
   - "We might need this later" code

   **Inconsistencies:**
   - Different style from neighboring files
   - Naming conventions mismatch
   - Wrong layer (logic in controller, etc.)

4. **Provide actionable feedback**
   - For each issue: file path + line number + suggestion
   - Differentiate must-fix (BLOCKERS) from nice-to-have (NITS)

5. **End with a verdict**

```
VERDICT: APPROVE | REQUEST CHANGES | BLOCK

Summary:
- N blockers found
- N suggestions
- N nits

Top 3 must-fix items:
1. ...
2. ...
3. ...
```

Be thorough but pragmatic. Focus on real issues, not stylistic preferences.
