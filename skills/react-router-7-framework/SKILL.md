---
name: react-router-7-framework
description: Apply React Router 7 framework mode best practices including server-first data fetching, type-safe loaders/actions, proper hydration strategies, middleware authentication, handle metadata, useMatches/useRouteLoaderData hooks, and maximum type safety. Use when working with React Router 7 framework mode, implementing loaders, actions, route protection, breadcrumbs, or building SSR applications.
version: 1.0.0
author: kota
tags:
  - react-router
  - react-router-7
  - typescript
  - ssr
  - data-loading
  - type-safety
  - framework-mode
  - middleware
  - authentication
requirements:
  tools:
    - node
    - npm
---

# React Router 7 Framework Mode Best Practices

Apply React Router 7 framework mode patterns emphasizing server-first data fetching, maximum type safety, and proper use of loaders, actions, and utilities.

## When To Use

Use this skill when:

- Setting up or working with React Router 7 in framework mode
- Implementing data loaders or actions
- Adding type safety to route modules
- Deciding between server-side and client-side data fetching
- Implementing mutations with actions
- Optimizing hydration strategies
- Working with SSR or pre-rendering in React Router 7
- Streaming non-critical data with promises and skeleton UI
- Managing URL state with search params (filtering, pagination, search)
- Accessing parent route data with useRouteLoaderData
- Building breadcrumbs or navigation with useMatches and handle
- Implementing authentication or route protection with middleware
- Sharing data between middleware and loaders with context API
- Adding route metadata for breadcrumbs, titles, or analytics

## Version Compatibility

This skill targets **React Router 7.9.0+** in framework mode. Key features by version:

| Version | Features |
|---------|----------|
| v7.0 | Framework mode, type generation, loaders/actions, `Route.*` types |
| v7.5 | `href()` utility for type-safe links |
| v7.9+ | Stable middleware and context APIs, v8 future flags |

> **Note**: Enable v8 features with `future.v8_middleware: true` and `future.v8_splitRouteModules: true` in your config. These will become the default in v8.

## Core Principles

1. **Server-First**: Fetch and process data on the server whenever possible. Only use client-side data fetching when absolutely necessary.
2. **Maximum Type Safety**: Always use React Router 7's generated types (`Route.LoaderArgs`, `Route.ComponentProps`, etc.). Access loader/action data from props or use `typeof loader`/`typeof action` with hooks.
3. **Proper Hydration**: Understand when to use `clientLoader.hydrate = true` and when to skip it
4. **Declarative Data**: Colocate data requirements with routes using loaders
5. **Progressive Enhancement**: Use actions for mutations with automatic revalidation

## Type Safety

### Generated Types

React Router 7 generates route-specific types in `.react-router/types/+types/<route-file>.d.ts` for each route. Always import and use these types:

```typescript
import type { Route } from "./+types/product";

export async function loader({ params }: Route.LoaderArgs) {
  // params is typed based on your route definition
  const product = await db.getProduct(params.id);
  return { product };
}

export default function Product({ loaderData }: Route.ComponentProps) {
  // loaderData is inferred from loader return type
  return <h1>{loaderData.product.name}</h1>;
}
```

### Available Route Types

- `Route.LoaderArgs` - Types for loader parameters (params, request, context)
- `Route.ActionArgs` - Types for action parameters
- `Route.ClientLoaderArgs` - Types for clientLoader parameters (includes serverLoader)
- `Route.ClientActionArgs` - Types for clientAction parameters (includes serverAction)
- `Route.ComponentProps` - Types for component props (includes loaderData, actionData, matches, etc.)

### Accessing Loader/Action Data

**In route module default exports, always use props** — they provide the best type safety and are the recommended approach in framework mode:

```typescript
import type { Route } from "./+types/product";

export async function loader() {
  return { product: await db.getProduct() };
}

export async function action() {
  return { success: true };
}

// ✅ Props are auto-typed for this specific route
export default function Product({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  return <div>{loaderData.product.name}</div>;
}
```

**When to use hooks instead:**

Hooks (`useLoaderData`, `useActionData`) are for **non-route-module contexts** — deep child components, shared UI, or when testing:

```typescript
// In a child component that doesn't have direct access to route props
import { useLoaderData } from "react-router";

function ProductDetails() {
  // Use typeof for type inference
  const { product } = useLoaderData<typeof import("./route").loader>();
  return <span>{product.description}</span>;
}
```

> **Note**: Hook generics like `useLoaderData<typeof loader>()` exist largely for migration from Remix and are considered secondary to the props pattern. The `Route.*` types via props are the "most type-safe / least foot-gun" approach.

**❌ Never use**: `useLoaderData<Route.ComponentProps["loaderData"]>()` — this pattern is incorrect.

### Type-Safe Links

Use the `href` utility for type-safe route generation (v7.5+):

```typescript
import { href } from "react-router";
import { Link, NavLink } from "react-router";

// Basic usage with params
<Link to={href("/products/:id", { id: "123" })} />

// Optional params
<NavLink to={href("/:lang?/about", { lang: "en" })} />

// No params needed
<Link to={href("/contact")} />

// Programmatic use
const productLink = href("/products/:id", { id: productId });
navigate(productLink);

// Type errors caught at compile time:
href("/not/a/valid/path");         // ❌ Error: Invalid path
href("/blog/:slug", { oops: 1 });  // ❌ Error: Invalid param name
href("/blog/:slug", {});           // ❌ Error: Missing required param
```

**Benefits**:
- Compile-time validation of route paths
- Required params are enforced
- Refactoring routes updates all usages
- IDE autocomplete for available routes

## Data Loading Patterns

### 1. Server-Only Loading (Preferred)

