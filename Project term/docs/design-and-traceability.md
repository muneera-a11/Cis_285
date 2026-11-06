# SplitSmart Design and Requirements Traceability

**Status:** Design proposal aligned to the approved Base Architecture: Java 21 modular monolith, layered with Ports and Adapters, Java Swing desktop UI, Maven, JUnit 5, PlantUML, and `BigDecimal`. The feature specification remains Draft. This document does not claim implementation or approval of unresolved product decisions.

## 1. Source of truth and scope

- `../UserRequirement.md` is the original customer brief and remains unchanged.
- `../specs/001-expense-sharing/spec.md` is the detailed requirement specification and owns CR/FR/AS identifiers and product open questions.
- `base-architecture.md` is the approved architecture for the initial implementation.
- `alternative-architecture.md` is retained for history/future evaluation only; microservices are not selected.
- `architecture-review-report.md` records the decision and its rationale.

The proposed initial desktop MVP is limited to account access, group management, expense entry and allocation, single-step approval, and balances as stated in the spec. Deferred features remain part of the full customer scope. Swing alone does not satisfy the primary web and Android/iOS requirements (CR-010); a shared authenticated backend and those clients require a separately planned future phase.

## 2. System and layer design

### Layer responsibilities

| Layer | Responsibilities | Must not do |
|---|---|---|
| Presentation (`splitsmart-desktop`) | Swing frames, panels, forms, dialogs, table models, controllers/presenters, UI state, basic immediate input feedback | Implement allocation, approval, payment, authorization, or balance rules; execute SQL; block the Swing event dispatch thread on slow work. |
| Application (`splitsmart-application`) | Use cases, input/output models, authorization orchestration, transaction boundaries, calls to domain model, ports for repositories and external capabilities | Depend on Swing, JDBC, SQLite classes, or infrastructure implementations. |
| Domain (`splitsmart-domain`) | Account/group/expense/allocation/approval/payment/value objects and pure policies; monetary invariants and balance calculation | Depend on UI, JDBC, database vendors, or external service frameworks. |
| Infrastructure (`splitsmart-infrastructure`) | JDBC repository adapters, SQLite schema/migrations, transaction implementation, receipt storage adapter when in scope, notification adapter when channel is decided | Own business decisions or bypass application use cases. |

Dependencies point inward: desktop and infrastructure may depend on application contracts; application may depend on domain; domain is independent. The desktop composition root wires application services to infrastructure adapters. Application use cases and domain rules can therefore run in tests without Swing or a live database.

### Maven and package layout

```text
splitsmart-parent/                         # root pom.xml; Maven reactor; compiler release 21
  splitsmart-domain/
    src/main/java/.../account|group|expense|approval|balance|payment|money
  splitsmart-application/
    src/main/java/.../usecase|port|command|query|result
  splitsmart-infrastructure/
    src/main/java/.../persistence/sqlite|notification|receipt
  splitsmart-desktop/
    src/main/java/.../ui|controller|bootstrap
```

Keep this as four modules initially. The `application` module defines ports such as `AccountRepository`, `GroupRepository`, `ExpenseRepository`, `PaymentRepository`, `TransactionManager`, `NotificationPort`, and `ReceiptStore`; concrete JDBC/adapters implement them in infrastructure. Only split adapters into more Maven modules if a concrete maintenance or dependency-isolation need appears. Java build configuration must set `<maven.compiler.release>21</maven.compiler.release>` and UTF-8 source encoding in the parent. Use minimal dependencies; no Spring Boot, Hibernate, microservices framework, gateway, or event broker is assumed.

Parent POM compiler properties:

```xml
<properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
</properties>
```

### Current deployment and future boundary

Initial deployment: one Java Swing desktop application, local SQLite database accessed through JDBC, and one process/composition root. Enable SQLite foreign keys and use versioned schema migrations. Local SQLite is not a shared multi-user database. The product's required web and mobile channels may need a future authenticated server/API and shared database; this is a future design, not an implemented capability or part of the initial Maven structure. Do not let clients connect directly to a future production database.

## 3. Domain model and business design

