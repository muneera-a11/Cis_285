# SplitSmart Base System Architecture

**Status:** **Approved architectural baseline** for the initial implementation, as selected in `architecture-review-report.md`. Use a layered modular monolith with Ports and Adapters. The feature specification remains a draft; open product questions listed there remain unresolved. This document is a design baseline, not evidence that any feature is implemented. The microservices proposal in `alternative-architecture.md` is not selected.

## 1. Goals and scope

SplitSmart tracks shared expenses, approvals, pairwise obligations, settlement payments, notifications, and reports for individual accounts and groups. The architecture separates UI, use-case coordination, business rules, and storage so the rules can be exercised without Swing.

The requested Java 21, Maven, Swing, JUnit 5, object-oriented design, PlantUML, and `BigDecimal` are implementation constraints. The customer also requires a primarily web-based product and Android and iOS apps. Swing is suitable for the proposed desktop MVP only and does not satisfy those platform requirements. The complete product therefore needs web and mobile clients connected to shared server-side services. The server/API and non-desktop client technologies are not specified here and need product/technology decisions.

The initial desktop MVP candidate covers account access, groups, expense entry/allocation, single-step review, and balances. Receipt images, notifications, multi-level approval configuration, payments, reports, and web/mobile delivery remain in the full product scope; they are not implied to be delivered by the desktop MVP.

## 2. Architectural style and boundaries

Use a layered modular monolith with Ports and Adapters. The initial deliverable is one desktop application deployment; the Maven modules are compile-time boundaries, not independently deployed services. The domain owns invariants and calculations; application services implement use cases and coordinate ports; infrastructure adapters implement persistence, notification delivery, and receipt storage. Dependencies point inward: Swing and infrastructure depend on application/domain abstractions, while domain code has no dependency on Swing, JDBC, or a database vendor. See `design-and-traceability.md` and PlantUML sources in `diagrams/` for the detailed design.

```text
Desktop MVP
  Swing views/controllers -> application use cases -> domain model
                                              |          |
                                              v          v
                                      repository ports  pure rules
                                              |
                                      SQLite/JDBC adapter

Future full product boundary (not implemented)
  Web client ----\
  Android app ----+--> authenticated API --> same application/domain rules
  iOS app --------/                              |
  Swing client (optional)                         +--> shared persistent store
                                                  +--> notification adapter
                                                  +--> receipt object storage
```

The desktop MVP can invoke application services in-process and persist locally. For multi-device consistency, shared access control, and cross-client convergence, the complete product needs a server as the authoritative application boundary; clients should not connect directly to the production database. Expose use cases through a versioned API and reuse domain/application code where deployment and client language permit. If the web/mobile stacks cannot run the Java application layer directly, keep the API as the sole policy boundary and use contract/integration tests to protect behavior.

## 3. Proposed Maven module structure

Use a Maven parent at the repository root (`pom.xml`) with `<maven.compiler.release>21</maven.compiler.release>` and centrally managed dependency/plugin versions. Keep the initial reactor small; use package boundaries until separate Maven modules provide a concrete benefit.

```text
splitsmart-parent/
  pom.xml                         # Java 21 release; dependency/plugin management
  splitsmart-domain/              # Entities, Money, policies; no framework dependencies
  splitsmart-application/         # Use cases, request/results, repository and gateway ports
  splitsmart-infrastructure/      # SQLite/JDBC repositories, migrations, notification/receipt adapters
  splitsmart-desktop/             # Swing screens/controllers and application composition root
```

Dependency direction: `domain` is standalone; `application` depends on `domain` and owns the ports; `infrastructure` implements those ports and depends on `application`/`domain`; `desktop` depends on `application` and `infrastructure` only at the composition root. The application module must not depend on Swing or concrete database classes. If receipt or notification adapters become substantial, they may be split into modules later with an explicit maintenance benefit. No server module, API gateway, broker, or separately deployed service is part of the initial implementation. A shared authenticated backend/API and web/mobile clients are future possibilities required to satisfy CR-010, and need a separate approved design.

Suggested package areas inside the domain/application: `account`, `group`, `expense`, `approval`, `balance`, `payment`, `notification`, and `report`. Keep authorization checks in application use cases and enforce data scoping in repository queries as defense in depth.

## 4. Responsibilities and class design

### Domain

