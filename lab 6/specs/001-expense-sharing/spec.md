# Feature Specification: SplitSmart Expense Sharing

**Feature Branch**: Not created; feature directory: `specs/001-expense-sharing`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: Create a testable SplitSmart feature specification from the authoritative `UserRequirement.md`; preserve all customer features, identify actors, scenarios, functional and non-functional requirements, acceptance criteria, traceability, and open questions; label the Java Swing MVP subset separately.

## Clarifications

### Session 2026-10-29

- Q: How should an expense identify the person who paid, relative to the members who shared it? → A: One group member pays the full expense; they may or may not be a participant.
- Q: Who should be able to add or remove group members, and what should happen to their existing or pending expenses when they leave? → A: Managers invite existing accounts and invitees accept; managers remove members; removal blocks future access but preserves historical records, and pending expenses remain for an active approver.
- Q: What rules should SplitSmart apply to expense amounts, percentage totals, and leftover cents when splitting? → A: Amounts must be positive and within supported currency precision; percentages must be nonnegative and total exactly 100%; distribute leftover minor units by largest fractional remainder, breaking ties by displayed participant order.
- Q: How should a person prove their identity when creating an account and logging in to SplitSmart? → A: Unique verified email and password; users can recover access through email.
- Q: How should SplitSmart apply a recorded payment to the balance between the person paying and the person receiving it? → A: Allow partial or full payments; reject amounts greater than the current amount owed.

## Actors

- **Account holder**: A person with a SplitSmart account who can access their own expense and balance information.
- **Group creator/manager**: An account holder who creates and manages a shared-expense group and its membership.
- **Group member**: An account holder included in a group and potentially involved in that group's expenses.
- **Expense submitter**: A group member who enters an expense and identifies the people involved.
- **Approver**: A group member authorized by the group to review an expense before it affects balances.
- **Report viewer**: An authenticated account holder who views reports and summaries for information they are permitted to access.

One account holder may act in several roles. Approval permissions remain an open question.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create an account and shared group (Priority: P1)

As a person sharing expenses with others, I want my own account and a group for the people I share with, so that expense and balance information is available to the right people.

**Why this priority**: Accounts and groups establish the people and shared context required by the rest of the product.

**Independent Test**: Create two accounts, sign in as each, create a group, add the second account, and verify that the group's members and each account's private information are correctly scoped.

**Acceptance Scenarios**:

1. **AS-001** Given a person without an account, when they create an account with the required details and sign in, then they can access their own expense and balance information.
2. **AS-002** Given an authenticated group manager, when they create a group, update its details, invite an existing account holder, and remove a member, then the invitee can access the group only after accepting; the removed member loses future access while historical records remain.
3. **AS-003** Given an authenticated member, when they view their account, then another user's private expense and balance information is not exposed unless shared through a group.
4. **AS-024** Given a group member is removed while one of their expenses is pending review, when the group continues operating, then the expense and historical records remain and an active approver can resolve the pending expense.
5. **AS-027** Given a person creating an account, when they provide a unique email address, verify it, and set a password, then they can sign in with that email and password and can request account recovery through the verified email.

### User Story 2 - Submit, review, and account for a shared expense (Priority: P1)

As a group member, I want to record an expense, identify the people involved, and split it fairly, so that the group can review it and its approval can update what each person owes.

**Why this priority**: Expense entry, review, and resulting balances are the core shared-expense journey.

**Independent Test**: In a group with multiple members, submit an expense with its payer, required details, and participants, verify it is pending review, approve it, and verify the resulting pairwise balances.

**Acceptance Scenarios**:

1. **AS-004** Given an active group with three participating members, when a member submits an expense of 90 currency units with a date, description, payer, and equal allocation, then the expense is recorded for review and each participant is allocated 30 currency units.
2. **AS-005** Given an expense of 100 currency units split 60% and 40% between two participants, when the allocation percentages total 100%, then their allocated amounts are 60 and 40 currency units respectively.
3. **AS-006** Given an expense with an optional receipt image, when the submitter attaches it, then the receipt is associated with that expense; when no image is attached, the expense can still be submitted.
4. **AS-007** Given a submitted expense awaiting approval, when a permitted approver approves it, then it becomes approved and is included in balance calculations.
5. **AS-008** Given a submitted expense awaiting approval, when it has not yet been approved or is rejected, then it does not change balances.
6. **AS-009** Given a group configured for one or more approval steps, when an expense is reviewed, then it affects balances only after all required approval steps are complete.
7. **AS-010** Given an approved expense, when a group member views their balances, then the system reflects each user's amount owed to every other user for the group's approved expenses.
8. **AS-022** Given an expense with a negative percentage, missing participant allocation, or percentages that do not total 100%, when the submitter attempts to submit it, then the system rejects the invalid allocation and identifies what must be corrected.
9. **AS-023** Given an active group, when a member who is not a participant pays 60 currency units for an expense split equally between two other members and the expense is approved, then the payer is credited as the person who paid and each participant owes 30 currency units to the payer.
10. **AS-025** Given an expense with an amount of zero, a negative amount, or more fractional digits than the group's currency supports, when the submitter attempts to submit it, then the system rejects the amount and explains the correction required.
11. **AS-026** Given a positive expense whose equal or percentage-based shares leave fractional minor currency units, when the split is calculated, then the system distributes leftover units by largest fractional remainder, breaks ties using the displayed participant order, and the final shares sum exactly to the expense amount.

### User Story 3 - Notify members about an expense (Priority: P2)

As a group member, I want other group members to be notified when an expense is submitted, so that I know it is available for review.

**Why this priority**: Timely notice supports review and keeps group members informed.

**Independent Test**: Submit an expense in a group and verify that other members receive a notification identifying the expense and its review status.

**Acceptance Scenarios**:

1. **AS-011** Given a group with multiple members, when one member submits an expense, then the other group members receive a notification that identifies the expense and indicates that it awaits review.
2. **AS-012** Given an expense that is approved or rejected, when its status changes, then the submitter and relevant group members can see the resulting status.

### User Story 4 - Record a settlement payment (Priority: P2)

As a group member who owes another member money, I want to record a payment, so that the group's balances reflect the settlement.

**Why this priority**: Payments close the loop between calculated obligations and settled balances.

**Independent Test**: Create an approved expense that results in a balance, record a payment against that obligation, and verify the updated balance and payment record.

**Acceptance Scenarios**:

1. **AS-013** Given an outstanding balance between two members, when the debtor records a partial or full payment with its amount, date, payer, and recipient, then the payment is recorded and the outstanding balance is reduced by the payment amount.
2. **AS-014** Given a payment that fully settles an outstanding balance, when the payment is recorded, then the corresponding amount owed becomes zero.
3. **AS-015** Given a payment greater than the outstanding amount, when the member attempts to record it, then the system does not silently create an invalid settlement and explains the issue.

### User Story 5 - Review expense, balance, and payment reports (Priority: P2)

As an account holder, I want summaries and reports of expenses, balances, and payments, including date-filtered results, so that I can understand group and personal spending.

**Why this priority**: Reports make recorded activity useful for review and reconciliation.

**Independent Test**: Create approved expenses and payments across multiple dates, request each report type for a date range, and compare the results with the underlying records.

**Acceptance Scenarios**:

1. **AS-016** Given recorded expenses, balances, and payments, when an authorized user requests a summary, then it presents the corresponding totals and records.
2. **AS-017** Given a start and end date, when an authorized user requests a report for that range, then the report includes only matching records and identifies the selected range.
3. **AS-018** Given a report request with additional supported parameters, when the request is run, then the results reflect those parameters.

### User Story 6 - Use SplitSmart on the supported platforms (Priority: P1)

As a person using SplitSmart, I want to use its primary web experience or an app on Android or iOS, so that I can access the product on the platforms named in the customer request.

**Why this priority**: Platform availability is an explicit customer requirement and must not be mistaken for an implementation choice.

**Independent Test**: Verify that the primary web product and applications that run on Android and iOS provide access to the applicable SplitSmart account and group functionality.

**Acceptance Scenarios**:

1. **AS-019** Given a supported browser, when a user opens the primary web product, then the user can access the SplitSmart experience.
2. **AS-020** Given an Android device or an iOS device, when a user opens the corresponding SplitSmart app, then the user can access the SplitSmart experience.
3. **AS-021** Given a user's account and shared records, when the user accesses them through supported product clients, then the applicable account and group information is consistent across clients.