| Concept | Purpose and invariant |
|---|---|
| `Account` | Verified unique email identity and password hash; never store a raw password. Recovery is through verified email per FR-020. |
| `ExpenseGroup` | Named shared context and currency configuration; managers control invitations/removal. |
| `Membership` | Account's group membership and permissions/state. Invitations become membership only after acceptance. Removal prevents future access and preserves history. |
| `Expense` | Submitter, exactly one payer, positive amount/currency, date, description, allocation method, participant allocations, optional receipt reference, and review status. Payer is a group member and may not be a participant. |
| `Allocation` | One participant's computed share and, for percentage allocation, source percentage. Shares are exact at the currency minor unit. |
| `ApprovalStep` | Review order, reviewer/role, decision and timestamp. Expense has no balance effect until all required approvals succeed. |
| `Payment` | Recorded debtor-to-creditor settlement, amount and date. Recording is a record of a reported transfer, not payment processing or proof the funds arrived. |
| `Money` / `CurrencyUnit` | Exact `BigDecimal` amount with currency code and configured scale; no universal 2-decimal assumption. |
| `AllocationPolicy` | Pure calculation/validation for equal and percentage splits. |
| `BalanceCalculator` | Derives pairwise obligations from approved expense allocations and recorded payments. A cached display balance, if later used, is rebuildable and not the source of truth. |

### Allocation and exact money rules

- Use `BigDecimal` for amounts, percentages, shares, payments, and balance calculations. `double`/`float` are prohibited for money. Construct from a validated decimal string (`new BigDecimal(text)`), not from a binary floating-point value.
- Currency code and supported minor-unit scale are data, not assumptions. The supported currency set and mixed-currency policy remain open. The spec's initial assumption is one currency per group.
- Reject expense amounts less than or equal to zero and input precision beyond the selected currency's supported scale. Reject negative percentages, missing participant percentages, or percentage totals not exactly 100% at the agreed input precision.
- Compute each unrounded share using `BigDecimal`. For positive shares, truncate each to the currency scale using `RoundingMode.DOWN`, then distribute remaining minor units one at a time by descending fractional remainder. Resolve equal remainders in the displayed participant order. The final shares must sum exactly to the expense amount.
- Apply rounding only at named boundaries. Allocation remainder distribution is not an unspecified general rounding mode. Display formatting must not mutate stored values. If any non-ledger conversion requires rounding, specify the mode at that boundary (candidate display conversion: `HALF_EVEN`).
- SQL persistence must use exact `NUMERIC/DECIMAL` or exact decimal text with currency metadata; choose sufficient precision/scale for the supported domain. Validate scale before storage. Never use SQL `REAL`, `FLOAT`, or `DOUBLE` for money. For any future JSON API, serialize amounts as decimal strings plus currency, not JSON floating-point numbers.

### Approvals, balances, payments

- Submission creates a pending expense; pending and rejected expenses contribute zero to balances.
- Only an authorized approver may decide a review step. Once all configured steps are approved, the expense becomes eligible for balance calculation. The spec says approver permissions and self-approval are open; do not encode unapproved permission rules.
- The payer is credited with the full expense; participants are charged their allocations. Pairwise obligations are derived by netting each participant's share against the payer's credit, while ensuring a payer who also participates is not charged their own share. The detailed ledger representation should be confirmed during implementation design and verified by example scenarios AS-004/023.
- Payments reduce the current debtor-to-creditor obligation; partial and full payments are supported. Reject amounts above the current outstanding amount. Use a transaction and concurrency-safe read/validate/write boundary so repeat/concurrent operations cannot overpay. Payment entry records a reported settlement; no external payment processor is implied.
- Preserve expense review history and payment transaction history. Correcting/removing duplicate or mistaken payments is an open question and must not be silently inferred.

## 4. Use cases and adapter contracts

Application use cases are plain Java classes, e.g. `RegisterAccount`, `CreateGroup`, `InviteMember`, `AcceptInvitation`, `RemoveMember`, `SubmitExpense`, `ReviewExpense`, `GetGroupBalances`, `RecordPayment`, `GenerateExpenseReport`, and `GetGroupDetails`. A use case receives a command/query and authenticated actor context, enforces access scope, loads required domain state using ports, invokes domain methods/policies, persists changes within a transaction, and returns a result or typed validation/authorization error.

Repository interfaces return domain aggregates or explicit query projections. Keep Swing-specific concerns out of the return types. Controllers translate user intent to application commands and results to view state. UI validation is for quick feedback only; application/domain validation is authoritative and rechecks all values. Do not show dialogs from business services. Use typed errors for invalid values, forbidden actions, missing records, and storage failures; show actionable messages without exposing secrets or SQL details.

## 5. Persistence model and integrity

