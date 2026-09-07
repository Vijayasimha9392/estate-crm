# Estate CRM

A compact real-estate sales workspace built with **React, TypeScript, Spring Boot, and MySQL**.

The application helps a sales team manage leads, record conversations, schedule follow-ups, maintain property inventory, and confirm property bookings.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router |
| Backend | Java 17, Spring Boot, Spring Security |
| Database | MySQL 8.4 |
| Database access | Spring JDBC |
| Schema migrations | Flyway |
| Authentication | HTTP-only session cookies with CSRF protection |
| Local deployment | Docker Compose and Nginx |
| Testing | Spring Boot Test, MockMvc, H2, Testcontainers |

## Features

### Lead Management

- Create, view, edit, and search leads.
- Filter leads by stage and assigned employee.
- Browse leads using server-side pagination.
- Support these stages:
  - New
  - Contacted
  - Site Visit
  - Interested
  - Negotiation
  - Booked
  - Lost
- Assign and reassign leads through an Admin account.
- Add timestamped notes with the author's name.
- Set, reschedule, or clear the next follow-up date.

### Property Management

- Create and edit projects.
- Create and edit buildings within projects.
- Create and edit units within buildings.
- Store unit number, type, price, and availability.
- Search inventory and filter by project, building, and availability.
- Prevent editing booked units.

### Booking Management

- Connect an eligible lead to an available unit.
- Read the booking price on the server.
- Save the price at the time of booking.
- Update the lead and unit to Booked in one transaction.
- Prevent duplicate bookings using row locks and database constraints.
- Display confirmed bookings with customer, property, employee, price, and date.

### Dashboard

- Total and active lead counts.
- Follow-ups due today.
- Overdue follow-ups.
- Lead counts by stage.
- Confirmed booking count.
- Total booked value.
- Follow-up list for active leads.

### Access Control

- Admin can access all leads, manage inventory, and assign employees.
- Sales Employees can access and update their assigned leads.
- Notes, bookings, and dashboard totals follow lead ownership.
- Backend permission checks apply independently of the visible UI controls.

## Run with Docker

### Requirements

- Docker Desktop with Docker Compose.
- Docker Desktop running with Linux containers.
- Internet access for the initial image and dependency downloads.

Java, Maven, Node.js, and MySQL do not need to be installed separately when using the complete Docker setup.

### 1. Open the project folder

Extract the project ZIP and open a terminal in the folder containing:

- `compose.yaml`
- `backend/`
- `frontend/`
- `README.md`

For example, on Windows:

```powershell
cd C:\estate-crm
```

### 2. Build and start the services

```powershell
docker compose up --build -d
```

This starts MySQL, the Spring Boot backend, and the frontend served by Nginx.

The first build can take several minutes.

### 3. Check startup

```powershell
docker compose ps
```

Check the backend logs:

```powershell
docker compose logs -f backend
```

Wait for a message containing:

```text
Started CrmApplication
```

Press `Ctrl+C` to stop following the logs. The application continues running.

Flyway creates the database tables automatically. Demo accounts and sample records are inserted on first startup when demo seeding is enabled and the users table is empty.

### 4. Open the application

Open:

**http://127.0.0.1:3001**

The Docker frontend uses port **3001**.

### 5. Sign in

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@estate.test | EstateDemo!2026 |
| Sales Employee | maya@estate.test | EstateDemo!2026 |
| Sales Employee | arjun@estate.test | EstateDemo!2026 |

Passwords are case-sensitive.

These credentials and the seeded records are intended for a local demonstration.

## Local Service Addresses

| Service | Host address |
| --- | --- |
| Application | http://127.0.0.1:3001 |
| Backend | http://127.0.0.1:8080 |
| Backend health endpoint | http://127.0.0.1:8080/api/health |
| Docker MySQL | 127.0.0.1:3307 |

Inside Docker, the backend connects to MySQL through `db:3306`, and Nginx forwards API requests to `backend:8080`.

Port 3307 is the host-side database port. This allows the Docker database to coexist with a separate local MySQL installation using port 3306.

## Stop, Restart, and Rebuild

Stop the application:

```powershell
docker compose down
```

Start it again:

```powershell
docker compose up -d
```

Rebuild after changing application code:

```powershell
docker compose up --build -d
```

The named database volume retains records when containers are stopped or recreated. Do not use `docker compose down -v` unless you intend to delete this project's database volume.

Keep the project folder name consistent because Docker Compose normally derives its project and volume names from that folder.

