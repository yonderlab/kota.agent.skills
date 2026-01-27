# URL Search Params (Query Parameters)

Search params (query parameters) are the values after `?` in a URL. They're ideal for storing UI state that should be shareable, bookmarkable, and persistent across reloads.

## When to Use Search Params

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

## useSearchParams Hook

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

## Reading Search Params in Loaders (Server-Side)

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

**Key pattern**: Return search param values from the loader so you can use them as `defaultValue` in form inputs.

## Updating Search Params

Multiple ways to set search params:

```typescript
const [searchParams, setSearchParams] = useSearchParams();

// 1. Object (most common)
setSearchParams({ category: "books", sort: "price" });

// 2. Functional update (like useState)
setSearchParams((prev) => {
  prev.set("page", "2");
  return prev;
});

// 3. With navigation options
setSearchParams({ category: "books" }, { replace: true }); // Don't add to history
```

## Pagination Pattern

```typescript
import { useSearchParams, Form } from "react-router";
import type { Route } from "./+types/products";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = 20;

  const { products, total } = await db.getProducts({ page, pageSize });

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
        <button disabled={page === 1} onClick={() => goToPage(page - 1)}>
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button disabled={page === totalPages} onClick={() => goToPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
```

## Filtering with Form Pattern

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

        <input type="number" name="minPrice" placeholder="Min Price" defaultValue={minPrice || ""} />
        <input type="number" name="maxPrice" placeholder="Max Price" defaultValue={maxPrice || ""} />

        <button type="submit">Filter</button>
      </Form>

      <ProductGrid products={products} />
    </div>
  );
}
```

**Important**: Use `<Form method="get">` (not POST) so form submission updates search params.

## Type-Safe Search Params

```typescript
const SORT_OPTIONS = ["name", "price", "date"] as const;
type SortOption = typeof SORT_OPTIONS[number];

function parseSort(value: string | null): SortOption {
  if (value && SORT_OPTIONS.includes(value as SortOption)) {
    return value as SortOption;
  }
  return "name"; // Default
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const sort = parseSort(url.searchParams.get("sort"));
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

  const products = await db.getProducts({ sort, page });
  return { products, sort, page };
}
```

## Common Patterns

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

## Best Practices

1. **URL as Source of Truth**: Always read from search params, don't duplicate in component state
2. **Return Params from Loader**: Use them as `defaultValue` in forms
3. **Reset Dependent Params**: When changing filters, reset page to 1
4. **Validate and Parse**: Always validate/parse with defaults for invalid values
5. **Use GET Forms**: Use `<Form method="get">` for filters
6. **Functional Updates**: Use `setSearchParams((prev) => ...)` when updating multiple params
