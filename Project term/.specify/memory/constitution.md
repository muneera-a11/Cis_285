<!--
Sync Impact Report
Version change: Unversioned template → 1.0.0 (initial adoption)
Modified principles: Template placeholders → five SplitSmart principles
Added sections: Customer Requirements and Implementation Decisions;
  Quality, Traceability, and Human Review
Removed sections: None
Follow-up TODOs: Confirm the original ratification date.
-->

# SplitSmart Constitution

## Core Principles

### I. Java 21, Maven, and Swing
Java components MUST use Java 21 and Maven. Desktop user-interface components MUST use Java Swing.
These are implementation decisions, not customer requirements. They do not replace the customer’s
requirement for a primarily web-based product and Android and iOS apps. A Swing desktop application
alone MUST NOT be represented as satisfying those platform requirements.

### II. Object-Oriented Design and GUI Separation
Code MUST use object-oriented design with clear responsibilities, encapsulated state, and
well-defined interfaces. Swing presentation code MUST be separated from business logic: business
rules and calculations MUST be callable and testable without constructing or interacting with GUI
components. GUI code MUST NOT be the source of truth for expense, approval, payment, or balance
rules.

### III. Exact Monetary Arithmetic
All monetary amounts and calculations MUST use `BigDecimal`; binary floating-point types MUST NOT
be used for money. Conversions, scale, and rounding MUST be explicit at defined boundaries.
Expense splits, percentage allocations, payments, and resulting balances MUST be tested for
correctness, including rounding behavior.

### IV. JUnit 5 Tests and PlantUML Design
Automated tests MUST use JUnit 5. Tests MUST cover business rules and important outcomes, including
expense allocation, approval effects, payment recording, and balance updates, as those behaviors
are implemented. PlantUML MUST be used for relevant architecture or design diagrams; diagrams MUST
be kept consistent with the system they describe. Neither a passing test suite nor a diagram
substitutes for validating the customer requirements.

### V. Requirement Traceability and Human Accountability
Each customer requirement MUST be traceable from its source to the relevant specification,
implementation, and verification evidence. Customer requirements MUST be distinguishable from
implementation decisions; a chosen technology MUST NOT be described as a customer-requested
feature. AI-generated requirements, designs, diagrams, and code MUST receive human review before
being accepted or relied upon. Reviewers MUST check correctness, requirement alignment, and
unresolved assumptions; AI output is not approval.

## Customer Requirements and Implementation Decisions

### Customer Requirements
The original customer request in `UserRequirement.md` defines the product scope:

- Individual user accounts for login and access to each person's expense and balance information.
- Group creation and management for shared activities and participants.
- Expense creation with amount, date, description, equal or percentage-based splitting, optional
  receipt image, and selection of involved users.
- Notifications when other group members create expenses.
- Review and approval of expenses before they are added and affect balances; the approval process
  may be single-step or multi-level, according to group needs.
- Tracking of amounts owed between users based on entered expenses.
- Recording payments that settle amounts owed and update balances.
- Expense, balance, and payment reports and summaries, potentially with custom date ranges and
  other parameters.
- A primarily web-based product, with apps that can run on Android and iOS.

These are customer-stated requirements, not proof that any feature has been implemented. Ambiguity
or a proposed change to this scope MUST be documented and resolved with the customer rather than
silently assumed.

### Implementation Decisions
The requested Java 21, Maven, Java Swing, JUnit 5, PlantUML, object-oriented design, GUI/business
logic separation, and `BigDecimal` rules in this constitution are implementation decisions. They
guide engineering work but do not amend or fulfill customer requirements by themselves. In
particular, the chosen Swing technology does not establish how the web, Android, or iOS experiences
will be delivered. That platform coverage MUST remain visible in planning and requirement
traceability.

## Quality, Traceability, and Human Review

Before a change is accepted, its applicable customer requirements and implementation decisions
MUST be identifiable, relevant JUnit 5 tests MUST pass, and AI-generated material MUST have human
review. Verification MUST cover the behavior changed, not merely compilation. Gaps between
customer-required platforms or features and the implemented system MUST be reported accurately;
they MUST NOT be hidden by tests, diagrams, or implementation choices.

## Governance

This constitution governs SplitSmart engineering and takes precedence over conflicting project
practices. Amendments MUST be reviewed and approved by a human, preserve the distinction between
customer requirements and implementation decisions, and update this document's version and
amendment date. Versioning follows semantic versioning: MAJOR for incompatible changes to
principles, MINOR for new principles or materially expanded obligations, and PATCH for
non-semantic clarifications. Changes MUST be reviewed for compliance with these principles and
for traceability to the original customer request. If the customer changes a requirement, record
that change explicitly rather than silently revising the source request.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date unknown | **Last Amended**: 2026-10-29