Default pattern - load data on the server, hydrate automatically:

```typescript
import type { Route } from "./+types/products";

export async function loader({ params, request }: Route.LoaderArgs) {
  // Runs on server during SSR and on server during client navigations
  const product = await db.getProduct(params.id);
  return { product };
}

export default function Product({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.product.name}</div>;
}
```

**When to use**: This is the default and preferred pattern. Use unless you have specific client-side requirements.

### 2. Client-Only Loading

Load data exclusively on the client:

```typescript
import type { Route } from "./+types/products";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  // Only runs in the browser
  const res = await fetch(`/api/products/${params.id}`);
  return await res.json();
}

// Required when clientLoader runs during hydration
export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function Product({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.name}</div>;
}
```

**When to use**:
- Accessing browser-only APIs (localStorage, IndexedDB)
- Client-side caching strategies
- No server environment available

**Important**: `clientLoader.hydrate = true` is implicit when no server `loader` exists.

### 3. Combined Server + Client Loading

Augment server data with client data:

```typescript
import type { Route } from "./+types/products";

export async function loader({ params }: Route.LoaderArgs) {
  // Server data (e.g., from database)
  return await db.getProduct(params.id);
}

export async function clientLoader({
  params,
  serverLoader,
}: Route.ClientLoaderArgs) {
  // Get server data + add client data
  const [serverData, clientData] = await Promise.all([
    serverLoader(),
    getClientOnlyData(params.id),
  ]);
  return { ...serverData, ...clientData };
}
clientLoader.hydrate = true as const; // Use 'as const' for proper type inference

export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function Product({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.name}</div>;
}
```

**When to use**:
- Combining server data with client-only data (user preferences, client state)
- Augmenting server data with cached data

**Important**: Set `clientLoader.hydrate = true as const` to call clientLoader during initial hydration.

### 4. Skip Server Hop (BFF Pattern)

Load server data on initial request, then call client API directly:

```typescript
import type { Route } from "./+types/products";

export async function loader({ params }: Route.LoaderArgs) {
  // Server loads data on initial document request
  const product = await db.getProduct(params.id);
  return { product };
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  // Subsequent navigations fetch from API directly (skip server hop)
  const res = await fetch(`/api/products/${params.id}`);
  return await res.json();
}
// clientLoader.hydrate is false (default) - only runs on subsequent navigations

export default function Product({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.product.name}</div>;
}
```

**When to use**:
- Backend-For-Frontend pattern
- Initial SSR data load, then direct API calls
- Authentication/cookies work for both server and client

**Important**: Do NOT set `clientLoader.hydrate = true` for this pattern. You want clientLoader to skip during hydration.

### 5. Client-Side Caching

Cache server data on client for subsequent navigations:

```typescript
import type { Route } from "./+types/products";

let isInitialRequest = true;
const cache = new Map();

export async function loader({ params }: Route.LoaderArgs) {
  return await db.getProduct(params.id);
}

export async function clientLoader({
  params,
  serverLoader,
}: Route.ClientLoaderArgs) {
  const cacheKey = `product-${params.id}`;

  // First request: prime cache
  if (isInitialRequest) {
    isInitialRequest = false;
    const data = await serverLoader();
    cache.set(cacheKey, data);
    return data;
  }

  // Subsequent requests: use cache
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const data = await serverLoader();
  cache.set(cacheKey, data);
  return data;
}
clientLoader.hydrate = true as const;

export default function Product({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.name}</div>;
}
```

**When to use**:
- Optimizing for repeated visits to same routes
- Reducing server round-trips
- Offline-first strategies

## Actions and Mutations

### Server Actions (Preferred)

Handle mutations on the server with automatic revalidation:

```typescript
import type { Route } from "./+types/todos";
import { Form } from "react-router";

export async function loader() {
  // This runs after action completes
  const todos = await db.getTodos();
  return { todos };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const title = formData.get("title");
  await db.createTodo({ title });
  return { success: true };
}

export default function Todos({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <ul>
        {loaderData.todos.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
      <Form method="post">
        <input type="text" name="title" />
        <button type="submit">Add Todo</button>
      </Form>
    </div>
  );
}
```

**Key features**:
- Automatic revalidation of all loaders after action completes
- Type-safe with `Route.ActionArgs`
- Works with `<Form>`, `useFetcher`, and `useSubmit`

### Client Actions

Handle mutations in the browser, optionally calling server action:

```typescript
import type { Route } from "./+types/todos";

export async function action({ request }: Route.ActionArgs) {
  // Server mutation
  const formData = await request.formData();
  await db.createTodo({ title: formData.get("title") });
  return { success: true };
}

export async function clientAction({
  request,
  serverAction,
}: Route.ClientActionArgs) {
  // Invalidate client cache first
  clientCache.invalidate();

  // Optionally call server action
  const result = await serverAction();
  return result;
}

export default function Todos({ loaderData }: Route.ComponentProps) {
  return <Form method="post">{/* form fields */}</Form>;
}
```

**When to use**:
- Need to invalidate client caches before server mutation
- Optimistic UI updates
- Client-side validation before server call

### The `data()` Utility

Use `data()` to return responses with custom status codes and headers from loaders and actions:

```typescript
import { data } from "react-router";
import type { Route } from "./+types/item";

// Return with custom status and headers
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const item = await createItem(formData);

  return data(item, {
    status: 201,
    headers: { "X-Custom-Header": "value" },
  });
}

// Throw 404 to trigger ErrorBoundary
export async function loader({ params }: Route.LoaderArgs) {
  const project = await db.getProject(params.id);

  if (!project) {
    throw data(null, { status: 404 });
  }

  return { project };
}
```