### Edge Cases

- A percentage split has missing participants, negative percentages, or percentages that do not total exactly 100%.
- An amount is zero, negative, or has greater precision than the group's currency supports.
- An equal or percentage split produces a remainder smaller than the currency's smallest unit.
- An expense submitter is also the only proposed approver.
- A group member is removed while an expense is pending review.
- An expense is rejected after one or more approval steps.
- A payment is partial, duplicates an existing payment, or exceeds the outstanding amount.
- A report has no matching records, an invalid date range, or a date boundary with records on the start or end date.
- A notification cannot be delivered, or a receipt image is missing or cannot be opened.
- A user attempts to access a group, expense, receipt, report, or balance outside their authorization.

## Requirements *(mandatory)*

### Customer Requirements Inventory

This inventory preserves the features in `UserRequirement.md`. CR identifiers provide stable references for the functional requirements and traceability below.

- **CR-001 - User accounts**: Each person has an account, can log in, and can access their own expense and balance information.
- **CR-002 - Group management**: Users can create and manage groups of people sharing expenses.
- **CR-003 - Expense creation and details**: Users can create expenses containing an amount, date, description, equal or percentage-based sharing manner, and optional receipt image.
- **CR-004 - Expense participants**: Users can specify which other users were involved so balances can be adjusted appropriately.
- **CR-005 - Notifications**: Users can be notified when other group members create an expense.
- **CR-006 - Approval workflow**: Expenses are reviewed and approved before being added and used to adjust balances; a group may need a single review or multiple approval levels.
- **CR-007 - Balance tracking**: The system tracks what each user owes every other user, taking all entered expenses into account.
- **CR-008 - Payment tracking**: Users can record payments made to settle balances, with balances updated accordingly.
- **CR-009 - Reporting**: Users can view expense, balance, and payment reports and summaries, potentially with custom date ranges and other parameters.
- **CR-010 - Supported platforms**: The primary product is web-based and also has apps that run on Android and iOS.

### Functional Requirements

- **FR-001 (CR-001)**: The system MUST allow each person to create and use an individual account and log in.
- **FR-002 (CR-001)**: The system MUST let an authenticated account holder access their own expense and balance information.
- **FR-003 (CR-002)**: The system MUST let authorized users create and manage groups and their membership.
- **FR-004 (CR-003)**: The system MUST let a group member submit an expense with an amount, date, and description.
- **FR-005 (CR-003, CR-004)**: The system MUST let the submitter identify the group members involved in an expense.
- **FR-006 (CR-003)**: The system MUST support equal and percentage-based allocations among the identified participants and MUST reject negative percentages, missing participant allocations, or percentage totals other than exactly 100%.
- **FR-007 (CR-003)**: The system MUST allow an optional receipt image to be associated with an expense.
- **FR-008 (CR-005)**: When an expense is submitted, the system MUST provide a notification to other members of the relevant group identifying the new expense.
- **FR-009 (CR-006)**: The system MUST keep a submitted expense from affecting balances until its required approval process is complete.
- **FR-010 (CR-006)**: The system MUST support a single review process and multiple approval levels according to the group's configured needs, and MUST expose the expense's review status.
- **FR-011 (CR-007)**: The system MUST calculate and present the amount owed by each user to every other user from the applicable expenses.
- **FR-012 (CR-008; Clarification Q5)**: The system MUST let a debtor record a partial or full payment to a creditor, including its amount and date, and MUST update the corresponding balance by the amount recorded.
- **FR-013 (CR-009)**: The system MUST provide reports or summaries for expenses, balances, and payments.
- **FR-014 (CR-009)**: The system MUST allow a user to request a report for a specified date range and, whenever additional report parameters are offered, MUST apply every selected parameter to the results.
- **FR-015 (CR-010)**: The primary SplitSmart product MUST be available through a web experience.
- **FR-016 (CR-010)**: SplitSmart MUST also provide an app that runs on Android and an app that runs on iOS.
- **FR-017 (Clarification Q1; expense accounting decision)**: Each expense MUST identify exactly one paying group member separately from its participants; the payer MAY be a participant or a non-participant group member. The payer MUST be credited with the amount paid, and participant allocations MUST determine their shares of the expense.
- **FR-018 (Clarification Q2; group membership decision)**: Only a group manager MUST be able to invite or remove members. An invitation MUST be accepted before the invitee becomes a member. Removal MUST block future group access without deleting historical records; pending expenses MUST remain available for resolution by an active approver.
- **FR-019 (Clarification Q3; amount validation and rounding decision)**: An expense amount MUST be positive and MUST NOT have more fractional digits than the group's currency supports. When allocations produce leftover minor currency units, the system MUST distribute them by largest fractional remainder and resolve ties by the participant order displayed to the submitter.
- **FR-020 (Clarification Q4; authentication decision)**: The system MUST verify each account's unique email address, require a password for sign-in, and provide account recovery through that verified email address.
- **FR-021 (Clarification Q5; balance settlement decision)**: The system MUST reject a payment greater than the current amount owed between the payer and recipient.

