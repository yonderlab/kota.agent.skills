# Middleware (v7.9.0+)

Middleware allows you to run code before and after route handlers, enabling authentication, logging, context sharing, and more.

## Enable Middleware

Add to `react-router.config.ts`:

```typescript
import type { Config } from "@react-router/dev/config";
import type { Future } from "react-router";

declare module "react-router" {
  interface Future {
    v8_middleware: true;
  }
}

export default {
  future: {
    v8_middleware: true,
  },
} satisfies Config;
```

**Note**: As of v7.9.0+, use `future.v8_middleware: true` (the `unstable_middleware` flag is deprecated).

## Authentication Middleware Pattern

Protect routes with authentication middleware:

```typescript
// app/middleware/auth.ts
import { redirect } from "react-router";
import { createContext } from "react-router";

// Create a typed context for user data
export const userContext = createContext<User>();

export async function authMiddleware({ request, context }) {
  const session = await getSession(request);
  const userId = session.get("userId");

  if (!userId) {
    throw redirect("/login");
  }

  const user = await getUserById(userId);
  context.set(userContext, user);
}
```

## Using Middleware in Routes

```typescript
// app/routes/dashboard.tsx
import type { Route } from "./+types/dashboard";
import { authMiddleware, userContext } from "~/middleware/auth";

// Apply middleware to this route
export const middleware = [authMiddleware] satisfies Route.MiddlewareFunction[];

export async function loader({ context }: Route.LoaderArgs) {
  // User is guaranteed to exist (middleware redirects if not)
  const user = context.get(userContext);
  const dashboardData = await db.getDashboardData(user.id);
  return { user, dashboardData };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h1>Welcome, {loaderData.user.name}</h1>
      {/* Dashboard content */}
    </div>
  );
}
```

## Context API for Data Sharing

Use `context.set()` and `context.get()` to share data:

```typescript
import { createContext } from "react-router";

// Create typed contexts
export const userContext = createContext<User>();
export const settingsContext = createContext<Settings>();

// In middleware
async function setupMiddleware({ context }) {
  const user = await getUser();
  const settings = await getSettings(user.id);

  context.set(userContext, user);
  context.set(settingsContext, settings);
}

// In loader
export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  const settings = context.get(settingsContext);
  return { user, settings };
}
```

## Middleware Execution Order

Middleware executes in a nested chain:
1. **Down** (parent to child): Before response generation
2. **Up** (child to parent): After response generation

```typescript
// app/routes/parent.tsx
export const middleware = [
  async ({ next }) => {
    console.log("Parent middleware - before");
    const response = await next();
    console.log("Parent middleware - after");
    return response;
  },
];

// app/routes/parent.child.tsx
export const middleware = [
  async ({ next }) => {
    console.log("Child middleware - before");
    const response = await next();
    console.log("Child middleware - after");
    return response;
  },
];

// Output:
// Parent middleware - before
// Child middleware - before
// Child middleware - after
// Parent middleware - after
```

## Common Middleware Patterns

**Logging Middleware**:

```typescript
async function loggingMiddleware({ request, next }) {
  const start = Date.now();
  const response = await next();
  const duration = Date.now() - start;
  console.log(`${request.method} ${request.url} - ${duration}ms`);
  return response;
}
```

**Error Handling Middleware**:

```typescript
async function errorMiddleware({ next }) {
  try {
    return await next();
  } catch (error) {
    console.error("Route error:", error);
    await logError(error);
    throw error; // Re-throw to trigger error boundary
  }
}
```

**Role-Based Access Control**:

```typescript
export function requireRole(role: string) {
  return async function roleMiddleware({ context }) {
    const user = context.get(userContext);
    if (!user.roles.includes(role)) {
      throw redirect("/unauthorized");
    }
  };
}

// Usage
export const middleware = [
  authMiddleware,
  requireRole("admin"),
];
```