**Common status codes**:
- `201` - Resource created (after successful POST)
- `400` - Bad request (validation errors)
- `404` - Not found (missing resource)
- `403` - Forbidden (unauthorized access)

**Thrown vs returned**:
- `throw data(...)` - Triggers `ErrorBoundary`, stops execution
- `return data(...)` - Returns response, continues rendering

## Route Module Exports

Beyond `loader`, `action`, and the default component, route modules can export additional functions for metadata, headers, and revalidation control.

### meta

Export page metadata (title, description, og tags):

```typescript
import type { Route } from "./+types/product";

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: data.product.name },
    { name: "description", content: data.product.description },
    { property: "og:title", content: data.product.name },
  ];
}
```

### links

Export link tags (stylesheets, preloads, favicons):

```typescript
import type { Route } from "./+types/product";

export function links() {
  return [
    { rel: "stylesheet", href: "/styles/product.css" },
    { rel: "preload", href: "/fonts/brand.woff2", as: "font", type: "font/woff2" },
  ];
}
```

### headers

Control HTTP response headers:

```typescript
import type { Route } from "./+types/product";

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "max-age=300",
    "X-Custom-Header": "value",
  };
}
```

### shouldRevalidate

Control when loaders re-run (optimize performance):

```typescript
import type { Route } from "./+types/products";

export function shouldRevalidate({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: Route.ShouldRevalidateArgs) {
  // Don't revalidate if only search params changed
  if (currentUrl.pathname === nextUrl.pathname) {
    return false;
  }

  return defaultShouldRevalidate;
}
```

**Use cases for `shouldRevalidate`**:
- Skip revalidation when navigating within the same route
- Prevent unnecessary refetches after certain actions
- Optimize performance for expensive loaders

### ErrorBoundary

Handle errors that occur during loading or rendering:

```typescript
import { isRouteErrorResponse, useRouteError } from "react-router";

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>{error.status} {error.statusText}</h1>
        <p>{error.data}</p>
      </div>
    );
  }

  return <div>Something went wrong</div>;
}
```

## Server-Only Modules

Use `.server` and `.client` module conventions to prevent accidentally bundling server-only code (secrets, database clients) into the client bundle.

### .server Modules

Files ending in `.server.ts` or in a `.server/` directory are **never bundled into the client**:

```
app/
├── utils/
│   ├── db.server.ts      # Server-only: database client
│   ├── auth.server.ts    # Server-only: auth logic with secrets
│   └── format.ts         # Shared: safe for client and server
└── .server/
    └── secrets.ts        # Server-only: environment secrets
```

```typescript
// app/utils/db.server.ts
import { PrismaClient } from "@prisma/client";

// This code never reaches the client bundle
export const db = new PrismaClient();
```

```typescript
// app/routes/products.tsx
import { db } from "~/utils/db.server"; // Safe: only used in loader

export async function loader() {
  const products = await db.product.findMany();
  return { products };
}
```

### .client Modules

Files ending in `.client.ts` or in a `.client/` directory are **never bundled into the server**:

```typescript
// app/utils/analytics.client.ts
// Browser-only code (window, document, etc.)
export function trackPageView(path: string) {
  window.gtag?.("event", "page_view", { page_path: path });
}
```

### Why This Matters

- **Security**: Secrets and credentials stay on the server
- **Bundle size**: Server-only code doesn't bloat client bundles
- **Compatibility**: Browser-incompatible code (Node APIs, database clients) won't break the client build

> **Rule of thumb**: If a module imports secrets, database clients, or Node-only APIs, name it `.server.ts`.

## Useful Utilities and Hooks

### useFetcher

Submit forms and load data without navigation:

```typescript
import { useFetcher } from "react-router";

function TodoItem({ todo }) {
  const fetcher = useFetcher();
  const isDeleting = fetcher.state === "submitting";

  return (
    <div>
      <span>{todo.title}</span>
      <fetcher.Form method="post" action={`/todos/${todo.id}/delete`}>
        <button disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </fetcher.Form>
    </div>
  );
}
```

**States**: `"idle" | "submitting" | "loading"`
**Access data**: `fetcher.data` (from loader/action)
**Methods**: `fetcher.submit()`, `fetcher.load()`

### useNavigation

Track global navigation state:

```typescript
import { useNavigation } from "react-router";

function GlobalLoadingIndicator() {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  return isNavigating ? <LoadingSpinner /> : null;
}
```

**States**: `"idle" | "loading" | "submitting"`

### useActionData

Access data returned from the most recent action. **In route modules, prefer `actionData` from props** (see "Accessing Loader/Action Data" above).

Use `useActionData` in **deep child components**:

```typescript
import { useActionData, Form } from "react-router";

function LoginForm() {
  const actionData = useActionData<typeof import("../route").action>();

  return (
    <Form method="post">
      {actionData?.error && <div>{actionData.error}</div>}
      <input type="email" name="email" />
      <button type="submit">Login</button>
    </Form>
  );
}
```

**Note**: `actionData` is undefined until an action has been called

### useLoaderData

Access the current route's loader data. **In route modules, prefer `loaderData` from props** (see "Accessing Loader/Action Data" above).

Use `useLoaderData` in **deep child components** that don't have direct access to route props:

```typescript
import { useLoaderData } from "react-router";

// In a child component, not the route module default export
function ProductCard() {
  const { products } = useLoaderData<typeof import("../route").loader>();
  return <div>{products[0].name}</div>;
}
```

**Important**:
- `useLoaderData` assumes the loader succeeded
- Cannot be used in `ErrorBoundary` or `Layout` components — use `useRouteLoaderData` for those cases
- Never use `useLoaderData<Route.ComponentProps["loaderData"]>()` — this is incorrect