Initial normalized SQLite tables are proposed for `account`, `expense_group`, `membership`, `invitation`, `expense`, `allocation`, `approval_step`, `payment`, and (if in scope) `notification` and `receipt_metadata`. These names are design proposals, not an implemented schema. Use primary/foreign keys, unique normalized verified email, non-null constraints, indexes for group/date/account lookups, and migrations. Store only password hashes. Store receipt bytes in a controlled filesystem adapter outside the database if receipts are enabled; metadata refers to an opaque generated key. Validate content/size and authorize retrieval.

Use one local database transaction for each state-changing use case. Expense creation and allocation rows commit together; each approval decision and status transition commit together; a payment record and corresponding derived balance update/projection commit together if a projection is stored. Prefer computing balances from approved expenses and payments initially; avoid storing a second independently editable balance. Any cached balance must be rebuildable from authoritative transaction history.

## 6. Testing design (JUnit 5)

| Test level | Main coverage | Dependencies |
|---|---|---|
| Domain unit tests | Money validation, supported scale, equal/percentage allocations, largest-remainder tie order and total, payer outside participant set, approval transitions, pairwise balances, partial/full/overpayment | No Swing, database, or external services. |
| Application use-case tests | Authorization and scoping, group invitation/removal, pending expense behavior, transaction orchestration, typed error outcomes, reports/filter boundaries | In-memory fake repositories and transaction/notification/receipt ports. |
| Persistence adapter tests | SQLite migrations, foreign keys, exact decimal mapping, uniqueness, repository queries, rollback | Temporary test database; no production data. |
| Swing presentation tests | Key navigation, input feedback, controller command mapping, loading/error rendering | Headless-friendly where possible; business rules are still tested below UI. |
| Acceptance/scenario tests | AS-001 through AS-027 as implemented; include unauthorized access, removed member history, rounding, approval gating, and payment limits | Use case boundary; add DB only for persistence-specific scenarios. |

All automated Java tests use JUnit 5. A test should prove behavior, not merely compilation. No test suite run or implementation is claimed by these documents.

## 7. Requirements-to-design traceability

Priorities and scenario IDs below come from the draft feature spec. Actor names match its roles. Test categories are planned JUnit 5 coverage, not evidence of passing tests. FRs link to the full CR inventory in the spec.