## Develop with an IDE

For native development, install:

- JDK 17; this is the version used by the supplied Docker build.
- Maven 3.9 or later.
- Node.js 22.
- MySQL 8.4, either locally or through Docker.

If the complete Docker application is already running, stop it before starting the native backend to free port 8080:

```powershell
docker compose down
```

### Start only the Docker database

From the project root:

```powershell
docker compose up -d db
```

### Start the backend

In a terminal at the project root:

```powershell
cd backend
mvn "-Dspring-boot.run.arguments=--app.seed-demo=true" spring-boot:run
```

The backend runs on port 8080.

### Start the frontend

Open another terminal at the project root:

```powershell
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite, normally:

**http://localhost:5173**

Vite forwards `/api` requests to `http://localhost:8080`.

Port 5173 is for native frontend development. Port 3001 is for the complete Docker setup.

## Environment Configuration

The default Compose configuration works without creating an `.env` file.

To override Compose values, copy `.env.example` to `.env` in the project root and edit the required values.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_PASSWORD` | `crm-local-password` | Application database password |
| `DB_ROOT_PASSWORD` | `root-local-password` | MySQL root password |
| `SEED_DEMO` | `true` in Compose | First-run demo data |

Changing a password in `.env` does not automatically change the password of a database user already stored in the existing MySQL volume.

For native backend development, these environment variables are supported:

| Variable | Default / purpose |
| --- | --- |
| `DB_URL` | `jdbc:mysql://localhost:3307/estate_crm?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true` |
| `DB_USER` | `crm` |
| `DB_PASSWORD` | `crm-local-password` |
| `SEED_DEMO` | `false` unless explicitly enabled |
| `COOKIE_SECURE` | `false` for local HTTP |

When using your separately installed MySQL server, create the `estate_crm` database and an application user with the required migration permissions. Set `DB_URL` to that server's address and port.

Maven does not automatically read the root `.env` file. Configure native backend environment variables through your IDE or terminal.

The supplied configuration is for local use. An externally accessible deployment requires private credentials, HTTPS, secure cookies, and disabling demo seeding.

## Five Important Design Decisions

### 1. Server-side ownership checks

Sales Employees can access leads assigned to them. Admin can access all leads and manage assignments and inventory.

Notes, bookings, and dashboard totals follow the same ownership rules. Bookings are visible according to the lead's current assignee, while the booking retains the identity of the employee who created it.

A new lead belongs to its creator, including an Admin, until Admin reassigns it.

### 2. Transactional booking with database protection

The booking service performs these operations in one transaction:

1. Lock the lead using `SELECT ... FOR UPDATE`.
2. Check ownership and booking eligibility.
3. Lock the selected unit.
4. Check that the unit is still available.
5. Insert the booking.
6. Mark the unit as Booked.
7. Mark the lead as Booked and clear its follow-up date.

The lock order is consistently lead first, then unit.

Unique constraints on `bookings.unit_id` and `bookings.lead_id` provide additional protection against duplicate bookings.

Booking conflicts return HTTP 409. A failure during the transaction rolls back earlier writes.

### 3. Booked is controlled by the booking workflow

A lead cannot be manually changed to Booked through the normal edit form.

Successful booking sets the stage automatically. A booked lead cannot move to another stage in this version.

Lost leads must be reopened before booking. Booked and Lost leads do not retain an active follow-up date.

### 4. Booking prices are historical snapshots

The server reads the unit price while holding its lock and stores that value in the booking.

The booking API does not accept a client-provided booking price, employee ID, or timestamp.

Money uses Java `BigDecimal` and MySQL `DECIMAL(14,2)`. Booked units cannot be edited in this MVP.

### 5. Scope is intentionally limited

This version supports:

- One booking per lead.
- One next-follow-up date per lead.
- Conversation history through separate notes.
- The lead record as the customer record.

It does not include cancellation, payments, or multiple property purchases per lead.

Follow-up dates use `Asia/Kolkata`. Booking timestamps are handled in UTC.

Booked value means the sum of confirmed booking prices, not collected revenue.

Adding cancellation or multiple purchases would require revisiting the booking constraints and lead-stage rules.

## Project Structure