### useRouteLoaderData

Access loader data from parent or sibling routes by route ID. Essential for `ErrorBoundary` and `Layout` components where `useLoaderData` is not allowed.

**Type-safe pattern with `typeof`**:

```typescript
import { useRouteLoaderData } from "react-router";
import type { loader as rootLoader } from "./root";

export function Layout({ children }) {
  // Type-safe: infers types from root loader
  const rootData = useRouteLoaderData<typeof rootLoader>("root");

  // Always check for undefined (loader may have thrown)
  if (rootData?.user) {
    return <div>Welcome, {rootData.user.name}</div>;
  }

  return <div>Not authenticated</div>;
}
```

**Basic usage (untyped)**:

```typescript
import { useRouteLoaderData } from "react-router";

export default function ChildComponent() {
  const rootData = useRouteLoaderData("root");

  if (rootData?.user) {
    return <div>Welcome, {rootData.user.name}</div>;
  }

  return <div>Not authenticated</div>;
}
```

**When to use**:
- Accessing parent route data (e.g., user auth from root loader)
- Sharing data across route hierarchy
- In `ErrorBoundary` or `Layout` components where `useLoaderData` is not allowed

**Route IDs**: Automatically generated from file paths:
- `app/root.tsx` → `"root"`
- `app/routes/products.tsx` → `"routes/products"`
- `app/routes/products.$id.tsx` → `"routes/products.$id"`

You can also specify custom IDs in `routes.ts`:

```typescript
import { route } from "@react-router/dev/routes";

export default [
  route("/products/:id", "./product.tsx", { id: "product-detail" }),
];
```

### useMatches

Access all matched routes and their data/handles:

```typescript
import { useMatches } from "react-router";

export function Layout({ children }) {
  const matches = useMatches();

  // Access all matched routes
  matches.forEach((match) => {
    console.log(match.id);           // Route ID
    console.log(match.pathname);     // URL pathname
    console.log(match.params);       // URL params
    console.log(match.loaderData);   // Loader data (may be undefined)
    console.log(match.handle);       // Custom handle metadata
  });

  return <div>{children}</div>;
}
```

> **Note**: Use `match.loaderData` instead of `match.data`. The `data` property is deprecated.

**Common use cases**:
- Building breadcrumbs from route hierarchy
- Creating dynamic navigation based on current route
- Accessing metadata from all matched routes

**Type safety with UIMatch**:

```typescript
import { useMatches, type UIMatch } from "react-router";

const matches = useMatches();
const rootMatch = matches[0] as UIMatch<{ user: User } | undefined>;

// Guard against undefined loaderData (loader may have thrown)
if (rootMatch.loaderData?.user) {
  const { user } = rootMatch.loaderData;
}
```

### Form Component

Use React Router's `Form` for enhanced form handling:

```typescript
import { Form } from "react-router";

<Form method="post" action="/todos">
  <input name="title" />
  <button type="submit">Create</button>
</Form>

// With navigate={false} to prevent navigation after action
<Form method="post" navigate={false}>
  {/* ... */}
</Form>
```

## URL Search Params (Query Parameters)

Search params (query parameters) are the values after `?` in a URL. They're ideal for storing UI state that should be shareable, bookmarkable, and persistent across reloads.

### When to Use Search Params

Use search params for:
- **Filtering and sorting**: Product filters, table sorting
- **Pagination**: Page numbers, page size
- **Search queries**: Search terms, autocomplete
- **View state**: Active tab, selected item, modal state
- **Shareable state**: Any state that makes the URL meaningful when shared

**Don't use search params for**:
- Sensitive data (credentials, tokens)
- Large amounts of data (use loaders instead)
- Temporary UI state (modals, tooltips - use component state)

### useSearchParams Hook

Read and update search params on the client:

```typescript
import { useSearchParams } from "react-router";

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read params
  const category = searchParams.get("category") || "all";
  const sort = searchParams.get("sort") || "name";
  const page = parseInt(searchParams.get("page") || "1", 10);

  // Update params
  const handleCategoryChange = (newCategory: string) => {
    setSearchParams((prev) => {
      prev.set("category", newCategory);
      prev.set("page", "1"); // Reset page when filter changes
      return prev;
    });
  };

  return (
    <div>
      <select value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
        <option value="all">All</option>
        <option value="electronics">Electronics</option>
        <option value="books">Books</option>
      </select>
      {/* Product list */}
    </div>
  );
}
```

### Reading Search Params in Loaders (Server-Side)

Access search params in loaders to fetch filtered data server-side:

```typescript
import type { Route } from "./+types/products";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Extract params
  const category = searchParams.get("category") || "all";
  const sort = searchParams.get("sort") || "name";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const query = searchParams.get("q") || "";

  // Fetch filtered data
  const products = await db.getProducts({
    category: category !== "all" ? category : undefined,
    sort,
    page,
    query,
  });

  return { products, category, sort, page, query };
}

export default function Products({ loaderData }: Route.ComponentProps) {
  const { products, query } = loaderData;

  return (
    <div>
      <Form role="search">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search products..."
        />
        <button type="submit">Search</button>
      </Form>
      <ProductGrid products={products} />
    </div>
  );
}
```

**Key pattern**: Return search param values from the loader so you can use them as `defaultValue` in form inputs. This keeps the form in sync with the URL on page refresh.

### Updating Search Params

Multiple ways to set search params:

```typescript
const [searchParams, setSearchParams] = useSearchParams();

// 1. String
setSearchParams("?category=books&sort=price");

// 2. Object (most common)
setSearchParams({ category: "books", sort: "price" });

// 3. Array values for multiple values
setSearchParams({ tags: ["react", "typescript"] });

// 4. Array of tuples
setSearchParams([["category", "books"], ["sort", "price"]]);

// 5. URLSearchParams object
setSearchParams(new URLSearchParams("?category=books"));

// 6. Functional update (like useState)
setSearchParams((prev) => {
  prev.set("page", "2");
  return prev;
});

// 7. With navigation options
setSearchParams({ category: "books" }, { replace: true }); // Don't add to history
```

### Pagination Pattern

Complete pagination example with search params:

```typescript
import { useSearchParams, Form } from "react-router";
import type { Route } from "./+types/products";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = 20;

  const { products, total } = await db.getProducts({
    page,
    pageSize,
  });

  return {
    products,
    page,
    totalPages: Math.ceil(total / pageSize),
  };
}

export default function Products({ loaderData }: Route.ComponentProps) {
  const { products, page, totalPages } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const goToPage = (newPage: number) => {
    setSearchParams({ page: newPage.toString() });
  };

  return (
    <div>
      <ProductGrid products={products} />
      <div>
        <button
          disabled={page === 1}
          onClick={() => goToPage(page - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page === totalPages}
          onClick={() => goToPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### Filtering with Form Pattern

Use `<Form>` with GET method for automatic search param updates:

```typescript
import { Form } from "react-router";
import type { Route } from "./+types/products";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const minPrice = url.searchParams.get("minPrice");
  const maxPrice = url.searchParams.get("maxPrice");

  const products = await db.getProducts({
    category,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
  });

  return { products, category, minPrice, maxPrice };
}

export default function Products({ loaderData }: Route.ComponentProps) {
  const { products, category, minPrice, maxPrice } = loaderData;

  return (
    <div>
      <Form method="get">
        <select name="category" defaultValue={category || ""}>
          <option value="">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="books">Books</option>
        </select>

        <input
          type="number"
          name="minPrice"
          placeholder="Min Price"
          defaultValue={minPrice || ""}
        />

        <input
          type="number"
          name="maxPrice"
          placeholder="Max Price"
          defaultValue={maxPrice || ""}
        />

        <button type="submit">Filter</button>
      </Form>

      <ProductGrid products={products} />
    </div>
  );
}
```

**Important**: Use `<Form method="get">` (not POST) so form submission updates search params instead of triggering an action.

### Type-Safe Search Params

Validate and parse search params with type guards:

```typescript
import type { Route } from "./+types/products";

// Define allowed values
const SORT_OPTIONS = ["name", "price", "date"] as const;
type SortOption = typeof SORT_OPTIONS[number];

const CATEGORIES = ["all", "electronics", "books", "clothing"] as const;
type Category = typeof CATEGORIES[number];

function parseSort(value: string | null): SortOption {
  if (value && SORT_OPTIONS.includes(value as SortOption)) {
    return value as SortOption;
  }
  return "name"; // Default
}

function parseCategory(value: string | null): Category {
  if (value && CATEGORIES.includes(value as Category)) {
    return value as Category;
  }
  return "all"; // Default
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const sort = parseSort(searchParams.get("sort"));
  const category = parseCategory(searchParams.get("category"));
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  const products = await db.getProducts({ sort, category, page });

  return { products, sort, category, page };
}
```

### Best Practices

1. **URL as Source of Truth**: Always read from search params, don't duplicate in component state
2. **Return Params from Loader**: Return search param values so you can use them as `defaultValue` in forms
3. **Reset Dependent Params**: When changing filters, reset page to 1
4. **Validate and Parse**: Always validate/parse search params with defaults for invalid values
5. **Use GET Forms**: Use `<Form method="get">` for filters - it automatically updates search params
6. **Functional Updates**: Use `setSearchParams((prev) => ...)` when updating multiple params
7. **Type Safety**: Create parse functions with type guards for allowed values
8. **Don't Over-Use**: Not everything belongs in the URL - use component state for temporary UI

### Common Patterns

**Debounced Search Input**:

```typescript
import { useSearchParams } from "react-router";
import { useDebouncedCallback } from "use-debounce";

