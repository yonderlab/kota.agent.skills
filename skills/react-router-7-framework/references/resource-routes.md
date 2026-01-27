# Resource Routes (API Endpoints)

Resource routes serve non-UI responses like JSON APIs, PDFs, images, or webhooks. A route becomes a resource route when it exports a `loader` or `action` but **no default component**.

## Basic Pattern

```typescript
// app/routes/api.users.tsx (or routes.ts: route("api/users", "./api/users.tsx"))
import type { Route } from "./+types/api.users";

// GET requests
export async function loader({ request }: Route.LoaderArgs) {
  const users = await db.getUsers();
  return Response.json(users);
}

// POST, PUT, PATCH, DELETE requests
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const user = await db.createUser(formData);
  return Response.json(user, { status: 201 });
}

// No default export = resource route
```

## HTTP Method Handling

- `loader` handles **GET** requests
- `action` handles **POST, PUT, PATCH, DELETE** requests

```typescript
export async function action({ request }: Route.ActionArgs) {
  switch (request.method) {
    case "POST":
      return handleCreate(request);
    case "PUT":
      return handleUpdate(request);
    case "DELETE":
      return handleDelete(request);
    default:
      return Response.json(
        { error: "Method not allowed" },
        { status: 405 }
      );
  }
}
```

## Serving Files

```typescript
// PDF report
export async function loader({ params }: Route.LoaderArgs) {
  const report = await getReport(params.id);
  const pdf = await generatePDF(report);

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report-${params.id}.pdf"`,
    },
  });
}
```

```typescript
// Image
export async function loader({ params }: Route.LoaderArgs) {
  const image = await getImage(params.id);

  return new Response(image.buffer, {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=31536000",
    },
  });
}
```

## Webhooks

```typescript
// app/routes/webhooks.stripe.tsx
export async function action({ request }: Route.ActionArgs) {
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(body, signature, secret);
    await handleStripeEvent(event);
    return Response.json({ received: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
```

## Linking to Resource Routes

Use `<Link reloadDocument>` or `<a>` tags - regular `<Link>` attempts client-side routing which fails for resource routes:

```typescript
// Download link
<Link reloadDocument to="/reports/pdf/123">
  Download PDF
</Link>

// Or use anchor tag
<a href="/api/export/users.csv">Export CSV</a>
```

## JSON API Pattern

```typescript
// app/routes/api.posts.$id.tsx
import type { Route } from "./+types/api.posts.$id";

export async function loader({ params }: Route.LoaderArgs) {
  const post = await db.getPost(params.id);

  if (!post) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(post);
}

export async function action({ request, params }: Route.ActionArgs) {
  if (request.method === "PUT") {
    const data = await request.json();
    const post = await db.updatePost(params.id, data);
    return Response.json(post);
  }

  if (request.method === "DELETE") {
    await db.deletePost(params.id);
    return Response.json({ success: true });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
```

## Fetching from Resource Routes

Use `useFetcher` to call resource routes from components:

```typescript
import { useFetcher } from "react-router";

function SearchAutocomplete() {
  const fetcher = useFetcher();

  const handleSearch = (query: string) => {
    fetcher.load(`/api/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {fetcher.data?.results?.map((result) => (
        <div key={result.id}>{result.name}</div>
      ))}
    </div>
  );
}
```
