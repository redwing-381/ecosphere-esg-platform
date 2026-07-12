# EcoSphere — Architecture

EcoSphere is an ESG (Environmental, Social, Governance) management platform. It
pairs a **measurement & compliance** core (carbon accounting, policies, audits,
scoring) with a **participation** core (challenges, CSR, training, rewards), and
adds a **What‑If Simulator** as a differentiator.

The system is a typed **React SPA** talking to a **layered FastAPI backend**
over a versioned REST API, backed by **PostgreSQL**. Every layer has one job,
which keeps the code modular, testable and easy to reason about.

---

## 1. Application architecture

A strict top‑down flow: the browser only speaks to routers; routers only speak
to services; services own the business rules and delegate calculations to
domain **engines**; engines and services persist through the **ORM**. Nothing
skips a layer.

![Application architecture](docs/diagrams/01-application-architecture.png)

```mermaid
flowchart LR
    subgraph Client["Client — React + Vite + TypeScript"]
        direction TB
        Pages["Pages<br/>Dashboard · Environmental · Social<br/>Governance · Gamification · Rewards<br/>Simulator · Reports · Admin"]
        UI["Design system<br/>ui.tsx · MUI X charts · lucide"]
        Data["Data layer<br/>TanStack Query · Axios · Auth context"]
        Pages --> UI
        Pages --> Data
    end

    Data -->|"HTTPS · JWT · /api/v1"| Edge

    subgraph Backend["Backend — FastAPI (Python)"]
        direction LR
        Edge["Middleware<br/>CORS allowlist<br/>JWT auth + RBAC<br/>Pydantic validation<br/>error envelope"]
        Routers["API layer<br/>13 module routers<br/>auth · environmental<br/>social · governance<br/>gamification · rewards<br/>simulator · analytics<br/>reports · …"]
        Services["Service layer<br/>business rules<br/>role/dept scope<br/>transactions<br/>workflow state"]
        Engines["Domain engines<br/>carbon · scoring<br/>gamification<br/>simulator<br/>notifications"]
        ORM["Data access<br/>SQLAlchemy 2.0<br/>models"]
        Edge --> Routers --> Services --> Engines --> ORM
        Services --> ORM
    end

    ORM -->|"SQLAlchemy + Alembic"| DB[("PostgreSQL")]
    Services -->|"proof files"| Blob[("Object storage")]
```

**Why this shape**

- **Routers** are thin: parse/validate input, resolve the caller + role scope,
  call one service, return a response model. No business logic lives here.
- **Services** hold the rules — workflow transitions, permission scoping
  (e.g. a department head only sees their department), and atomic transactions
  such as reward redemption (balance check + ledger write + stock decrement).
- **Engines** are side‑effect‑light calculators — carbon conversion, 0–100 ESG
  scoring, XP/points + badge rules, and the simulator's recommendation ranking.
  They are the reusable "brain" shared across modules.
- **ORM models** are the single source of truth for the schema; migrations are
  generated with Alembic so the database is versioned, not hand‑patched.

---

## 2. Request lifecycle

Every authenticated request passes the same gauntlet, so validation, security
and error handling are consistent across all 13 modules.

![Request lifecycle](docs/diagrams/02-request-lifecycle.png)

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as Middleware (CORS)
    participant A as Auth + RBAC dep
    participant V as Pydantic schema
    participant Svc as Service
    participant Eng as Engine
    participant DB as PostgreSQL

    C->>MW: HTTPS request + JWT
    MW->>A: verify Bearer token
    A->>A: decode JWT, load user, check role/scope
    A->>V: request body
    V->>V: validate & coerce (422 on bad input)
    V->>Svc: typed DTO
    Svc->>Eng: compute (score / carbon / rewards)
    Svc->>DB: read / write in a transaction
    DB-->>Svc: rows
    Svc-->>C: response model (or error envelope)
