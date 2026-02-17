# TypeScript Best Practices

This document outlines best practices for writing high-quality TypeScript code in Node.js and React applications. These guidelines prioritize type safety, testability, maintainability, and security.

## TypeScript Type Safety

### Zero Type Casting

**Never use type assertions** (`as`, `as any`, `as unknown`) to bypass the type system.

❌ **Bad:**
```typescript
const data = response as UserData;
const config = JSON.parse(text) as Config;
```

✅ **Good:**
```typescript
// Use Zod for runtime validation
const UserDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email()
});

const result = UserDataSchema.safeParse(response);
if (!result.success) {
  throw new Error('Invalid user data');
}
const data = result.data; // TypeScript knows the shape
```

**Why:** Type assertions bypass TypeScript's type checking at runtime. If the data doesn't match the asserted type, you'll get runtime errors that TypeScript can't catch.

### No Implicit Any

All public APIs (functions, components, exported values) must have explicit types.

❌ **Bad:**
```typescript
export function processUser(user) {
  return user.name.toUpperCase();
}
```

✅ **Good:**
```typescript
export function processUser(user: User): string {
  return user.name.toUpperCase();
}
```

**Why:** Explicit types make your code self-documenting and enable IDE autocomplete and type checking for consumers of your API.

### Proper Type Guards

Use Zod `safeParse` or explicit type guard functions, not type assertions.

❌ **Bad:**
```typescript
function isUser(obj: unknown): boolean {
  return (obj as User).id !== undefined;
}
```

✅ **Good:**
```typescript
const UserSchema = z.object({
  id: z.string(),
  name: z.string()
});

function isUser(obj: unknown): obj is User {
  return UserSchema.safeParse(obj).success;
}

// Or just use Zod directly:
const result = UserSchema.safeParse(obj);
if (result.success) {
  // result.data is properly typed
}
```

**Why:** Proper type guards provide runtime validation that matches the TypeScript types, ensuring type safety at both compile and runtime.

### Schema-First Validation

All runtime validation must use Zod schemas with types inferred from the schema.

✅ **Good:**
```typescript
// Define the schema first
const CreateUserRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user'])
});

// Infer the type from the schema
type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

// Use in your function
export async function createUser(data: unknown): Promise<User> {
  const validated = CreateUserRequestSchema.parse(data);
  // validated is typed as CreateUserRequest
  return await db.users.create(validated);
}
```

**Why:** Schema-first validation ensures your runtime validation and TypeScript types stay in sync. If you update the schema, the types automatically update.

### Enum Handling

Use Zod enums and import existing enums from the API client.

✅ **Good:**
```typescript
// Import from API client if available
import { UserRole } from '@/api-client';

const UserRoleSchema = z.nativeEnum(UserRole);

// Or define with Zod
const StatusSchema = z.enum(['pending', 'active', 'suspended']);
type Status = z.infer<typeof StatusSchema>;
```

**Why:** Zod enums provide both runtime validation and type inference, keeping your enums and validation in sync.

### Null Safety

Explicitly handle null and undefined values with proper type narrowing.

❌ **Bad:**
```typescript
function getUserName(user: User | null) {
  return user.name; // Could crash if user is null
}
```

✅ **Good:**
```typescript
function getUserName(user: User | null): string {
  if (!user) {
    return 'Guest';
  }
  return user.name;
}

// Or use optional chaining with nullish coalescing
function getUserName(user: User | null): string {
  return user?.name ?? 'Guest';
}
```

**Why:** Explicit null handling prevents runtime crashes and makes your error cases clear.

## Testing Requirements

### Comprehensive Coverage

All new or changed logic must have corresponding tests.

✅ **Required:**
- Unit tests for business logic functions
- Integration tests for API routes and data flows
- Component tests for UI interactions
- Tests for all exported functions and classes

**Test location:** Co-locate tests next to the code they test:
```
src/
  utils/
    formatDate.ts
    formatDate.test.ts
  components/
    UserCard.tsx
    UserCard.test.tsx
```

### Edge Cases and Failure Paths

Tests must cover both success and failure scenarios.

✅ **Good test coverage:**
```typescript
describe('createUser', () => {
  it('creates user with valid data', async () => {
    const user = await createUser({ name: 'Alice', email: 'alice@example.com' });
    expect(user.name).toBe('Alice');
  });

  it('throws error for invalid email', async () => {
    await expect(
      createUser({ name: 'Alice', email: 'invalid' })
    ).rejects.toThrow('Invalid email');
  });

  it('throws error for duplicate email', async () => {
    await createUser({ name: 'Alice', email: 'alice@example.com' });
    await expect(
      createUser({ name: 'Bob', email: 'alice@example.com' })
    ).rejects.toThrow('Email already exists');
  });

  it('handles missing required fields', async () => {
    await expect(
      createUser({ name: '' })
    ).rejects.toThrow('Name is required');
  });
});
```

**What to test:**
- Happy path (valid inputs, expected outputs)
- Invalid inputs (validation errors)
- Edge cases (empty strings, null, undefined, boundary values)
- Error conditions (network failures, database errors)
- State transitions (form submission, loading states)

### Test Quality

Tests should be clear, maintainable, and follow project patterns.

✅ **Good practices:**
- Use descriptive test names that explain what is being tested
- Arrange-Act-Assert pattern (setup, execute, verify)
- One assertion per test (or closely related assertions)
- Use test fixtures and factories for test data
- Mock external dependencies (APIs, databases)
- Avoid testing implementation details