### Non-Functional Requirements

The numeric service targets below are proposed baselines for planning, not customer-specified service levels; confirm them before committing to production service objectives.

- **NFR-001 - Access control**: The system MUST restrict expense, receipt, group, report, and balance information to the account holder and group members authorized to access it. Verification MUST include attempts by a non-member to access group information.
- **NFR-002 - Monetary accuracy**: For every approved expense and recorded payment, calculations MUST reconcile to the recorded amount at the currency's smallest supported unit. Pending or rejected expenses MUST contribute zero to balances.
- **NFR-003 - Responsiveness**: Under a planning load of 100 concurrent active users, at least 95% of ordinary expense, balance, and report interactions MUST complete within 2.5 seconds, excluding external notification delivery.
- **NFR-004 - Availability**: The service MUST achieve at least 99.5% monthly availability, excluding announced maintenance.
- **NFR-005 - Cross-client consistency**: After a successful save, a user's authorized view of the same account, group, expense status, and balance MUST converge across supported clients within 5 seconds.

### Java Swing MVP Subset (Implementation Proposal; Not Customer Requirements)

The following is a deliberately limited desktop MVP candidate, derived from customer features but not approved as a change to the full product scope:

- **Included customer requirement IDs**: CR-001, CR-002, CR-003 (amount, date, description, and equal or percentage split), CR-004, CR-006 (single-step approval), and CR-007.
- The candidate demonstrates account access, group membership, expense entry and allocation, single-step review, and resulting balances through a Java Swing desktop experience.
- **Deferred from this candidate, retained in the full requirements**: optional receipt images (CR-003), notifications (CR-005), configurable multi-level approvals (CR-006), payment tracking (CR-008), reporting and custom parameters (CR-009), and the primary web, Android, and iOS product coverage (CR-010).
- This desktop candidate does not satisfy the customer's full platform requirement. The web product and Android and iOS apps remain required for the complete product.

### Implementation Decisions (Separate from Customer Requirements)

The project constitution selects Java 21, Maven, Java Swing, JUnit 5, PlantUML, object-oriented design, separation of GUI and business logic, and `BigDecimal` for money. These are engineering decisions and constraints, not requirements stated by the customer. In particular, selecting Swing for the MVP does not imply that Swing supplies the required primary web product or Android and iOS apps. The specification makes no assumption that a desktop-only implementation fulfills CR-010.

### Key Entities

- **Account**: A person's identity, unique verified email address, password-based login and email recovery, and associated personal expense and balance information.
- **Group**: A shared expense context with a name, members, and group-level review needs.
- **Membership**: A person's participation in a group and any permissions relevant to group management or review.
- **Expense**: A submitted monetary item with a submitter, exactly one payer, amount, date, description, participants, allocation method, optional receipt, and review status. The payer is a group member and may be outside the participant set.
- **Allocation**: One participant's share of an expense under the selected equal or percentage-based method.
- **Approval**: A review decision and its reviewer, status, and position in the group's required review process.
- **Balance**: An amount owed by one account holder to another, derived from approved expenses and recorded payments.
- **Payment**: A recorded settlement amount between a payer and recipient, with a date and relationship to an outstanding balance.
- **Notification**: A notice to relevant group members that an expense was submitted or its review status changed.
- **Report**: A summary or result set for expenses, balances, or payments, optionally constrained by dates and other parameters.