| Path | Purpose |
| --- | --- |
| `backend/src/main/java/com/estatecrm/` | Controllers, request contracts, security, and services |
| `backend/src/main/resources/application.yml` | Backend configuration |
| `backend/src/main/resources/db/migration/` | Flyway database migrations |
| `backend/src/test/` | Application and MySQL integration tests |
| `frontend/src/` | React screens, shared controls, API client, and styles |
| `frontend/nginx.conf` | Frontend serving and API proxy configuration |
| `compose.yaml` | Local multi-service setup |
| `docs/architecture.md` | Database relationships and API overview |
| `docs/verification.md` | Original test notes and review walkthrough |

## Database and API Overview

Database tables:

- `users`
- `leads`
- `lead_notes`
- `projects`
- `buildings`
- `units`
- `bookings`

Projects contain buildings, buildings contain units, and bookings connect leads to units.

The backend uses parameterized JDBC queries, foreign keys, validation, and database constraints.

Main API groups:

| Path | Purpose |
| --- | --- |
| `/api/auth` | Login, logout, session identity, and CSRF token |
| `/api/employees` | Employee selection for Admin |
| `/api/leads` | Lead management and search |
| `/api/leads/{id}/notes` | Add conversation notes |
| `/api/leads/{id}/assignee` | Admin assignment |
| `/api/properties` | Inventory overview |
| `/api/projects` | Project management |
| `/api/buildings` | Building management |
| `/api/units` | Unit management |
| `/api/bookings` | Create and list bookings |
| `/api/dashboard` | Sales summary |

See [Database and API overview](docs/architecture.md) for methods, request bodies, and relationships.

## Authentication

Authentication uses an HTTP-only session cookie.

- Passwords are hashed with BCrypt.
- Login rotates the session ID.
- The security context is explicitly saved.
- State-changing requests require a CSRF token.
- The frontend retrieves a fresh CSRF token after login.
- Sessions expire after 30 minutes of inactivity.
- Logout invalidates the session.

There is no public registration or user-management screen.

## Build and Test

### Frontend production build

From the project root:

```powershell
cd frontend
npm ci
npm run build
```

### Backend application tests

In a separate terminal at the project root:

```powershell
cd backend
mvn test
```

The default application tests use H2 in MySQL compatibility mode. H2 is a test dependency only; the Docker application uses MySQL.

### Backend executable package

From the `backend` folder:

```powershell
mvn -DskipTests package
```

This packages the application without rerunning tests.

### Real MySQL integration tests

With Docker Desktop running, execute from the `backend` folder:

```powershell
mvn "-DmysqlTests=true" "-Dtest=MySqlIntegrationTest" test
```

This runs the contract suite against a temporary MySQL 8.4 container.

Docker image builds skip tests, so run verification separately.

## Verification Status

- Frontend TypeScript check and production build passed.
- Backend compilation and executable packaging passed.
- Eight H2 application contract tests passed.
- Eight real MySQL 8.4 integration tests passed on 7 September 2026:
  0 failures, 0 errors, 0 skipped.
- Docker Compose startup and desktop application screens verified locally.
- Mobile layout and keyboard interaction checks remain pending.

See [Verification and reviewer walkthrough](docs/verification.md).

## Troubleshooting

Check service status:

```powershell
docker compose ps
```

Inspect recent logs:

```powershell
docker compose logs --tail=100 backend db web
```

| Issue | Action |
| --- | --- |
| Docker engine connection error | Start Docker Desktop and wait for the engine |
| No configuration file found | Run commands from the folder containing `compose.yaml` |
| Another application opens on port 3000 | Use this project's configured address: `http://127.0.0.1:3001` |
| Port already allocated | Check which service conflicts before changing its host port |
| Workspace unavailable | Check backend startup logs, then retry |
| Demo login fails | Check that seeding was enabled for the initial empty database |
| Flyway compatibility warning | Inspect the following migration result; successful migration and startup are separate from the warning |

## Known Limitations

- No booking cancellation or payment processing.
- No lead or property deletion endpoints.
- No external notifications or exports.
- No password reset or user-management interface.
- No optimistic version checks for simultaneous lead edits.
- No historical audit trail of assignment changes.
- Inventory and booking lists load in full for this small application.
- Lead lists use pages of 20 records.
- Duplicate contact details are allowed.
- Deployment and GitHub publication are not included in the local setup.

## Submission

Include:

- Source repository.
- This README.
- Database and API overview.
- Screenshots from the running application or a deployed link.
- Accurate test results and known limitations.

Exclude `.env`, credentials, `node_modules`, `target`, and `dist` from source control.

Suggested screenshots: dashboard, leads, lead details, property inventory, and bookings.