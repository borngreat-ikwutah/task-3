# Task 2 Backend API

This project is the backend solution for **HNG Task 2**. It is built with a **scalable, type-safe backend architecture** using **Hono**, **Drizzle ORM**, **Cloudflare D1**, **Zod**, and **Bun**.

The codebase is organized to keep responsibilities separate and maintainable:

- **Routes** handle HTTP wiring
- **Controllers** handle request/response flow
- **Services** handle business logic
- **Repositories** handle database access
- **Schemas** handle validation and typed contracts
- **Utils** contain reusable helpers
- **DB** contains schema and client setup

---

## Architecture Overview

The project follows a layered structure designed for growth:

```text
src/
  app.ts
  index.ts

  routes/
    profiles.route.ts

  controllers/
    profile.controller.ts

  services/
    profile.service.ts
    external-profile.service.ts

  repositories/
    profile.repository.ts

  schemas/
    profile.schema.ts
    query.schema.ts

  db/
    client.ts
    schema.ts

  lib/
    external-apis.ts

  utils/
    uuid.ts
    names.ts
    age.ts
    pagination.ts
    errors.ts

  env.ts
```

### Why this structure is scalable

- Keeps route handlers thin
- Makes business logic testable
- Separates external API integration from database logic
- Makes query parsing and filtering reusable
- Makes future features easier to add without large refactors

---

## Features

- Create profiles from a submitted name
- Prevent duplicate profile creation
- Retrieve a profile by ID
- List profiles with filtering
- Delete profiles by ID
- Strongly typed query validation
- Rule-based natural language parsing
- Offset-based pagination
- UUID v7 profile IDs
- CORS enabled for all origins
- Zod validation for request input
- Drizzle ORM for typed database access

---

## Database Design

### Profiles table

Each profile contains:

- `id`
- `name`
- `gender`
- `gender_probability`
- `sample_size`
- `age`
- `age_group`
- `country_id`
- `country_probability`
- `created_at`

### UUID v7

This project uses **UUID v7** for profile IDs.  
UUID v7 is time-ordered, which makes it more suitable for indexed inserts and sorting behavior than random UUID v4.

### Indexing

To support filtering efficiently, add indexes for:

- `gender`
- `age`
- `age_group`
- `country_id`
- `created_at`

---

## API Endpoints

### 1. Create Profile

`POST /api/profiles`

Creates a new profile from a submitted name.

#### Request body

```json
{
  "name": "emmanuel"
}
```

#### Success response: `201 Created`