export default function SearchBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const handleSearch = useDebouncedCallback((value: string) => {
    setSearchParams((prev) => {
      if (value) {
        prev.set("q", value);
      } else {
        prev.delete("q");
      }
      prev.set("page", "1"); // Reset page
      return prev;
    });
  }, 300);

  return (
    <input
      type="search"
      defaultValue={query}
      onChange={(e) => handleSearch(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

**Clear All Filters**:

```typescript
const clearFilters = () => {
  setSearchParams({});
  // Or keep some params:
  // setSearchParams({ page: "1" });
};
```

**Preserve Other Params**:

```typescript
const updateCategory = (category: string) => {
  setSearchParams((prev) => {
    prev.set("category", category);
    prev.set("page", "1");
    // Other params (sort, query) are preserved
    return prev;
  });
};
```

**Programmatic Search with useSubmit**:

```typescript
import { useSubmit } from "react-router";

function SearchBar() {
  const submit = useSubmit();

  const handleSearch = (query: string) => {
    // Submit as GET request to update search params
    submit({ q: query, page: "1" }, { method: "get" });
  };

  return (
    <input
      type="search"
      onChange={(e) => handleSearch(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

Use `useSubmit` when you need to programmatically submit forms or update search params without using a `<Form>` element.

## Route Metadata with handle

Export a `handle` object to attach custom metadata to routes. This metadata is accessible via `useMatches()` in ancestor components.

### Basic handle Export

```typescript
// app/routes/products.tsx
import { Link } from "react-router";

export const handle = {
  breadcrumb: () => <Link to="/products">Products</Link>,
  title: "Products",
  icon: "📦",
};
```

### Dynamic Breadcrumbs Pattern

Use `handle` with `useMatches` to build breadcrumbs:

```typescript
// app/routes/products.$id.tsx
import type { Route } from "./+types/products.$id";

export async function loader({ params }: Route.LoaderArgs) {
  const product = await db.getProduct(params.id);
  return { product };
}

export const handle = {
  breadcrumb: (match: any) => (
    <Link to={`/products/${match.params.id}`}>
      {match.loaderData?.product?.name || "Product"}
    </Link>
  ),
};

export default function Product({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.product.name}</div>;
}
```

### Rendering Breadcrumbs in Layout

```typescript
// app/root.tsx
import { useMatches, Outlet } from "react-router";

export function Layout({ children }) {
  const matches = useMatches();

  return (
    <html>
      <body>
        <nav>
          <ol>
            {matches
              .filter((match) => match.handle?.breadcrumb)
              .map((match, index) => (
                <li key={index}>
                  {match.handle.breadcrumb(match)}
                </li>
              ))}
          </ol>
        </nav>
        {children}
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
```

**Common handle use cases**:
- Breadcrumb navigation
- Page titles and metadata
- Icons for navigation items
- Role-based access control metadata
- Analytics tracking data

## Middleware (v7.9.0+)

Middleware allows you to run code before and after route handlers, enabling authentication, logging, context sharing, and more.

### Enable Middleware

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

**Note**: As of v7.9.0+, use `future.v8_middleware: true` (the `unstable_middleware` flag is deprecated). The `createContext` and `context.set/get` APIs are stable and imported directly from `react-router`.

### Authentication Middleware Pattern

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

### Using Middleware in Routes

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

### Context API for Data Sharing

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

### Middleware Execution Order

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

### Common Middleware Patterns

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

## SSR and Pre-rendering

### Configure SSR

Enable server-side rendering in `react-router.config.ts`:

```typescript
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
} satisfies Config;
```

### Configure Pre-rendering

Generate static HTML at build time:

```typescript
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true, // Can be true or false
  async prerender() {
    return ["/", "/about", "/products", "/contact"];
  },
} satisfies Config;
```

**Static-only mode** (no runtime server):

```typescript
export default {
  ssr: false,
  prerender: true, // Pre-renders all static routes
} satisfies Config;
```

## Async Streaming with Promises

Stream non-critical data to the client progressively while rendering critical data immediately. This improves perceived performance by showing content faster with skeleton UI.

> **Note**: `defer()` is deprecated. Simply return promises directly from your loader without awaiting them. React Router will automatically stream the unresolved promises to the client.

### When to Use Streaming

Use streaming when:
- You have **slow data** that would block page rendering
- Some data is **critical** (needed immediately) and some is **non-critical** (can load later)
- You want to show **skeleton UI** while data loads
- API calls can run in parallel but have different response times

**Don't use streaming for**:
- Small, fast data that loads quickly (< 100ms)
- Data that's always needed before rendering
- Simple CRUD operations where streaming adds complexity

### Basic Pattern

Return promises directly from your loader without awaiting them:

```typescript
import type { Route } from "./+types/dashboard";

export async function loader() {
  // Critical data - await this (blocks rendering)
  const user = await db.getUser();

  // Non-critical data - don't await (streams to client)
  const stats = db.getStats(); // Promise, not awaited
  const activity = db.getRecentActivity(); // Promise, not awaited

  // Return an object containing the promises - they stream automatically
  return {
    user,      // Resolved value
    stats,     // Promise (streams)
    activity,  // Promise (streams)
  };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user, stats, activity } = loaderData;

  return (
    <div>
      {/* Critical data renders immediately */}
      <h1>Welcome, {user.name}!</h1>

      {/* Non-critical data streams with fallback UI */}
      <React.Suspense fallback={<StatsSkeleton />}>
        <Await resolve={stats}>
          {(resolvedStats) => <StatsCard data={resolvedStats} />}
        </Await>
      </React.Suspense>

      <React.Suspense fallback={<ActivitySkeleton />}>
        <Await resolve={activity}>
          {(resolvedActivity) => <ActivityFeed items={resolvedActivity} />}
        </Await>
      </React.Suspense>
    </div>
  );
}
```

> **Important**: You cannot return a single promise directly from a loader. The promises must be wrapped in an object with keys. For example, `return reviews` won't work, but `return { reviews }` will.

### Await Component

The `<Await>` component handles streaming promises with three render patterns:

**Pattern 1: Render function (Recommended)**

```typescript
import { Await } from "react-router";
import { Suspense } from "react";

<Suspense fallback={<ReviewsSkeleton />}>
  <Await resolve={reviewsPromise}>
    {(reviews) => <ReviewsList items={reviews} />}
  </Await>
</Suspense>
```

**Pattern 2: useAsyncValue hook**

```typescript
import { Await, useAsyncValue } from "react-router";

<Suspense fallback={<ReviewsSkeleton />}>
  <Await resolve={reviewsPromise}>
    <ReviewsContent />
  </Await>
</Suspense>

function ReviewsContent() {
  const reviews = useAsyncValue(); // Access resolved value
  return <ReviewsList items={reviews} />;
}
```

**Pattern 3: With error boundary**

```typescript
<Suspense fallback={<ReviewsSkeleton />}>
  <Await
    resolve={reviewsPromise}
    errorElement={<div>Failed to load reviews</div>}
  >
    {(reviews) => <ReviewsList items={reviews} />}
  </Await>
</Suspense>
```

### Error Handling

Use `useAsyncError` to handle rejected promises:

```typescript
import { Await, useAsyncError, useAsyncValue } from "react-router";

<Suspense fallback={<Loading />}>
  <Await resolve={dataPromise}>
    <DataDisplay />
  </Await>
</Suspense>

function DataDisplay() {
  try {
    const data = useAsyncValue();
    return <div>{data.value}</div>;
  } catch {
    const error = useAsyncError();
    return <div>Error: {error.message}</div>;
  }
}
```

Or use `errorElement` prop:

```typescript
<Await
  resolve={dataPromise}
  errorElement={<ErrorDisplay />}
>
  {(data) => <DataDisplay data={data} />}
</Await>

function ErrorDisplay() {
  const error = useAsyncError();
  return <div>Error: {error.message}</div>;
}
```

### Complete Example: Dashboard with Streaming

```typescript
import { Suspense } from "react";
import { Await } from "react-router";
import type { Route } from "./+types/dashboard";

export async function loader() {
  // Critical: User info (fast, blocks render)
  const user = await db.getUser();

  // Non-critical: Stats (slow, streams)
  const stats = fetch("/api/stats").then(r => r.json());

  // Non-critical: Activity (slow, streams)
  const activity = fetch("/api/activity").then(r => r.json());

  // Just return the object - promises stream automatically
  return { user, stats, activity };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user, stats, activity } = loaderData;

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>

      <div className="grid">
        {/* Stats section with skeleton */}
        <Suspense fallback={<StatsSkeleton />}>
          <Await
            resolve={stats}
            errorElement={<StatsError />}
          >
            {(resolvedStats) => (
              <div>
                <h2>Your Stats</h2>
                <p>Posts: {resolvedStats.postCount}</p>
                <p>Views: {resolvedStats.viewCount}</p>
              </div>
            )}
          </Await>
        </Suspense>

        {/* Activity section with skeleton */}
        <Suspense fallback={<ActivitySkeleton />}>
          <Await resolve={activity}>
            <ActivityFeed />
          </Await>
        </Suspense>
      </div>
    </div>
  );
}

