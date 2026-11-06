# SplitSmart Technical Architecture Review

**Decision status:** The Base Architecture is the approved baseline for the current implementation. The Alternative Architecture is **not selected** and is retained only as historical/future evaluation material. This review records a design decision; it is not evidence of implementation or testing.

**Current design references:** [Base Architecture](base-architecture.md), [Design and Requirements Traceability](design-and-traceability.md), and [PlantUML diagrams](diagrams/).

## 1. Executive Summary

This report compares the Base Architecture and Alternative Architecture for the SplitSmart expense-sharing application.

The review evaluates both designs against the project requirements:

- Java 21
- Maven
- Java Swing GUI
- JUnit 5
- PlantUML diagrams
- Separation of GUI and business logic
- BigDecimal for accurate financial calculations

### Overall recommendation

**Proceed with the Base Architecture using a layered architecture and ports-and-adapters design.**

The decision is a modular monolith for the initial Java Swing desktop deployment. The initial Maven structure should remain small (domain, application, infrastructure adapters, desktop); these are code boundaries in one deployment, not independently deployed services. SQLite/JDBC is the proposed local MVP persistence option. A shared backend/API for web, Android, and iOS remains a future design requirement and is not implemented by selecting Swing.

The Base Architecture is the stronger choice for the current project because it provides clear separation of responsibilities, simpler development and testing, and fewer deployment and maintenance challenges.

The Alternative Architecture proposes microservices, which could provide benefits as the application grows. However, the current project does not demonstrate a need for independently deployed services. Its proposed scale of approximately 100 concurrent active users does not, by itself, justify the additional complexity.

A practical compromise is to adopt the Alternative Architecture's service boundaries as logical modules within the Base Architecture. This preserves future flexibility without introducing unnecessary distributed-system complexity.

---

## 2. Base Architecture Review

### Architecture overview

The Base Architecture follows a layered architecture combined with ports and adapters.

Its main layers are:

1. **Presentation layer:** Java Swing screens and controllers.
2. **Application layer:** Use-case services that coordinate operations.
3. **Domain layer:** Business entities, financial calculations, and business rules.
4. **Infrastructure layer:** Database access, notifications, and receipt storage.

The dependency direction points inward. The domain layer does not depend on Swing, JDBC, or database-specific implementations.

### Pros

**1. Clear separation of concerns**

The design separates presentation, application workflows, business rules, and persistence. This makes each component easier to understand and modify.

For example, expense-splitting calculations belong in the domain layer rather than inside Swing button handlers.

**2. Strong testability**

The domain and application layers can be tested independently of the graphical interface and database.

Repository interfaces also allow developers to use in-memory test implementations when testing application services.

**3. Easier maintenance**

The modular structure makes it possible to change the database implementation or replace the Swing interface without rewriting the business rules.

**4. Appropriate financial design**

The architecture introduces a Money value object that wraps BigDecimal and includes currency information and scale policies.

It also proposes a largest-fractional-remainder algorithm to ensure that allocated shares add up exactly to the original expense.

**5. Practical implementation approach**

The design allows the desktop MVP to use SQLite and JDBC while retaining a path toward a shared server and database for the complete product.

### Cons

**1. Potentially excessive module count**

The proposed Maven structure includes several modules, such as domain, application, persistence, notification, receipt, desktop, and server.

For a student project, implementing all these as separate Maven modules immediately may introduce unnecessary configuration and dependency-management work.

**2. Future server architecture requires further decisions**

The document correctly identifies the need for an authenticated server/API for web and mobile clients, but it does not fully specify the server technology, API design, or deployment model.

**3. More responsibility remains in one application boundary**

As the product grows, application services and infrastructure components could become large if their responsibilities are not carefully maintained.

### Assessment

The Base Architecture is a well-structured and practical design for the current project. Its simplicity is an advantage, particularly when the team needs to deliver a working application within a limited development period.

---

## 3. Alternative Architecture Review

### Architecture overview

The Alternative Architecture uses Java microservices.

It divides the server-side application into independently deployable services:

- Identity Service
- Group Service
- Expense Service
- Approval Service
- Ledger and Payment Service
- Reporting Service
- Notification Service

The Swing application communicates with the backend through an API Gateway and REST APIs. Services communicate through APIs and asynchronous events.

