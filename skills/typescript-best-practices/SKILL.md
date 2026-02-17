---
name: typescript-best-practices
description: Expert guidance on TypeScript, Node.js, and React best practices for writing high-quality, type-safe code. Use when the user asks about TypeScript best practices, code quality, type safety, testing patterns, or needs help improving their TypeScript code. Triggers: "TypeScript best practices", "improve my TypeScript", "type safety tips", "TypeScript guidelines", "better TypeScript code".
license: MIT
metadata:
  author: kota
  version: "0.1.0"
---

# TypeScript Best Practices

Provide expert guidance on writing high-quality TypeScript, Node.js, and React code. Apply the best practices defined in [references/best-practices.md](references/best-practices.md) to help users write maintainable, type-safe, and well-tested code.

## When To Use

- "What are TypeScript best practices?"
- "How can I improve my TypeScript code?"
- "Help me write better TypeScript"
- "TypeScript type safety guidelines"
- "Show me best practices for this code"
- "Review my TypeScript code for quality"

## How It Works

1. **Understand the context** – Read the user's code or question to understand what they're working on
2. **Apply best practices** – Reference [references/best-practices.md](references/best-practices.md) for guidelines on:
   - TypeScript type safety (zero casting, explicit types, Zod validation)
   - Testing requirements (coverage, edge cases, co-location)
   - Flow and integration patterns (routes, API contracts, forms)
   - Code quality and architecture (SOLID, DRY, performance, security)
3. **Provide specific guidance** – Give actionable recommendations with code examples
4. **Explain the "why"** – Help users understand the reasoning behind best practices

## Guidance approach

- Focus on the most impactful improvements first
- Provide concrete code examples showing before/after
- Explain trade-offs when multiple approaches exist
- Link concepts to the best practices reference document
- Be constructive and educational, not prescriptive
- Acknowledge when code already follows good patterns

## Structure your response

When reviewing code or answering questions, organize feedback by category:

1. **Type Safety** – Issues with casting, implicit any, type guards, Zod validation
2. **Testing** – Coverage gaps, missing edge cases, test quality
3. **Architecture** – SOLID principles, separation of concerns, maintainability
4. **Performance** – Re-renders, memoization, algorithmic efficiency
5. **Error Handling** – User-facing messages, graceful degradation
6. **Security** – XSS risks, data validation, secrets management

## Examples

**Example 1: User asks "How should I handle API responses in TypeScript?"**

Response approach:
- Recommend Zod schemas for runtime validation
- Show how to use `z.infer<typeof schema>` for types
- Demonstrate proper error handling patterns
- Explain why this is safer than type assertions

**Example 2: User shows code with `as any` casting**

Response approach:
- Explain the risks of type casting
- Suggest Zod `safeParse` or explicit type guards instead
- Provide a refactored example
- Reference the zero-casting principle from best practices

**Example 3: User asks "Do I need tests for this component?"**

Response approach:
- Explain testing requirements from best practices
- Identify what behaviors should be tested
- Suggest edge cases and failure paths to cover
- Show example test patterns following project conventions