function ActivityFeed() {
  const activity = useAsyncValue();
  return (
    <div>
      <h2>Recent Activity</h2>
      <ul>
        {activity.map((item, i) => (
          <li key={i}>{item.description}</li>
        ))}
      </ul>
    </div>
  );
}

function StatsSkeleton() {
  return <div className="skeleton">Loading stats...</div>;
}

function ActivitySkeleton() {
  return <div className="skeleton">Loading activity...</div>;
}

function StatsError() {
  const error = useAsyncError();
  return <div>Failed to load stats: {error.message}</div>;
}
```

### Best Practices

1. **Await Critical Data**: Always await data that's needed for the initial render
2. **Stream Non-Critical**: Return slow or non-essential promises without awaiting to improve perceived performance
3. **Provide Fallbacks**: Always wrap `<Await>` in `<Suspense>` with meaningful fallback UI
4. **Handle Errors**: Use `errorElement` or `useAsyncError` for robust error handling
5. **Keep Promises Unresolved**: Don't await promises in the loader if you want to stream them
6. **Test Loading States**: Verify skeleton UI looks good and error states work correctly
7. **Consider Mobile**: Streaming is especially beneficial on slower connections
8. **Wrap in Objects**: Always return promises within an object, never directly

### When NOT to Use Streaming

- **Fast data** (< 100ms): Just await it, streaming adds unnecessary complexity
- **All data is critical**: If everything blocks rendering anyway, no benefit to streaming
- **Simple pages**: Don't over-engineer simple CRUD operations
- **Sequential dependencies**: If data B depends on data A, you can't stream both effectively

### When Streaming Doesn't Work

Streaming requires SSR. It will **NOT** work in these cases:

- `ssr: false` in config (SPA mode)
- Static pre-rendering
- Client-only routes (no server loader)

In these scenarios, all promises must resolve before the page renders.

### Performance Tips

```typescript
// ✅ Good: Parallel fetching with streaming
export async function loader() {
  const user = await db.getUser();

  // These run in parallel, stream independently
  const stats = db.getStats();
  const activity = db.getActivity();

  return { user, stats, activity };
}

// ❌ Bad: Sequential fetching (slow)
export async function loader() {
  const user = await db.getUser();
  const stats = await db.getStats(); // Waits for user
  const activity = await db.getActivity(); // Waits for stats

  return { user, stats, activity };
}

// ✅ Good: Await critical, stream rest
export async function loader() {
  const [user, product] = await Promise.all([
    db.getUser(),
    db.getProduct()
  ]);

  const reviews = db.getReviews(); // Stream (not awaited)

  return { user, product, reviews };
}
```

## Common Patterns

### Loading States with HydrateFallback

Show loading UI during initial hydration when `clientLoader.hydrate = true`:

```typescript
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const data = await serverLoader();
  return data;
}
clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function Component({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.content}</div>;
}
```

**Important**: `HydrateFallback` cannot render `<Outlet />` as child routes may not be ready.

### Error Handling

Use error boundaries for loader/action errors:

```typescript
import { isRouteErrorResponse, useRouteError } from "react-router";

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>{error.status} {error.statusText}</h1>
        <p>{error.data}</p>
      </div>
    );
  }

  return <div>Something went wrong!</div>;
}
```

### Pending UI with useNavigation

Show pending states during navigation:

```typescript
import { useNavigation } from "react-router";