## Acceptance Criteria and Traceability

| Requirement | Customer source | Acceptance scenario(s) |
|---|---|---|
| FR-001 | CR-001 | AS-001 |
| FR-002 | CR-001 | AS-001, AS-003 |
| FR-003 | CR-002 | AS-002 |
| FR-004 | CR-003 | AS-004 |
| FR-005 | CR-003, CR-004 | AS-004 |
| FR-006 | CR-003 | AS-004, AS-005, AS-022 |
| FR-007 | CR-003 | AS-006 |
| FR-008 | CR-005 | AS-011 |
| FR-009 | CR-006 | AS-007, AS-008 |
| FR-010 | CR-006 | AS-007, AS-009, AS-012 |
| FR-011 | CR-007 | AS-010 |
| FR-012 | CR-008 | AS-013, AS-014, AS-015 |
| FR-013 | CR-009 | AS-016 |
| FR-014 | CR-009 | AS-017, AS-018 |
| FR-015 | CR-010 | AS-019 |
| FR-016 | CR-010 | AS-020, AS-021 |
| FR-017 | Clarification Q1 | AS-004, AS-023 |
| FR-018 | Clarification Q2 | AS-002, AS-024 |
| FR-019 | Clarification Q3 | AS-025, AS-026 |
| FR-020 | CR-001, Clarification Q4 | AS-001, AS-027 |
| FR-021 | CR-008, Clarification Q5 | AS-015 |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 21 functional requirements have at least one linked acceptance scenario, and each scenario passes on completion of its applicable scope.
- **SC-002**: In 100% of verified expense cases, equal or percentage allocations reconcile to the expense total at the supported currency unit; pending and rejected expenses produce no balance change.
- **SC-003**: In 100% of verified payment cases, the resulting balance reflects the recorded payment and never silently accepts a payment greater than the outstanding amount.
- **SC-004**: At least 95% of ordinary expense, balance, and report interactions complete within 2.5 seconds under the proposed 100-concurrent-user planning load.
- **SC-005**: The complete product passes platform acceptance checks for the primary web experience and for apps on both Android and iOS; a Swing-only MVP is explicitly insufficient to pass this criterion.
- **SC-006**: In a usability validation with at least 10 representative participants, at least 9 can submit an expense for group review and identify its resulting balance without assistance.

## Assumptions

- A person is represented by one account; group members must have an account to participate in account-linked expense and balance tracking.
- Group managers select the group's review process and authorized approvers.
- Expense notifications are sent when an expense is submitted for review, not while an unsaved draft is being edited. Notification channel and delivery guarantees remain open.
- Only approved expenses affect balances. Rejected and pending expenses remain visible with their status but do not change balances.
- A multi-level process requires every configured approval step to be completed before posting to balances.
- One currency per group is assumed for the initial product. Mixed-currency expenses remain to be confirmed.
- Reports include records the requesting account holder is authorized to view; custom date ranges are inclusive of both selected dates.
- The Java Swing MVP subset is a proposed first milestone only. All omitted customer requirements, especially web and mobile availability, remain in scope for the complete product.
- Performance and availability figures are planning targets proposed in this specification; the customer has not supplied service-level targets.

## Open Questions

1. **Currency support**: Which currencies must groups support, and can one group contain more than one currency?
2. **Notifications**: Which notification channels are required (in-app, email, push, or another channel), and are delivery or read receipts required?
3. **Approval policy**: Who may approve expenses, may the submitter approve their own expense (including as the sole approver), and what happens to pending expenses when approval settings change?
4. **Platform roadmap**: Is the Java Swing desktop MVP an explicitly accepted interim milestone alongside the web-first and Android/iOS deliverables, or is desktop UI outside the intended product? What release order and minimum feature parity are expected across clients?
5. **Reports and payment corrections**: Which report parameters beyond date range are required, and how should users correct or handle duplicate payment records?
6. **Service objectives**: Are the proposed response-time and monthly availability targets acceptable, and what production concurrency or accessibility targets should apply?

## Next Phase Notes

The specification is ready for clarification of the open product decisions and for planning once the MVP boundary, especially its relationship to the required web and mobile clients, is confirmed. No Java code is included.
