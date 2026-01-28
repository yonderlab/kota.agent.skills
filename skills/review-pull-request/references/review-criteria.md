# PR Review Criteria

Use this checklist when reviewing pull requests. Only comment on actual issues; do not flag code that follows established patterns.

## TypeScript type safety (mandatory)

- **Zero type casting**: Flag any usage of `as`, `as any`, or `as unknown`
- **No implicit any**: Public APIs must have explicit types
- **Proper type guards**: Use Zod `safeParse` or explicit guards, not assertions
- **Schema-first validation**: All runtime validation via Zod with types inferred using `z.infer`
- **Enum handling**: Use Zod enums and import existing enums from the API client
- **Null safety**: Explicit null/undefined handling and narrowings

## Testing requirements (mandatory)

- All new/changed logic must have corresponding tests
- Tests should cover edge cases and expected failure paths
- Co-locate tests and follow existing project patterns
- Flag any missing or superficial test coverage

## Flow and integration analysis

- Breaking changes to routes, loaders, actions or navigation
- Form handling: validation, submission, error states, and progressive enhancement
- API contracts: match backend schemas and response handling

## Code quality and architecture

- SOLID/DRY, separation of concerns, maintainability
- Performance: unnecessary re-renders, missing memoization, inefficient algorithms
- Error handling: user-friendly messages and graceful fallbacks
- Security: XSS, unsafe data handling, exposed secrets

## Avoid

- Blocking the PR unless a critical issue exists (e.g. security vulnerability)
- Comments that do not adhere to the project's coding standards
- Comments that do not follow TypeScript/React/Node.js best practices
- Comments that do not provide actionable feedback
- Flagging code clearly marked with TODO/FIXME unless it introduces an immediate severe defect
- Generic or vague comments
- Requesting refactors or changes unrelated to this pull request
- Making assumptions about code without understanding the full context
- Commenting on code that is working correctly or follows established patterns
