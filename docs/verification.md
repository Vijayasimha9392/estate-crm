# Verification and Reviewer Walkthrough

## Verification Results

Results combine authoring-environment checks with local verification on
7 September 2026.

| Check | Status |
| --- | --- |
| React TypeScript check and Vite production build | Passed in the authoring environment |
| Spring Boot compilation and executable JAR packaging | Passed in the authoring environment |
| Application contract tests with H2 in MySQL compatibility mode | 8 passed; 0 failures in the authoring environment |
| Real MySQL 8.4 contract tests | Passed locally: 8 tests, 0 failures, 0 errors, 0 skipped |
| Docker Compose launch | Confirmed locally; backend startup and database migration succeeded |
| Desktop browser rendering and screenshots | Screenshots captured for overview, leads, lead details, property tabs and bookings |
| Complete manual interaction walkthrough | Partially evidenced by screenshots; remaining checks listed below |
| Mobile layout, keyboard navigation and text zoom | Pending manual verification |
| GitHub publication and deployed URL | Not yet recorded |

Desktop screenshots show created records, assigned leads, conversation notes,
available and booked inventory, and confirmed bookings. Screenshots alone do
not verify every interaction, access restriction or error state.

## Real MySQL Test Run

The MySQL integration suite completed successfully on 7 September 2026.

| Component | Version |
| --- | --- |
| Java in the Maven container | 17.0.15 |
| Maven container image | maven:3.9.9-eclipse-temurin-17 |
| Spring Boot | 3.5.0 |
| Testcontainers | 1.21.4 |
| MySQL container image | mysql:8.4 |
| Docker Engine | 29.7.2 |

Result:

```text
Tests run: 8, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
Total time: 01:04 min
Finished at: 2026-09-07T09:52:30Z