## Flow and Integration Analysis

### Routes and Navigation

When working with routes (e.g., React Router, Remix):
- Ensure route changes don't break existing navigation
- Test loaders and actions for data fetching and mutations
- Validate query parameters and route params with Zod
- Handle loading and error states

### Form Handling

Forms must have proper validation, submission, and error handling:

✅ **Good form pattern:**
```typescript
const FormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

function LoginForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(formData: FormData) {
    const data = Object.fromEntries(formData);
    const result = FormSchema.safeParse(data);

    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }

    try {
      await login(result.data);
    } catch (error) {
      setErrors({ _form: 'Login failed' });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" />
      {errors.email && <span>{errors.email}</span>}

      <input name="password" type="password" />
      {errors.password && <span>{errors.password}</span>}

      {errors._form && <div>{errors._form}</div>}

      <button type="submit">Login</button>
    </form>
  );
}
```

### API Contracts

API calls must match backend schemas and handle responses properly:

✅ **Good API pattern:**
```typescript
// Define request and response schemas
const GetUserRequestSchema = z.object({
  userId: z.string()
});

const GetUserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string()
});

type GetUserResponse = z.infer<typeof GetUserResponseSchema>;

async function getUser(userId: string): Promise<GetUserResponse> {
  const validated = GetUserRequestSchema.parse({ userId });

  const response = await fetch(`/api/users/${validated.userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }

  const data = await response.json();
  return GetUserResponseSchema.parse(data);
}
```

## Code Quality and Architecture

### SOLID Principles

Follow SOLID principles for maintainable code:

- **Single Responsibility:** Each function/class should do one thing well
- **Open/Closed:** Open for extension, closed for modification
- **Liskov Substitution:** Subtypes should be substitutable for their base types
- **Interface Segregation:** Many specific interfaces over one general interface
- **Dependency Inversion:** Depend on abstractions, not concretions

### DRY (Don't Repeat Yourself)

Extract common logic into reusable functions:

❌ **Bad:**
```typescript
function formatUserName(user: User) {
  return user.firstName + ' ' + user.lastName;
}

function formatAdminName(admin: Admin) {
  return admin.firstName + ' ' + admin.lastName;
}
```

✅ **Good:**
```typescript
interface Person {
  firstName: string;
  lastName: string;
}

function formatFullName(person: Person): string {
  return `${person.firstName} ${person.lastName}`;
}
```

### Performance Optimization

Be mindful of performance in React applications:

✅ **Good practices:**
- Use `useMemo` for expensive computations
- Use `useCallback` for callback functions passed to child components
- Avoid inline object/array creation in render
- Use `React.memo` for expensive components that don't change often
- Lazy load routes and large components

❌ **Bad:**
```typescript
function UserList({ users }: Props) {
  return (
    <div>
      {users.map(user => (
        <UserCard
          key={user.id}
          user={user}
          onClick={() => selectUser(user.id)} // Creates new function every render
        />
      ))}
    </div>
  );
}
```

✅ **Good:**
```typescript
function UserList({ users }: Props) {
  const handleClick = useCallback((userId: string) => {
    selectUser(userId);
  }, []);

  return (
    <div>
      {users.map(user => (
        <UserCard
          key={user.id}
          user={user}
          onClick={handleClick}
        />
      ))}
    </div>
  );
}
```

### Error Handling

Provide user-friendly error messages and graceful fallbacks:

✅ **Good error handling:**
```typescript
async function loadUserData(userId: string): Promise<User> {
  try {
    const user = await fetchUser(userId);
    return user;
  } catch (error) {
    if (error instanceof NetworkError) {
      throw new Error('Unable to connect. Please check your internet connection.');
    }
    if (error instanceof NotFoundError) {
      throw new Error('User not found.');
    }
    throw new Error('An unexpected error occurred. Please try again.');
  }
}

// In React component:
function UserProfile({ userId }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserData(userId)
      .then(setUser)
      .catch(error => setError(error.message));
  }, [userId]);

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!user) {
    return <LoadingSpinner />;
  }

  return <UserDetails user={user} />;
}
```

### Security Best Practices

Protect against common vulnerabilities:

**XSS Prevention:**
- Never use `dangerouslySetInnerHTML` unless absolutely necessary
- Sanitize user input before rendering
- Use Content Security Policy headers

**Data Validation:**
- Validate all user input on both client and server
- Use Zod schemas for comprehensive validation
- Never trust data from external sources

**Secrets Management:**
- Never commit secrets to version control
- Use environment variables for configuration
- Rotate API keys and tokens regularly
- Use `.env.local` for local development (gitignored)

❌ **Bad:**
```typescript
const API_KEY = 'sk-1234567890abcdef'; // Hardcoded secret
```

✅ **Good:**
```typescript
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY environment variable is required');
}
```

## What to Avoid

- **Don't block progress** unless there's a critical issue (security vulnerability, data loss risk)
- **Don't request changes** unrelated to the current task
- **Don't make assumptions** without understanding the full context
- **Don't flag working code** that follows established patterns
- **Don't give generic advice** – always be specific and actionable
- **Don't ignore TODO/FIXME** if it introduces an immediate severe defect
- **Don't over-engineer** – keep solutions as simple as possible

## When Patterns Differ

If existing code follows a different pattern:
1. Acknowledge the existing pattern
2. Explain the trade-offs
3. Only suggest changes if there's a clear benefit
4. Respect project-specific conventions over generic best practices