| ID / related CR | Requirement summary | Priority; actor | Acceptance scenarios | Use case / domain rule | Layer/component; design | Planned test category |
|---|---|---|---|---|---|---|
| FR-001 / CR-001 | Create/use individual account and sign in | P1; Account holder | AS-001, AS-027 | RegisterAccount, SignIn; unique verified email/password | Application + Account; context/component | Account use-case/auth tests |
| FR-002 / CR-001 | Access own expense/balance data | P1; Account holder | AS-001, AS-003 | GetPersonalExpenses/GetBalances; scope to actor | Application query + repositories | Authorization/scoping tests |
| FR-003 / CR-002 | Authorized group create/manage/membership | P1; Group manager | AS-002, AS-024 | CreateGroup, UpdateGroup, Invite/Accept/RemoveMember | Application + ExpenseGroup/Membership; group retrieval sequence | Membership permission/history tests |
| FR-004 / CR-003 | Submit amount/date/description expense | P1; Expense submitter | AS-004, AS-025 | SubmitExpense; amount positive and supported precision | Application + Expense/Money; submit sequence | Input validation/domain tests |
| FR-005 / CR-003/004 | Identify members involved | P1; Expense submitter | AS-004, AS-023 | SubmitExpense; participants are active group members | Application + Allocation | Participant authorization tests |
| FR-006 / CR-003 | Equal/percentage split; validate allocations | P1; Expense submitter | AS-004, AS-005, AS-022, AS-026 | AllocationPolicy; exact totals and deterministic remainders | Domain; AllocationPolicy class | Allocation/rounding unit tests |
| FR-007 / CR-003 | Optional receipt associated with expense | P1 full scope; submitter | AS-006 | AttachReceipt; opaque metadata reference and authorized access | ReceiptStore port + infrastructure | Receipt adapter/access tests |
| FR-008 / CR-005 | Notify relevant group after submission | P2; Group member | AS-011 | NotifyExpenseSubmitted | NotificationPort adapter | Application fake/adapter tests |
| FR-009 / CR-006 | Pending expense has no balance effect | P1; Approver/member | AS-007, AS-008 | SubmitExpense/ReviewExpense; approval gate | Domain + application transaction | Approval/balance unit tests |
| FR-010 / CR-006 | Single/multiple approvals and visible status | P1; Approver | AS-007, AS-009, AS-012 | ReviewExpense; all configured steps before approval | ApprovalStep/Expense; review sequence | Workflow transition tests |
| FR-011 / CR-007 | Pairwise amounts owed from applicable expenses | P1; Report viewer/member | AS-010, AS-023 | GetGroupBalances; approved expenses and payments only | BalanceCalculator; balance sequence | Balance scenario tests |
| FR-012 / CR-008 | Record partial/full payment and update balance | P2; Debtor | AS-013, AS-014 | RecordPayment; transactional balance reduction | Payment + BalanceCalculator; payment sequence | Payment calculation tests |
| FR-013 / CR-009 | Reports for expenses, balances, payments | P2; Report viewer | AS-016 | GenerateReport | Application query/report projection | Report query tests |
| FR-014 / CR-009 | Apply date range and selected report filters | P2; Report viewer | AS-017, AS-018 | GenerateReport; inclusive date bounds per spec assumption | Application/repository query | Date/filter boundary tests |
| FR-015 / CR-010 | Primary web experience | P1; Account holder | AS-019 | Future API/client use cases | Future backend/client boundary; not Swing delivery | Future platform acceptance |
| FR-016 / CR-010 | Android and iOS apps | P1; Account holder | AS-020, AS-021 | Future shared API/client use cases | Future platform boundary; not initial desktop | Future platform acceptance |
| FR-017 / clarification Q1 | Exactly one group-member payer, may be non-participant; payer credited | P1; Expense submitter | AS-004, AS-023 | SubmitExpense/BalanceCalculator | Expense/Allocation; domain class | Payer/participant balance tests |
| FR-018 / clarification Q2 | Manager invite/removal; invite accepted; preserve history/pending review | P1; Group manager/approver | AS-002, AS-024 | Invite/Accept/RemoveMember; historical access rules | Membership/repositories | Membership lifecycle/access tests |
| FR-019 / clarification Q3 | Positive supported-precision amount; largest-remainder tie by display order | P1; Expense submitter | AS-025, AS-026 | Money/AllocationPolicy | Domain + persistence exact decimal | Precision/remainder tests |
| FR-020 / clarification Q4 | Verified unique email, password sign-in, email recovery | P1; Account holder | AS-001, AS-027 | Register/Verify/SignIn/RecoverAccount | Account/application; provider remains TBD | Account validation/recovery tests |
| FR-021 / clarification Q5 | Reject payment greater than current debt | P2; Debtor | AS-015 | RecordPayment; validate under transaction/concurrency boundary | Domain/application + repository | Payment limit/concurrency tests |

## 8. Non-functional requirements and proposed additions

The draft spec defines NFR-001 access control, NFR-002 monetary accuracy, NFR-003 response time at a proposed load, NFR-004 availability, and NFR-005 cross-client consistency. NFR-003 through NFR-005 are planning targets and require owner confirmation. Security and accuracy checks map to application authorization, domain validation, and persistence constraints; their test categories appear above.

| Requirement | Current statement/status | Actor / acceptance evidence | Design element | Planned verification |
|---|---|---|---|---|
| NFR-001 Access control | Restrict group, expense, receipt, report and balance data to authorized account/group members. | Account holder/group member; AS-003, AS-024 and non-member access attempts. | Application use-case authorization plus repository scoping and DB constraints. | JUnit 5 authorization tests for members, removed members and non-members. |
| NFR-002 Monetary accuracy | Approved expenses/payments reconcile to currency minor units; pending/rejected expenses contribute zero. | Submitter, approver, debtor; AS-007–010, AS-013–015, AS-025–026. | `Money`, `AllocationPolicy`, `ApprovalStep`, `BalanceCalculator`, exact persistence. | JUnit 5 allocation, approval, balance and payment invariants. |
| NFR-003 Responsiveness | Proposed p95 of 2.5 seconds under 100 concurrent active users, excluding external notification delivery; planning target only. | Authenticated product user; expense/balance/report use cases. | Query design/indexes and bounded repository operations; local SQLite performance is not proof of production capacity. | Future load/performance test against an approved deployment and workload. |
| NFR-004 Availability | Proposed 99.5% monthly availability excluding announced maintenance; planning target only. | Product users; service availability. | Initial local desktop has no hosted availability commitment; future shared service needs operations design. | Future deployment monitoring/availability measurement, not a unit test. |
| NFR-005 Cross-client consistency | Proposed authorized views converge within 5 seconds after save; full product target, not achieved by local-only desktop. | User across supported clients; AS-021. | Future shared authenticated API/store; current Swing/SQLite deployment does not provide cross-client synchronization. | Future cross-client acceptance/integration test after backend approval. |

