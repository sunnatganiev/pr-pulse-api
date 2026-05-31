<!--
  Custom Command: /explore
  Purpose: Explore an unfamiliar module or file and explain its architecture
  Created: Session 3
  Used by: Onboarding, code review, before refactoring
-->

Explore the specified file or module and explain its architecture in a structured way.

## Steps

1. **Read all relevant files** — use @ mentions to load context
   - If $ARGUMENTS is a folder, read all .ts files inside
   - If a file, read the file plus its direct dependencies

2. **Identify main responsibilities**
   - What does this code do?
   - What are the entry points (controllers, exported functions)?
   - What state does it manage?

3. **Map the dependency graph**
   - Internal dependencies (other modules in the project)
   - External dependencies (npm packages)
   - Database tables touched (if any)

4. **Highlight non-obvious patterns or decisions**
   - Domain-specific logic
   - Performance optimizations
   - Security considerations
   - Anti-patterns to be aware of

5. **Note potential issues or improvements**
   - Missing error handling
   - Missing tests
   - YAGNI violations
   - Inconsistencies with project CLAUDE.md

## Output format

End with a summary table:

| Element | Purpose | Notes |
|---------|---------|-------|

Keep the overall response concise — 1-2 pages max. Use markdown.

**Target:** $ARGUMENTS
