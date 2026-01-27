# Form Validation & Optimistic UI

## Server-Side Form Validation

Validate form data in actions and return errors:

```typescript
import { data, redirect } from "react-router";
import type { Route } from "./+types/signup";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const errors: Record<string, string> = {};

  if (!email.includes("@")) {
    errors.email = "Invalid email address";
  }

  if (password.length < 12) {
    errors.password = "Password must be at least 12 characters";
  }

  if (Object.keys(errors).length > 0) {
    // Return 400 to prevent revalidation of loaders
    return data({ errors }, { status: 400 });
  }

  await createUser({ email, password });
  return redirect("/dashboard");
}
```

## Display Validation Errors

Access errors via `actionData` prop or `useActionData`:

```typescript
import { Form } from "react-router";
import type { Route } from "./+types/signup";

export default function Signup({ actionData }: Route.ComponentProps) {
  const errors = actionData?.errors;

  return (
    <Form method="post">
      <div>
        <label>
          Email
          <input type="email" name="email" />
        </label>
        {errors?.email && <span className="error">{errors.email}</span>}
      </div>

      <div>
        <label>
          Password
          <input type="password" name="password" />
        </label>
        {errors?.password && <span className="error">{errors.password}</span>}
      </div>

      <button type="submit">Sign Up</button>
    </Form>
  );
}
```

## Pending Form State

Show loading state during submission:

```typescript
import { Form, useNavigation } from "react-router";

export default function CreatePost({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.formAction === "/posts/new";

  return (
    <Form method="post" action="/posts/new">
      <input name="title" disabled={isSubmitting} />
      <textarea name="content" disabled={isSubmitting} />

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Post"}
      </button>

      {isSubmitting && <span>Saving your post...</span>}
    </Form>
  );
}
```

## Optimistic UI with useFetcher

Update UI immediately before server response:

```typescript
import { useFetcher } from "react-router";

function TodoItem({ todo }) {
  const fetcher = useFetcher();

  // Optimistically determine completion state
  let isComplete = todo.status === "complete";
  if (fetcher.formData) {
    // Use submitted value as optimistic state
    isComplete = fetcher.formData.get("status") === "complete";
  }

  return (
    <div className={isComplete ? "completed" : ""}>
      <span>{todo.title}</span>

      <fetcher.Form method="post" action={`/todos/${todo.id}`}>
        <button
          name="status"
          value={isComplete ? "incomplete" : "complete"}
        >
          {isComplete ? "Mark Incomplete" : "Mark Complete"}
        </button>
      </fetcher.Form>
    </div>
  );
}
```

## Fetcher States

```typescript
const fetcher = useFetcher();

// Check submission state
fetcher.state === "idle"       // No pending submission
fetcher.state === "submitting" // Form is being submitted
fetcher.state === "loading"    // Revalidating after action

// Access submitted data (for optimistic UI)
fetcher.formData              // FormData being submitted
fetcher.formData?.get("name") // Get specific field

// Access response data
fetcher.data                  // Data returned from action/loader
```

## Complete Example: Editable List

```typescript
import { useFetcher } from "react-router";
import type { Route } from "./+types/tasks";

export async function loader() {
  return { tasks: await db.getTasks() };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const taskId = formData.get("taskId");

  if (intent === "toggle") {
    await db.toggleTask(taskId);
  } else if (intent === "delete") {
    await db.deleteTask(taskId);
  }

  return { success: true };
}

export default function Tasks({ loaderData }: Route.ComponentProps) {
  return (
    <ul>
      {loaderData.tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  );
}

function TaskItem({ task }) {
  const fetcher = useFetcher();

  // Optimistic deletion - hide immediately
  if (fetcher.formData?.get("intent") === "delete") {
    return null;
  }

  // Optimistic toggle
  let isComplete = task.complete;
  if (fetcher.formData?.get("intent") === "toggle") {
    isComplete = !isComplete;
  }

  const isDeleting = fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "delete";

  return (
    <li style={{ opacity: isDeleting ? 0.5 : 1 }}>
      <fetcher.Form method="post">
        <input type="hidden" name="taskId" value={task.id} />

        <button name="intent" value="toggle">
          {isComplete ? "✓" : "○"}
        </button>

        <span className={isComplete ? "line-through" : ""}>
          {task.title}
        </span>

        <button name="intent" value="delete">
          Delete
        </button>
      </fetcher.Form>
    </li>
  );
}
```

## Error Handling in Fetchers

Handle errors from fetcher submissions:

```typescript
function CreateComment() {
  const fetcher = useFetcher();

  return (
    <div>
      <fetcher.Form method="post" action="/comments">
        <textarea name="content" />
        <button type="submit" disabled={fetcher.state !== "idle"}>
          {fetcher.state === "submitting" ? "Posting..." : "Post Comment"}
        </button>
      </fetcher.Form>

      {fetcher.data?.error && (
        <div className="error">{fetcher.data.error}</div>
      )}
    </div>
  );
}
```