Each service owns its data and database responsibilities.

### Pros

**1. Independent service development**

Each service has a clearly defined responsibility. Developers can modify the Expense Service without necessarily changing the implementation of the Notification Service.

**2. Independent scalability**

Services can be scaled independently when their workloads differ.

For example, the Reporting Service could eventually require additional resources without scaling the entire application.

**3. Strong service ownership**

Each service owns its data, API contracts, and persistence responsibilities. This reduces direct database coupling between services.

**4. Support for multiple client platforms**

The architecture provides a shared backend for Swing, web, Android, and iOS clients.

This is important because the complete product requirements extend beyond a desktop application.

**5. Distributed workflow safeguards**

The design addresses important distributed-system problems through:

- Transactional outbox patterns.
- Inbox and event deduplication.
- Idempotent event processing.
- Retry and dead-letter handling.
- Versioned API and event contracts.

These are valuable safeguards for a system involving expense approval and financial transactions.

### Cons

**1. Increased development complexity**

Microservices introduce additional concerns, including service communication, network failures, deployment, monitoring, and event processing.

These concerns are not necessary for the initial application.

**2. More difficult testing**

Testing an operation that crosses several services requires integration and end-to-end tests.

For example, expense submission, approval, ledger posting, and balance updates involve several separate components.

**3. Eventual consistency**

The Alternative Architecture acknowledges that approval status and balance projections may not update simultaneously.

This creates additional complexity for financial workflows and user-interface feedback.

**4. Greater infrastructure requirements**

The architecture requires infrastructure for service deployment, API routing, event delivery, observability, and multiple service-owned data stores.

This increases the time and effort required to implement and maintain the application.

**5. Potential overengineering**

The specification proposes a planning load of approximately 100 concurrent active users. That requirement does not establish that microservices are necessary.

A modular monolithic application can support the current requirements with considerably less operational complexity.

### Assessment

The Alternative Architecture is technically capable and offers a stronger path toward independently scalable services. However, its complexity makes it less appropriate for the current project stage.

Its best ideas should be retained as future design considerations rather than implemented immediately.

---

## 4. Maintainability, Scalability, and Testability Comparison

| Quality attribute | Base Architecture | Alternative Architecture |
|---|---|---|
| Maintainability | High — fewer deployment components and clear internal boundaries | Medium — independent services, but more operational complexity |
| Scalability | Good — can scale the application and later introduce service boundaries | High potential — independent service scaling |
| Testability | High — domain and application logic can be tested independently | Medium — requires unit, integration, contract, and distributed workflow tests |
| Debugging | Easier — operations generally remain within one process | More difficult — requests and events cross service boundaries |
| Deployment | Simpler — fewer deployable components | More complex — multiple services and supporting infrastructure |
| Data consistency | Easier to enforce through local transactions | More challenging — distributed workflows and eventual consistency |

### Maintainability

The Base Architecture is preferable because developers can trace an operation through the presentation, application, domain, and persistence layers without following multiple network calls.

The Alternative Architecture offers independent service ownership, but developers must also manage service versions, event contracts, failures, and distributed logging.

**Winner: Base Architecture.**

### Scalability

The Alternative Architecture has greater potential for independent scaling.

However, the Base Architecture can be extended through modular boundaries and an authenticated API. It does not prevent future service extraction.

For the current project, the additional scalability offered by microservices does not outweigh their implementation cost.

**Winner: Alternative Architecture for independent service scaling; Base Architecture for current project needs.**

### Testability

The Base Architecture provides a straightforward testing strategy:

- Domain tests for financial rules.
- Application tests using fake repositories.
- Persistence tests for database operations.
- Limited Swing tests for user interactions.

The Alternative Architecture requires these tests plus API contract tests, event compatibility tests, service integration tests, and distributed workflow tests.

Both designs correctly use JUnit 5, but the Base Architecture provides a simpler testing environment.

**Winner: Base Architecture.**

---

## 5. Adherence to Project Requirements