- `Account`, `ExpenseGroup`, and `Membership` model identity and group access state. Store a password hash, never a raw password; email verification and recovery are account/authentication workflows.
- `Expense` records submitter, exactly one payer, amount, currency, date, description, allocation method, participants/allocations, receipt reference, and review state. The payer is a group member and can be outside the participant list.
- `AllocationPolicy` calculates equal or percentage shares. Validate positive amounts and currency precision; percentages must be nonnegative and total exactly 100%. Use `BigDecimal` throughout. Resolve minor-unit remainders by largest fractional remainder, then displayed participant order; resulting shares must sum exactly to the expense total.
- `ApprovalPolicy`/`ApprovalStep` represent configured review requirements. Pending or rejected expenses have no balance effect; posting is enabled only when all required steps are approved.
- `BalanceCalculator` derives pairwise obligations from approved expenses and settled payments. A payer is credited for the full expense while allocations identify each participant's share. Do not treat a materialized balance as the authoritative ledger.
- `Payment` captures debtor, creditor, amount, and date. Reject a payment above the current amount owed; support partial and full settlement.
- Use immutable value objects where practical: `Money` (amount plus currency), `CurrencyUnit` (code and supported minor-unit scale), `EmailAddress`, `ExpenseId`, `GroupId`, and `DateRange`. Never assume every currency has two decimal places. The supported currency set and mixed-currency behavior remain open product decisions; until decided, a group uses one configured currency as assumed by the spec. Construct `BigDecimal` from validated decimal text (`new BigDecimal(input)`), never from `double` or `float`. Validate entered scale against the selected currency. For positive expense allocations, compute exact shares, take each base share at the currency minor-unit scale with `RoundingMode.DOWN`, then distribute remaining minor units by largest fractional remainder; ties use the displayed participant order. Do not round the expense itself. Any other rounding boundary must name its mode; use `RoundingMode.HALF_EVEN` only for display-only conversions if a conversion is required. Persist exact values as SQL `NUMERIC/DECIMAL` with precision and scale chosen for the supported range, and validate scale before writes. Never use floating-point database types. Display with currency-aware formatting without changing the stored value.

### Application

Use case services expose operations such as `RegisterAccount`, `CreateGroup`, `InviteMember`, `SubmitExpense`, `ReviewExpense`, `GetBalances`, `RecordPayment`, and `GenerateReport`. Each operation authenticates/authorizes the actor, loads aggregates through repository interfaces, invokes domain behavior, and commits changes through a unit-of-work/transaction port. Publish domain events after commit for notifications and other side effects. Keep Swing event handlers thin: collect input, call a use case, render its result; they must not calculate splits, approvals, or balances.

### Adapters and presentation

Swing screens and controllers live in `splitsmart-desktop`. They use application request/response models and an injected service facade; they do not issue SQL. JDBC adapters map persistence records to domain objects. A notification adapter can initially persist in-app notifications; email/push delivery is a replaceable adapter once channels are confirmed. Receipt storage uses a port so local development can use a controlled local directory and a hosted deployment can use object storage.

## 5. Class diagram (PlantUML)

```plantuml
@startuml
skinparam classAttributeIconSize 0
package "domain" {
  class Account
  class ExpenseGroup
  class Membership
  class Expense
  class Allocation
  class ApprovalStep
  class Payment
  class Money
  interface AllocationPolicy
  class BalanceCalculator
  class ReportQuery
  class Notification
  Account "1" -- "0..*" Membership
  ExpenseGroup "1" -- "1..*" Membership
  ExpenseGroup "1" -- "0..*" Expense
  Expense "1" *-- "1..*" Allocation
  Expense "1" *-- "0..*" ApprovalStep
  Expense --> "1" Account : submitter
  Expense --> "1" Account : payer
  Allocation --> "1" Account : participant
  Payment --> "1" Account : debtor
  Payment --> "1" Account : creditor
  Expense --> Money
  Allocation --> Money
  Payment --> Money
  AllocationPolicy ..> Expense
  BalanceCalculator ..> Expense
  BalanceCalculator ..> Payment
}
package "application" {
  class SubmitExpenseService
  class ReviewExpenseService
  class RecordPaymentService
  class BalanceQueryService
  class ReportService
  interface ExpenseRepository
  interface GroupRepository
  interface PaymentRepository
  interface NotificationPort
  interface ReceiptStore
  SubmitExpenseService ..> ExpenseRepository
  SubmitExpenseService ..> GroupRepository
  SubmitExpenseService ..> NotificationPort
  SubmitExpenseService ..> ReceiptStore
  ReviewExpenseService ..> ExpenseRepository
  RecordPaymentService ..> PaymentRepository
  BalanceQueryService ..> ExpenseRepository
  ReportService ..> ExpenseRepository
}
package "adapters" {
  class JdbcExpenseRepository
  class JdbcGroupRepository
  class JdbcPaymentRepository
  class SwingExpenseController
  class ExpenseView
  JdbcExpenseRepository ..|> ExpenseRepository
  JdbcGroupRepository ..|> GroupRepository
  JdbcPaymentRepository ..|> PaymentRepository
  SwingExpenseController --> SubmitExpenseService
  SwingExpenseController --> ExpenseView
}
@enduml
```

The diagram is conceptual: supporting DTOs, authentication/session components, invitation state, report result types, transaction ports, and database migration classes are omitted for readability. Keep the PlantUML source synchronized with implementation as modules evolve.

## 6. Storage and transaction strategy

### Desktop MVP