```

Domain failures raise a typed `AppError`; a single exception handler renders
them as a uniform JSON envelope `{ error: { code, message, details } }` with the
right HTTP status — the frontend handles one error shape everywhere.

---

## 3. Data model (grouped by pillar)

The relational schema is normalised around a shared organisation → department →
employee spine, with each ESG pillar owning its own tables and a dedicated
snapshot table for score trends.

![Data model](docs/diagrams/03-data-model.png)

```mermaid
erDiagram
    ORGANIZATION ||--o{ DEPARTMENT : has
    DEPARTMENT ||--o{ EMPLOYEE : employs
    DEPARTMENT ||--o{ DEPARTMENT_SCORE : "scored over time"
    USER |o--|| EMPLOYEE : "optionally linked"

    EMPLOYEE ||--o{ OPERATIONAL_ACTIVITY : logs
    OPERATIONAL_ACTIVITY ||--|| CARBON_TRANSACTION : produces
    EMISSION_FACTOR ||--o{ OPERATIONAL_ACTIVITY : rates
    DEPARTMENT ||--o{ REDUCTION_GOAL : targets

    TRAINING ||--o{ TRAINING_ASSIGNMENT : covers
    EMPLOYEE ||--o{ TRAINING_ASSIGNMENT : assigned
    CSR_ACTIVITY ||--o{ CSR_PARTICIPATION : hosts
    EMPLOYEE ||--o{ CSR_PARTICIPATION : joins

    CHALLENGE ||--o{ CHALLENGE_PARTICIPATION : offers
    EMPLOYEE ||--o{ CHALLENGE_PARTICIPATION : enters
    EMPLOYEE ||--o{ LEDGER_ENTRY : "earns XP/points"
    REWARD ||--o{ REDEMPTION : "redeemed as"
    EMPLOYEE ||--o{ REDEMPTION : spends

    POLICY ||--o{ POLICY_ACKNOWLEDGEMENT : versioned
    EMPLOYEE ||--o{ POLICY_ACKNOWLEDGEMENT : signs
    EMPLOYEE ||--o{ COMPLIANCE_ISSUE : "owns & raises"
    DEPARTMENT ||--o{ AUDIT : audited
```

Highlights judges tend to look for:

- **Referential integrity** everywhere via foreign keys; `Department.head` uses a
  deferred constraint to resolve the department↔employee cycle cleanly.
- **Enumerated types** for roles, statuses and activity kinds instead of loose
  strings.
- **Auditability** — issues track both a `created_by` (who raised it) and an
  `owner` (who works it); ledger rows are append‑only.
- **Trends without recomputation** — live scores are computed on demand, while
  `DepartmentScore` stores dated snapshots for historical charts.

---

## 4. Deployment topology

Runs entirely on managed, free‑tier services; the same code runs locally against
a local Postgres and disk‑backed uploads.

![Deployment topology](docs/diagrams/04-deployment.png)

```mermaid
flowchart LR
    User(("User browser"))

    subgraph Vercel["Vercel"]
        FE["Static SPA<br/>(client build + SPA rewrites)"]
        BE["Serverless functions<br/>FastAPI (NullPool pooling)"]
    end

    Neon[("Neon<br/>PostgreSQL")]
    BlobStore[("Vercel Blob<br/>proof uploads")]

    User --> FE
    FE -->|"VITE_API_URL /api/v1"| BE
    BE --> Neon
    BE --> BlobStore
```

The backend detects the serverless environment and switches SQLAlchemy to
`NullPool` (no long‑lived connections), reads its DB/CORS/Blob config from
environment variables, and stores proof files in Blob in production while
falling back to local disk in development.

---

## 5. Design principles & engineering standards

| Area | Standard applied |
| --- | --- |
| **Structure** | Layered, modular architecture (router → service → engine → ORM); one module per bounded context. |
| **Database** | Normalised relational schema, FK integrity, enum types, Alembic migrations, snapshot tables for trends. |
| **Validation** | Pydantic schemas at every boundary; invalid input fails fast with `422` and field‑level detail. |
| **Errors** | Custom `AppError` hierarchy rendered through one handler into a consistent JSON envelope. |
| **Security** | JWT access/refresh tokens, bcrypt password hashing, role‑ and department‑scoped RBAC dependencies, CORS allowlist, upload type/size checks. |
| **Data integrity** | Atomic transactions for money‑like flows (reward redemption, XP/points ledger); append‑only ledgers. |
| **Frontend** | TypeScript throughout, typed Axios client, TanStack Query caching, role‑aware routing, a single design system + MUI X charts. |
| **Code quality** | PEP 8, type hints and short, intent‑revealing docstrings on the backend; `tsc` + ESLint on the frontend. |
| **Config & deploy** | 12‑factor env‑driven config, serverless‑safe DB pooling, reproducible local ↔ production parity. |

These choices map directly to the judging priorities: **relational database
design first**, backend APIs written from scratch, real/dynamic data, robust
validation with graceful errors, and modular, secure, consistent code.