| Project requirement | Base Architecture | Alternative Architecture |
|---|---|---|
| Java 21 | Supported; configure Maven compiler release 21 | Supported; configure each service for Java 21 |
| Maven | Parent Maven project with modular structure | Maven reactor with separate service modules |
| Java Swing GUI | Directly supported through desktop module | Supported as an API-consuming client |
| JUnit 5 | Domain, application, persistence, and UI testing | Unit, component, contract, integration, and end-to-end testing |
| PlantUML | Includes a class diagram | Includes a service-oriented class diagram |
| GUI/business separation | Strong separation through controllers and application services | Strong separation through REST client and backend services |
| BigDecimal | Money value object and exact allocation rules | BigDecimal, decimal-string APIs, exact persistence, and rounding rules |

### Java 21

Both designs are compatible with Java 21.

The Maven parent should explicitly configure the compiler release:

```xml
<properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
</properties>
```

The Alternative Architecture must maintain consistent Java versions across all Java services.

### Maven

Both designs provide appropriate Maven structures.

The Base Architecture has a simpler dependency hierarchy. The Alternative Architecture requires additional configuration for multiple independently deployable service artifacts.

For the current project, the Base Architecture is easier to build and maintain.

### Java Swing GUI

Both designs support Swing.

The Base Architecture connects Swing controllers directly to application use cases.

The Alternative Architecture connects Swing controllers to a REST client, which communicates with backend services.

Both approaches are valid. The important requirement is that Swing must not contain authoritative business rules.

### JUnit 5

Both designs use JUnit 5 appropriately.

The Base Architecture has a simpler testing strategy because business logic can be tested without starting a server or communicating over a network.

The Alternative Architecture requires more integration and distributed-system testing.

### PlantUML diagrams

Both documents include PlantUML class diagrams.

The Base Architecture diagram emphasizes domain entities, application services, repositories, and Swing components.

The Alternative Architecture diagram emphasizes service ownership and the relationships between service-level domain concepts.

Both diagrams are useful, but they should be maintained as the implementation evolves.

### Separation of GUI and business logic

Both designs satisfy this requirement conceptually.

The Base Architecture uses:

Swing View → Controller → Application Service → Domain Logic

The Alternative Architecture uses:

Swing View → Controller → REST Client → Backend Services → Domain Logic

The Base Architecture is simpler to implement while maintaining the required separation.

### BigDecimal for money precision

Both designs explicitly use BigDecimal and avoid floating-point money calculations.

The Alternative Architecture provides additional detail about serializing monetary values as decimal strings in APIs and events.

The Base Architecture provides a clear Money value object and allocation algorithm.

Both should enforce these rules:

- Never use double or float for financial calculations.
- Validate currency scale.
- Use explicit rounding policies.
- Ensure allocated shares equal the original expense.
- Test percentage and equal-split calculations.
- Preserve exact monetary values in persistence.

The Alternative Architecture's decimal-string API convention is worth adopting if the project later introduces remote services.

---

## 6. Separation of Concerns: Detailed Assessment

The Base Architecture provides the clearest implementation path for separation of concerns.

Recommended responsibilities:

**Presentation layer**
- Display Swing windows and forms.
- Collect user input.
- Show validation errors and results.
- Send commands to application services.

**Application layer**
- Coordinate use cases.
- Check authorization.
- Load and save domain objects.
- Manage transaction boundaries.

**Domain layer**
- Calculate expense allocations.
- Enforce approval rules.
- Calculate balances.
- Validate payments.
- Maintain financial invariants.

**Infrastructure layer**
- Implement JDBC repositories.
- Manage database migrations.
- Store receipts.
- Deliver notifications.

A critical design rule is that business services must never import Swing classes.

For example, a class responsible for calculating an expense split should not depend on `JFrame`, `JPanel`, or `JButton`.

This allows the same business rules to be tested independently and reused by future clients.

The Alternative Architecture also provides good separation, but it introduces a network boundary between the Swing client and backend services. This is useful for a multi-client product, but it is not required to achieve separation of concerns.

---

## 7. Recommended Improvements

Regardless of which architecture is selected, the following improvements are recommended.

### Improvements to the Base Architecture