export default function Products({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  return (
    <div className={isLoading ? "opacity-50" : ""}>
      {loaderData.products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

## Using Context7 for Documentation

When you need up-to-date React Router 7 documentation, use Context7:

```
1. Resolve the library ID:
   mcp__context7__resolve-library-id with libraryName="react-router"

2. Query the docs:
   mcp__context7__query-docs with libraryId="/remix-run/react-router"

3. For website docs:
   mcp__context7__query-docs with libraryId="/websites/reactrouter"
```

This ensures you have the latest API information and examples.

## Decision Tree

```
Do you need to access client-only APIs (localStorage, browser state)?
├─ YES → Use clientLoader (no server loader)
└─ NO  → Continue

Do you need to combine server and client data?
├─ YES → Use loader + clientLoader with hydrate = true
└─ NO  → Continue

Do you want to cache data on the client?
├─ YES → Use loader + clientLoader with caching logic + hydrate = true
└─ NO  → Continue

Do you want to skip server on subsequent navigations?
├─ YES → Use loader + clientLoader (BFF pattern, no hydrate)
└─ NO  → Continue

Do you have slow/non-critical data that blocks rendering?
├─ YES → Return promises without awaiting - wrap with Suspense/Await in component
└─ NO  → Use server-only loader (PREFERRED)
```

## Checklist

Before completing any React Router 7 implementation:

- [ ] All route modules use `Route.*` types from `./+types/<route>`
- [ ] Data fetching prioritizes server-side loaders
- [ ] `clientLoader.hydrate = true as const` is set correctly when needed
- [ ] `HydrateFallback` is exported when `clientLoader.hydrate = true`
- [ ] Actions use server-side mutations with automatic revalidation
- [ ] Forms use `<Form>` component from react-router, not native `<form>`
- [ ] Type-safe `href()` utility is used for route generation
- [ ] Error boundaries are implemented for route errors
- [ ] Loading states use `useNavigation` or fetcher states
- [ ] No client-side data fetching unless absolutely necessary
- [ ] Slow/non-critical data returned as promises (not awaited) for streaming
- [ ] Critical data is awaited, non-critical data is streamed
- [ ] `<Await>` wrapped in `<Suspense>` with fallback UI
- [ ] Error handling implemented for streaming promises (`errorElement` or `useAsyncError`)
- [ ] Search params used for shareable UI state (filters, pagination, search)
- [ ] Search params validated and parsed in loaders with proper defaults
- [ ] Search param values returned from loader and used as `defaultValue` in forms
- [ ] `<Form method="get">` used for filter forms (not POST)
- [ ] Use `useRouteLoaderData` instead of `useLoaderData` in ErrorBoundary/Layout components
- [ ] Parent route data accessed via `useRouteLoaderData("route-id")` with proper undefined checks
- [ ] `handle` exports used for route metadata (breadcrumbs, titles, etc.)
- [ ] Middleware used for authentication/authorization instead of loader-only patterns
- [ ] Context API (`context.set/get`) used for sharing data between middleware and loaders
- [ ] `data()` utility used for custom status codes (404, 201, etc.)
- [ ] Route IDs understood for `useRouteLoaderData` calls
- [ ] `meta`, `links`, `headers` exports used where appropriate
- [ ] `shouldRevalidate` considered for performance-critical loaders
- [ ] Server-only code uses `.server.ts` naming convention
- [ ] Secrets and database clients never imported in client-accessible modules

## References

- [React Router Documentation](https://reactrouter.com/)
- [Type Safety Guide](https://reactrouter.com/explanation/type-safety)
- [Data Loading](https://reactrouter.com/start/framework/data-loading)
- [Actions](https://reactrouter.com/start/framework/actions)
- [Client Data Patterns](https://reactrouter.com/how-to/client-data)
- [Streaming & Suspense](https://reactrouter.com/how-to/suspense)
- [Await Component](https://reactrouter.com/components/await)
- [Middleware Guide](https://reactrouter.com/how-to/middleware)
- [Using handle](https://reactrouter.com/how-to/using-handle)
- [URL Values & Search Params](https://reactrouter.com/start/declarative/url-values)
- [useSearchParams Hook](https://reactrouter.com/api/hooks/useSearchParams)
- [useMatches Hook](https://reactrouter.com/api/hooks/useMatches)
- [useRouteLoaderData Hook](https://reactrouter.com/api/hooks/useRouteLoaderData)
- [useAsyncValue Hook](https://reactrouter.com/api/hooks/useAsyncValue)
- [useAsyncError Hook](https://reactrouter.com/api/hooks/useAsyncError)

## Notes

- Always prefer server-side data loading over client-side
- In route modules, **use props** (`Route.ComponentProps`) — hooks are for deep child components
- Never use `useLoaderData<Route.ComponentProps["loaderData"]>()` — this pattern is incorrect
- Use `as const` when setting `clientLoader.hydrate = true` for proper type inference
- `HydrateFallback` is required when `clientLoader.hydrate = true`
- Actions automatically revalidate all loaders on the page
- The `href` utility provides compile-time route safety (v7.5+)
- React Router 7 framework mode requires Vite
- Return promises without awaiting to stream slow/non-critical data
- Always wrap `<Await>` in `<Suspense>` with fallback UI
- Don't stream fast data (< 100ms) — just await it
- Use search params for shareable UI state — treat URL as source of truth
- Use `<Form method="get">` for filters to automatically update search params
- `useLoaderData` cannot be used in `ErrorBoundary` or `Layout` — use `useRouteLoaderData` instead
- Use `match.loaderData` instead of deprecated `match.data` in useMatches
- Middleware requires `future.v8_middleware: true` flag in config (v7.9.0+)
- Use `.server.ts` naming for modules containing secrets or database clients
- `handle` exports can contain any custom metadata for route matching

## Outcome

- Type-safe route modules with maximum type safety
- Server-first data loading architecture
- Proper hydration strategy based on use case
- Optimized data fetching with minimal client-side overhead
- Type-safe routing and links throughout the application
