# Async Streaming with Promises

Stream non-critical data to the client progressively while rendering critical data immediately. This improves perceived performance by showing content faster with skeleton UI.

> **Note**: `defer()` is deprecated. Simply return promises directly from your loader without awaiting them.

## When to Use Streaming

Use streaming when:
- You have **slow data** that would block page rendering
- Some data is **critical** (needed immediately) and some is **non-critical** (can load later)
- You want to show **skeleton UI** while data loads
- API calls can run in parallel but have different response times

**Don't use streaming for**:
- Small, fast data that loads quickly (< 100ms)
- Data that's always needed before rendering
- Simple CRUD operations where streaming adds complexity

## Basic Pattern

Return promises directly from your loader without awaiting them:

```typescript
import type { Route } from "./+types/dashboard";

export async function loader() {
  // Critical data - await this (blocks rendering)
  const user = await db.getUser();

  // Non-critical data - don't await (streams to client)
  const stats = db.getStats(); // Promise, not awaited
  const activity = db.getRecentActivity(); // Promise, not awaited

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

> **Important**: You cannot return a single promise directly from a loader. The promises must be wrapped in an object with keys.

## Await Component

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

## Error Handling

Use `useAsyncError` to handle rejected promises:

```typescript
import { Await, useAsyncError } from "react-router";

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

## Complete Example: Dashboard with Streaming

```typescript
import { Suspense } from "react";
import { Await, useAsyncValue } from "react-router";
import type { Route } from "./+types/dashboard";

export async function loader() {
  // Critical: User info (fast, blocks render)
  const user = await db.getUser();

  // Non-critical: Stats (slow, streams)
  const stats = fetch("/api/stats").then(r => r.json());

  // Non-critical: Activity (slow, streams)
  const activity = fetch("/api/activity").then(r => r.json());

  return { user, stats, activity };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user, stats, activity } = loaderData;

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>

      <div className="grid">
        <Suspense fallback={<StatsSkeleton />}>
          <Await resolve={stats} errorElement={<StatsError />}>
            {(resolvedStats) => (
              <div>
                <h2>Your Stats</h2>
                <p>Posts: {resolvedStats.postCount}</p>
                <p>Views: {resolvedStats.viewCount}</p>
              </div>
            )}
          </Await>
        </Suspense>

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

function StatsError() {
  const error = useAsyncError();
  return <div>Failed to load stats: {error.message}</div>;
}
```

## Best Practices

1. **Await Critical Data**: Always await data that's needed for the initial render
2. **Stream Non-Critical**: Return slow or non-essential promises without awaiting
3. **Provide Fallbacks**: Always wrap `<Await>` in `<Suspense>` with meaningful fallback UI
4. **Handle Errors**: Use `errorElement` or `useAsyncError` for robust error handling
5. **Wrap in Objects**: Always return promises within an object, never directly

## When NOT to Use Streaming

- **Fast data** (< 100ms): Just await it
- **All data is critical**: No benefit to streaming
- **Simple pages**: Don't over-engineer simple CRUD operations
- **Sequential dependencies**: If data B depends on data A, you can't stream both effectively

## When Streaming Doesn't Work

Streaming requires SSR. It will **NOT** work in these cases:

- `ssr: false` in config (SPA mode)
- Static pre-rendering
- Client-only routes (no server loader)

## Performance Tips

```typescript
// Good: Parallel fetching with streaming
export async function loader() {
  const user = await db.getUser();

  // These run in parallel, stream independently
  const stats = db.getStats();
  const activity = db.getActivity();

  return { user, stats, activity };
}

// Bad: Sequential fetching (slow)
export async function loader() {
  const user = await db.getUser();
  const stats = await db.getStats(); // Waits for user
  const activity = await db.getActivity(); // Waits for stats

  return { user, stats, activity };
}

// Good: Await critical, stream rest
export async function loader() {
  const [user, product] = await Promise.all([
    db.getUser(),
    db.getProduct()
  ]);

  const reviews = db.getReviews(); // Stream (not awaited)

  return { user, product, reviews };
}
```