1. Keep the initial Maven module structure small. Separate domain, application, persistence, and desktop responsibilities without creating unnecessary modules.
2. Use a Money value object that combines BigDecimal with currency metadata.
3. Keep financial calculations exclusively in the domain layer.
4. Use JUnit 5 to test allocation, approval, balance, and payment rules.
5. Use database transactions when submitting expenses, approving expenses, and recording payments.
6. Maintain an auditable record of approved expenses and settlements.
7. Define an authenticated API boundary before introducing web and mobile clients.
8. Keep the PlantUML diagrams synchronized with the actual implementation.

### Improvements worth adopting from the Alternative Architecture

1. Define clear ownership boundaries for identity, groups, expenses, approvals, ledger, and notifications.
2. Use versioned API contracts when the server is introduced.
3. Use idempotency protections for financial operations.
4. Use reliable notification delivery with an outbox pattern.
5. Use exact decimal strings for money in JSON APIs.
6. Design the application so individual modules can eventually be extracted into independent services if justified.

---

## 8. Final Recommendation

### Recommended architecture: Base Architecture with selected Alternative Architecture improvements

The Base Architecture is the better choice for the current SplitSmart project.

It satisfies the stated technical constraints while keeping the implementation manageable. Its layered structure supports maintainability, independent testing, and strong separation between Swing and business logic.

The Alternative Architecture provides valuable ideas for the future, particularly service ownership, API contracts, idempotency, and distributed notification processing. However, adopting the complete microservices approach now would add complexity without a demonstrated requirement.

### Reasons for the recommendation

1. **Simpler implementation:** Fewer components and deployment requirements.
2. **Better testability:** Business logic can be tested independently using JUnit 5.
3. **Clear separation:** Swing remains separate from application and domain logic.
4. **Financial correctness:** BigDecimal and explicit allocation rules protect money calculations.
5. **Future flexibility:** Modular boundaries make later service extraction possible.
6. **Appropriate project scale:** A modular monolith is a more reasonable starting point for the proposed workload.

### Recommended implementation direction

```text
Java Swing GUI
      |
      v
Application Services
      |
      v
Domain Layer
      |
      v
Repository Interfaces
      |
      v
JDBC / Database Adapters
```

Use Java 21 and Maven for the project build, JUnit 5 for automated tests, PlantUML for architecture documentation, and BigDecimal for all monetary calculations.

As the product expands to web, Android, and iOS, introduce an authenticated server API that exposes the same business use cases. Extract services only when independent deployment, scaling, or team ownership provides a measurable benefit.

### Final decision

**Select the Base Architecture as the primary architecture for implementation.**

The Alternative Architecture is not approved for the initial implementation. Its microservice decomposition, API gateway, broker, independently deployed services, and service-owned databases must not be treated as current architecture. Ideas such as clear module ownership, idempotency at future external boundaries, exact decimal API serialization, and auditability may be reconsidered when a shared backend is approved.

Retain selected design principles from the Alternative Architecture to make the system easier to extend in the future, but do not introduce full microservices at the current stage.

This approach offers the best balance of simplicity, maintainability, testability, financial correctness, and future scalability for SplitSmart.

---

## 9. Review Scope and Limitations

This review evaluates the two architecture proposals as written. It does not establish that either architecture has been implemented, compiled, or tested.

The documents identify several unresolved product decisions, including currency support, approval permissions, notification channels, platform delivery order, and reporting requirements. These should be resolved before final implementation planning.

**Reviewed documents:**
- `Project term/docs/base-architecture.md`
- `Project term/docs/alternative-architecture.md`

**Repository:** `muneera-a11/Cis_285`  
**Review date:** November 5, 2026

**Follow-up design artifacts:** `design-and-traceability.md` maps FR-001 through FR-021 to use cases, domain rules, architecture components, diagrams, acceptance scenarios, and planned JUnit 5 test categories. `diagrams/` contains the selected modular-monolith context, layer/module, class, and use-case sequence diagrams. These artifacts are proposals and have not been rendered or executed as tests.

Final verdict
Recommended: Base Architecture
Proceed

It meets the current project needs with less complexity, while preserving a clear path toward the multi-client product.

Important: Adopt the Alternative Architecture's API contracts, service ownership boundaries, idempotency, and outbox ideas as future-ready design principles—not as a requirement to deploy microservices now.

The main architectural issue to keep visible is that Swing alone does not satisfy the complete web, Android, and iOS product requirement. The Base Architecture should retain its planned authenticated server/API boundary as part of the long-term design.
