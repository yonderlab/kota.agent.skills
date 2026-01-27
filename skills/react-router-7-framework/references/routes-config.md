# Route Configuration (`routes.ts`)

React Router 7 framework mode uses `app/routes.ts` to define your application's routes. This file exports an array of route configurations.

## Basic Setup

```typescript
import type { RouteConfig } from "@react-router/dev/routes";
import { route, index, layout, prefix } from "@react-router/dev/routes";

export default [
  index("./home.tsx"),
  route("about", "./about.tsx"),
  route("products/:id", "./product.tsx"),
] satisfies RouteConfig;
```

## Route Helper Functions

### `index()`

Defines the default child route (renders when parent path matches exactly):

```typescript
index("./home.tsx")
// Matches: /
```

### `route()`

Defines a route with a path pattern and module file:

```typescript
route("about", "./about.tsx")
// Matches: /about

route("products/:id", "./product.tsx")
// Matches: /products/123, /products/abc
```

### `layout()`

Creates a layout route that wraps child routes without adding a URL segment:

```typescript
layout("./auth-layout.tsx", [
  route("login", "./login.tsx"),
  route("register", "./register.tsx"),
])
// Matches: /login, /register (both render inside auth-layout)
```

### `prefix()`

Adds a URL prefix to child routes without creating a parent layout:

```typescript
...prefix("api", [
  route("users", "./api/users.tsx"),
  route("posts", "./api/posts.tsx"),
])
// Matches: /api/users, /api/posts
```

## Nested Routes

Child routes are defined as arrays in the third argument:

```typescript
route("dashboard", "./dashboard.tsx", [
  index("./dashboard/home.tsx"),
  route("settings", "./dashboard/settings.tsx"),
  route("profile", "./dashboard/profile.tsx"),
])
// Matches: /dashboard, /dashboard/settings, /dashboard/profile
```

## Layout Routes with Outlet

Layout routes render an `<Outlet>` where child routes appear:

```typescript
// routes.ts
layout("./layouts/sidebar.tsx", [
  route("dashboard", "./dashboard.tsx"),
  route("settings", "./settings.tsx"),
])
```

```typescript
// layouts/sidebar.tsx
import { Outlet } from "react-router";

export default function SidebarLayout() {
  return (
    <div className="flex">
      <aside>
        <nav>{/* Sidebar navigation */}</nav>
      </aside>
      <main>
        <Outlet /> {/* Child routes render here */}
      </main>
    </div>
  );
}
```

## Outlet with Context

Pass data to child routes via Outlet context:

```typescript
import { Outlet, useOutletContext } from "react-router";

// Parent layout
export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <Outlet context={{ user: loaderData.user }} />
    </div>
  );
}

// Child route
export default function Settings() {
  const { user } = useOutletContext<{ user: User }>();
  return <div>Settings for {user.name}</div>;
}
```

## Dynamic Segments

Use `:param` for dynamic URL segments:

```typescript
route("users/:userId", "./user.tsx")
route("posts/:postId/comments/:commentId", "./comment.tsx")
```

Access params in loaders/components via `Route.LoaderArgs` or `Route.ComponentProps`.

## Optional Segments

Use `?` for optional segments:

```typescript
route(":lang?/about", "./about.tsx")
// Matches: /about, /en/about, /fr/about
```

## Splat (Catch-All) Routes

Use `*` to match any remaining path:

```typescript
route("files/*", "./files.tsx")
// Matches: /files/a, /files/a/b/c
```

Access the splat value:

```typescript
export async function loader({ params }: Route.LoaderArgs) {
  const filepath = params["*"]; // "a/b/c"
  return { filepath };
}
```

## 404 Catch-All Route

Place a catch-all route last to handle unmatched URLs:

```typescript
export default [
  index("./home.tsx"),
  route("about", "./about.tsx"),
  // ... other routes
  route("*", "./not-found.tsx"), // Must be last
] satisfies RouteConfig;
```

```typescript
// not-found.tsx
import { data } from "react-router";

export function loader() {
  throw data(null, { status: 404 });
}

export default function NotFound() {
  return <h1>Page Not Found</h1>;
}
```

## Custom Route IDs

Specify custom IDs for `useRouteLoaderData`:

```typescript
route("products/:id", "./product.tsx", { id: "product-detail" })
```

```typescript
// Access in other components
const data = useRouteLoaderData("product-detail");
```

## Complete Example

```typescript
import type { RouteConfig } from "@react-router/dev/routes";
import { route, index, layout, prefix } from "@react-router/dev/routes";

export default [
  // Home page
  index("./home.tsx"),

  // Static pages
  route("about", "./about.tsx"),
  route("contact", "./contact.tsx"),

  // Auth routes with shared layout
  layout("./auth/layout.tsx", [
    route("login", "./auth/login.tsx"),
    route("register", "./auth/register.tsx"),
    route("forgot-password", "./auth/forgot-password.tsx"),
  ]),

  // Dashboard with nested routes
  route("dashboard", "./dashboard/layout.tsx", [
    index("./dashboard/home.tsx"),
    route("settings", "./dashboard/settings.tsx"),
    route("profile", "./dashboard/profile.tsx"),
  ]),

  // API-style routes with prefix
  ...prefix("products", [
    index("./products/list.tsx"),
    route(":id", "./products/detail.tsx"),
    route(":id/reviews", "./products/reviews.tsx"),
  ]),

  // Catch-all for 404
  route("*", "./not-found.tsx"),
] satisfies RouteConfig;
```
