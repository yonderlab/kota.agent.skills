# Navigation & Redirects

React Router provides multiple ways to navigate users: declarative links, programmatic navigation, and server-side redirects.

## Redirects in Loaders/Actions

Use `redirect()` to navigate from server-side code:

```typescript
import { redirect } from "react-router";
import type { Route } from "./+types/dashboard";

// Redirect unauthenticated users
export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUser(request);
  if (!user) {
    return redirect("/login");
  }
  return { user };
}

// Redirect after successful mutation
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const project = await createProject(formData);
  return redirect(`/projects/${project.id}`);
}
```

**When to use `redirect()`**:
- Authentication checks in loaders
- After successful form submissions
- Enforcing URL redirects (old URLs to new)

## Programmatic Navigation

Use `useNavigate()` for client-side navigation without user interaction:

```typescript
import { useNavigate } from "react-router";

function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

### Navigation Options

```typescript
const navigate = useNavigate();

// Basic navigation
navigate("/dashboard");

// Replace history entry (no back button)
navigate("/dashboard", { replace: true });

// Pass state to destination
navigate("/dashboard", {
  state: { from: location.pathname },
});

// Navigate with query params
navigate({
  pathname: "/search",
  search: "?q=react+router",
});

// Go back/forward in history
navigate(-1); // Back
navigate(1);  // Forward
navigate(-2); // Back two pages
```

### Access Navigation State

```typescript
import { useLocation } from "react-router";

function Dashboard() {
  const location = useLocation();
  const fromPage = location.state?.from;

  return <div>You came from: {fromPage}</div>;
}
```

## When to Use Each Method

| Method | Use Case |
|--------|----------|
| `<Link>` | User-initiated navigation (clicks) |
| `<NavLink>` | Navigation with active state styling |
| `redirect()` | Server-side redirects in loaders/actions |
| `useNavigate()` | Programmatic navigation after events |

**Prefer declarative navigation** (`<Link>`, `<NavLink>`) over `useNavigate()` when possible - it provides better UX with prefetching and accessibility.

## Outlet Component

`<Outlet>` renders child routes in parent layouts:

```typescript
import { Outlet } from "react-router";

export default function DashboardLayout() {
  return (
    <div>
      <header>Dashboard Header</header>
      <main>
        <Outlet /> {/* Child routes render here */}
      </main>
    </div>
  );
}
```

### Outlet with Context

Share data with child routes:

```typescript
import { Outlet, useOutletContext } from "react-router";

// Parent provides context
export default function Layout({ loaderData }: Route.ComponentProps) {
  return (
    <Outlet context={{ user: loaderData.user, theme: "dark" }} />
  );
}

// Child consumes context
type ContextType = { user: User; theme: string };

export default function ChildRoute() {
  const { user, theme } = useOutletContext<ContextType>();
  return <div className={theme}>Welcome, {user.name}</div>;
}
```

## ScrollRestoration

Restore scroll position on navigation:

```typescript
import { ScrollRestoration } from "react-router";

// In root layout
export default function Root() {
  return (
    <html>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

Custom scroll key:

```typescript
<ScrollRestoration
  getKey={(location) => {
    // Restore by pathname instead of location.key
    return location.pathname;
  }}
/>
```