Use SQLite through JDBC for the initial single-desktop MVP, with schema migrations and foreign keys enabled. Store normalized records for accounts, groups, memberships/invitations, expenses, allocations, approval steps, payments, and notifications. Persist amounts as exact `NUMERIC/DECIMAL` or exact decimal text plus currency code; never use SQL floating-point for money. The selected mapping must preserve the original decimal exactly and validate supported scale in domain/application code. Wrap each use case that changes related records in one database transaction. Store receipt files outside relational rows only when receipt support is in the active scope, with metadata and generated opaque identifiers in SQLite.

Store receipt bytes outside relational rows, under generated opaque identifiers; persist metadata (identifier, content type, size, checksum, owning expense) in the database. Validate file type/size and authorization when attaching or retrieving. Back up the database and receipt directory together. Local storage is not a shared multi-client production strategy.

### Future shared multi-client product (not initial implementation)

If web, Android, iOS, or multiple simultaneous clients are scheduled, design a shared authenticated API and server-managed relational database (for example PostgreSQL) as a separate approved phase. This backend is not implemented or part of the initial modular monolith. The future database would be authoritative; transactions would atomically save expense, allocations, approval state, payments, and balance/ledger entries. Preserve an auditable ledger and derive balances or maintain a rebuildable projection. Use optimistic versioning or equivalent concurrency control for reviews and payments.

For that future server, receipt images may use private object storage with opaque keys, and notifications may use an outbox and delivery worker. These are future design options, not current infrastructure commitments. Notification channels and delivery guarantees remain open specification questions.

Use database constraints for uniqueness and referential integrity (including normalized unique verified email), application/domain validation for business rules, and scoped reads for group membership. Passwords must be stored using a modern password hashing scheme; credentials, recovery tokens, receipt content, and personal records must not be logged. Confirm deployment, retention, encryption, and backup requirements before production. SQLite/JDBC is a single-desktop deployment choice, not a multi-user hosting solution.

## 7. GUI and business logic separation

```text
Swing JFrame/JPanel
      | user intent + view state
      v
Swing controller/presenter
      | application command/query DTOs
      v
Application use case service
      | invokes
      v
Domain objects and policies
      | repository/transaction interfaces
      v
Persistence and external-service adapters
```

Swing components may validate simple input shape for immediate feedback, but the application/domain layer repeats all authoritative validation. No domain class imports `javax.swing`; no controller implements allocation, approval, payment, or balance rules. Return typed outcomes/errors to the UI rather than showing dialogs from business services. This allows JUnit 5 tests to instantiate domain and application services without a display or Swing event loop.

## 8. Test architecture

Use JUnit 5. Domain tests cover equal/percentage allocation, supported currency precision, largest-remainder tie breaking, payer distinct from participants, approval gating, pairwise balance derivation, and payment bounds. Application tests use in-memory repository/notification/receipt fakes to cover authorization, transaction outcomes, status transitions, and orchestration. Persistence adapter tests verify migrations, constraints, exact decimal mappings, and transaction rollback against a disposable database. Swing tests cover key navigation and form behavior; business rules are verified without constructing Swing. API contract and cross-client consistency checks belong to a future backend phase.

Tests are prescribed by the project constitution/spec; no tests are run as part of producing this architecture document.

## 9. Requirement coverage and unresolved decisions

| Area | Architectural support | Scope note |
|---|---|---|
| Accounts and groups (CR-001–002) | Account/group domain, auth and membership use cases, scoped repositories | Email verification/recovery provider and account lifecycle details need implementation planning. |
| Expenses, splits, receipts (CR-003–004) | Expense aggregate, allocation policy, receipt port | Desktop MVP may defer receipt UI/storage per spec. |
| Notifications and approvals (CR-005–006) | Approval state machine, notification outbox/adapter | Channels, approver permissions, and policy changes remain open. |
| Balances and payments (CR-007–008) | Ledger-derived pairwise balances; payment transaction and bounds | Payments are deferred from proposed desktop MVP, not removed from product scope. |
| Reports (CR-009) | Query/report service over authorized records | Required filters beyond date range remain open. |
| Platforms (CR-010) | Shared server/API boundary for web, Android, iOS clients | Swing alone is explicitly insufficient; roadmap and parity remain open. |

Before production planning, resolve the specification's open questions: supported currencies/mixed-currency behavior, notification channels and delivery expectations, approver permissions/self-approval and policy changes, desktop MVP relationship and platform release order/parity, report parameters and payment correction workflow, and approved service objectives. The proposed performance and availability figures are planning baselines, not customer commitments.

## 10. Initial implementation sequence

1. Establish the Maven parent and domain/application module boundaries, Java 21 configuration, and JUnit 5 dependency management.
2. Implement exact money and allocation policies, then account/group membership and authorization use cases.
3. Add expense submission, single-step approval, and ledger-based balance queries for the Swing MVP.
4. Add storage adapters/migrations and the Swing screens as a thin client of use cases.
5. Extend with multi-step approvals, notifications, payments, reports, and receipt handling according to approved scope.
6. Design and deliver the authenticated server/API and web, Android, and iOS clients to satisfy CR-010; validate shared records and permissions across clients.

Each step should retain traceability to the CR/FR/AS identifiers in `specs/001-expense-sharing/spec.md` and receive human review as required by the constitution.