The specification does not assign these NFRs story priorities; do not infer them from FR priorities. NFR-003–005 values remain proposed baselines pending owner approval.

The following quality requirements are **proposed for owner review**, not approved customer commitments; assign final IDs or adopt them in the spec only after review:

| Candidate | Proposed quality need | Design/test implication | Decision needed |
|---|---|---|---|
| QNFR-01 Usability/accessibility | Core Swing workflows should be keyboard operable, provide clear validation feedback, and be reviewed against an agreed accessibility baseline. | Presentation tests plus a human usability/accessibility review. | Select baseline and measurable acceptance target. |
| QNFR-02 Data integrity/reliability | State-changing use cases must commit atomically; stored records must survive restart and a documented backup/restore procedure. | SQLite transactions, FK/unique constraints, migration and restore tests. | Confirm backup/retention expectations. |
| QNFR-03 Maintainability | Domain rules must remain independent of Swing and database implementations; changes to adapters should not require rewriting domain tests. | Enforce module dependency direction; architectural review. | No product decision; accept as engineering quality criterion. |
| QNFR-04 Testability | Expense, approval, balance and payment rules must be testable with JUnit 5 without constructing Swing or requiring a live database. | Domain and application tests with fakes. | Already consistent with the constitution. |
| QNFR-05 Auditability | Keep enough review and payment history to explain status and balance changes. | Persist approval decisions and payment records; audit-history tests. | Define correction/deletion and retention policy. |
| QNFR-06 Extensibility/platform scale | Preserve an application boundary that can later be exposed through an authenticated API without treating the Swing client as the full product. | Keep use cases UI-independent; future API contract/integration design. | Confirm web/mobile roadmap, parity, and deployment. |

These proposed additions do not silently modify the customer brief. The constitution and existing NFRs remain authoritative until the owner adopts changes.

## 9. Open decisions

The following questions remain unresolved in the spec or are needed to complete design. No answer is assumed here.

| Open decision | Why it matters | Affected documents/design |
|---|---|---|
| Supported currencies, per-currency scale, mixed currencies and conversion | Defines input validation, `Money`, database precision, reports, and balance semantics. | Spec, Money/Allocation design, schema, tests. |
| Approver role rules, self-approval, thresholds, settings changes during pending reviews | Defines who can approve and transitions for expenses already in review. | Spec, use cases, approval state model, access tests. |
| Notification channels, retries and delivery/read guarantees | Determines adapters, delivery status and tests. | Spec, notification port/adapter, deployment plan. |
| Receipt type/size limits, storage location, retention and access | Determines file validation, adapter and backup/security model. | Spec, ReceiptStore, schema, access tests. |
| Whether a submitted, pending, approved, or rejected expense can be edited, cancelled, or corrected | The customer asks to create expenses but does not define edit/cancel transitions; changing a posted expense can alter balances and audit history. | Spec, Expense state model, use cases, transaction history/tests. |
| Authentication/recovery provider and session lifecycle | Email/password behavior is specified, but implementation mechanism and threat controls are not. | Spec, account use cases, infrastructure/security plan. |
| Payment confirmation, duplicate correction, edit/void policy | Current requirement records payments and rejects overpayment but does not define actual money movement or corrections. | Spec, Payment model, audit history, tests. |
| Report parameters beyond date range and authorization scope | Determines report request model and query/index strategy. | Spec, report use case and acceptance tests. |
| Desktop-only MVP approval versus required web/mobile sequence and feature parity | Determines whether local SQLite is temporary and when shared API/backend is required. | Spec, roadmap, deployment and client design. |
| Database choice/deployment, backups, encryption and retention | SQLite is proposed for one desktop; production data handling needs explicit policy. | Architecture, infrastructure and operations documentation. |
| Proposed performance, availability, usability and accessibility targets | Numeric or measurable targets are not all customer-confirmed. | Spec NFRs, test/acceptance plan. |

## 10. Related diagrams

PlantUML source is under `diagrams/`: `system-context.puml`, `layered-modules.puml`, `domain-class.puml`, and sequence diagrams for expense submission, approval/rejection, balance retrieval, payment recording, and Swing group/expense retrieval. They depict the approved modular monolith only. No rendering or syntax validation is claimed unless run separately.