```json
{
  "status": "success",
  "data": {
    "id": "018f3f64-7b7c-7d5f-9f1e-b19f9f0e2a10",
    "name": "emmanuel",
    "gender": "male",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 25,
    "age_group": "adult",
    "country_id": "NG",
    "country_probability": 0.84,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

#### Duplicate response: `200 OK`

```json
{
  "status": "success",
  "message": "Profile already exists",
  "data": {
    "id": "018f3f64-7b7c-7d5f-9f1e-b19f9f0e2a10",
    "name": "emmanuel",
    "gender": "male",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 25,
    "age_group": "adult",
    "country_id": "NG",
    "country_probability": 0.84,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

#### Validation errors

- `400 Bad Request` — invalid or missing values
- `422 Unprocessable Entity` — wrong input type

---

### 2. Get Profile by ID

`GET /api/profiles/{id}`

Returns a single profile by ID.

#### Success response: `200 OK`

```json
{
  "status": "success",
  "data": {
    "id": "018f3f64-7b7c-7d5f-9f1e-b19f9f0e2a10",
    "name": "emmanuel",
    "gender": "male",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 25,
    "age_group": "adult",
    "country_id": "NG",
    "country_probability": 0.84,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

#### Error responses

- `404 Not Found` — profile does not exist
- `422 Unprocessable Entity` — invalid ID format

---

### 3. List Profiles

`GET /api/profiles`

Returns a list of profiles with typed filtering and pagination.

#### Supported query parameters

- `gender`
- `country_id`
- `age_group`
- `min_age`
- `max_age`
- `page`
- `limit`
- `sort_by`
- `order`
- `q`

#### Example

`GET /api/profiles?gender=male&country_id=NG&page=1&limit=10`

#### Success response: `200 OK`

```json
{
  "status": "success",
  "count": 2,
  "page": 1,
  "limit": 10,
  "total": 2,
  "data": [
    {
      "id": "id-1",
      "name": "emmanuel",
      "gender": "male",
      "age": 25,
      "age_group": "adult",
      "country_id": "NG",
      "created_at": "2026-04-01T12:00:00Z"
    },
    {
      "id": "id-2",
      "name": "daniel",
      "gender": "male",
      "age": 31,
      "age_group": "adult",
      "country_id": "NG",
      "created_at": "2026-04-02T12:00:00Z"
    }
  ]
}
```

#### Pagination rules

- `page` starts at `1`
- `limit` is capped to prevent large queries
- `offset = (page - 1) * limit`

---

### 4. Delete Profile

`DELETE /api/profiles/{id}`

Deletes a profile by ID.

#### Success response: `204 No Content`

No response body is returned.

#### Error responses

- `404 Not Found` — profile does not exist
- `422 Unprocessable Entity` — invalid ID format

---

## Natural Language Parsing

Our API supports a rule-based Natural Language Search engine.

### How it works

The parser uses Tokenization and Regex-based extraction to map conversational language into structured `ProfileFilters`. It performs keyword classification sequentially without the need for LLMs or external dependencies:

1. **Gender Matching**: Tokens like `men`, `boys`, `male`, `guy` map to `gender: "male"`. Tokens like `women`, `girls`, `female`, `lady` map to `gender: "female"`.
2. **Age Groups**:
   - `young`, `youth`, `teenager`, `teen` -> `ageGroup: "teenager"` (or min max ranges depending on keyword context)
   - `child`, `kid`, `baby`, `toddler` -> `ageGroup: "child"`
   - `adult`, `grown` -> `ageGroup: "adult"`
   - `senior`, `elder`, `old` -> `ageGroup: "senior"`
3. **Exact Ranges and Comparisons**: Regex successfully extracts patterns like `above 30`, `over 18`, `> 25`, `older than 40` routing to `minAge`. Conversely `below 50`, `under 20`, `< 30` maps to `maxAge`. Number to words extraction is partially implemented but defaults to numeric parsing for absolute precision.
4. **Country Inference**: Detects full country names or permutations (e.g., "Nigeria", "Kenyans") and dynamically evaluates against an internally mapped ISO-3166-1 alpha-2 dictionary to return valid `countryId`s correctly, dropping the need to exact match casing or suffixes.

### Limitations & Edge Cases

The rule-based approach trades off flexibility for zero-latency execution. As a result it doesn't handle all scenarios:

- **Complex logic**: Nested conjunctions ("males from Nigeria AND females from Kenya") or exclusionary filters ("anyone not from Ghana") are uninterpretable by standard lexical scanning and will fail to construct compound filters.
- **Ambiguous definitions**: Queries heavily relying on subjective language like "middle-aged" or "millennials" do not safely map without overlapping definitions, returning `400 Bad Request` or being ignored to prevent misclassification.
- **Spelling Mistakes**: Strict token checking lacks Levenshtein distance matching. `femail from Ngeria` will fail to correctly map parameters.
- **Compound attributes**: Fails on joined characteristics that don't match individual tokens ("Africans" or "GenZ").

## Strong Typing

This codebase is designed to be type-safe from request to database.

### Hono bindings

The app is initialized with typed Cloudflare bindings so `c.env.DB` is recognized by TypeScript.

### Zod validation

All external input should pass through Zod schemas before reaching business logic.

This ensures that:

- invalid query params return errors
- query values are coerced safely
- route handlers receive typed input
- responses can stay consistent

### Drizzle typing

Database rows are typed with Drizzle’s inferred models, which helps keep DB results aligned with the schema.

---

## Seed Strategy

Seeding should be **idempotent**.

That means:

- running seed once inserts records
- running seed again updates existing records instead of duplicating them

Use **upsert** behavior for seed data so repeated runs are safe.

---

## Environment Variables

### Required

- `DATABASE_URL` — database connection string
- `NODE_ENV` — runtime environment

Example:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
NODE_ENV="development"
```

---

## Tech Stack

- **Runtime:** Bun
- **Framework:** Hono
- **Database:** Cloudflare D1
- **ORM:** Drizzle ORM
- **Validation:** Zod
- **Deployment:** Cloudflare Workers

---

## Development

### Install dependencies

```sh
bun install
```

### Generate migrations

```sh
bun run db:generate
```

### Apply migrations

```sh
bun run db:migrate
```

### Start local development

```sh
bun run dev
```

### Run Cloudflare Worker locally

```sh
bun run dev:worker
```

### Deploy

```sh
bun run deploy
```

---

## Error Response Format

All error responses follow this structure:

```json
{
  "status": "error",
  "message": "Error message here"
}
```

---

## Notes for Contributors

When extending the project:

- keep route handlers thin
- add new business rules in services
- put DB queries in repositories
- validate all inputs with Zod
- prefer typed helpers over ad hoc logic
- keep the architecture modular

This makes the backend easier to maintain and much more scalable over time.
