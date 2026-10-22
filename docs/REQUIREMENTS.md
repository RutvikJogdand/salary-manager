# ACME Compensation — one-page requirements

**Status:** proposed product scope, written before implementation on 23 October 2026. The assessment confirms the persona, 10,000 employees, multiple countries, full-stack delivery, tests, AI usage, incremental commits and deployment. The salary, reporting and workflow choices below require confirmation; they are not claims about Incubyte's unstated expectations.

**Goal and user.** An ACME HR manager can maintain employee compensation without a master spreadsheet and answer basic questions about annual salary spending. Success means locating one person quickly, making an accountable salary change and obtaining a trustworthy country/department summary across 10,000 seeded employees.

**Proposed salary definition.** Current annual gross base salary, before taxes and deductions; bonuses, benefits and employer costs are excluded. Each record has an explicit currency and stores money as integer minor units. Reports never sum different currencies. A comparison selects one currency and states that basis visibly. No exchange-rate estimates are presented as actual salary costs.

**Included in the first version.**

- An authenticated HR workspace with a searchable, paginated employee directory; country, department, currency and active/inactive filters; stable sorting and employee details.
- Add an employee and edit their profile or current salary. Require a reason for changes, retain the previous values and actor in an audit record, and reject stale edits. Deactivate/reactivate employees without deleting salary history. Future-dated salary scheduling is excluded.
- Salary reports: active headcount, total annual base salary, mean, median, minimum and maximum, grouped by country or department within one currency. Clearly label counts, filters and exclusions. Reports answer concrete questions through filters and tables; an LLM is not assumed to be a product requirement.
- Spreadsheet migration through a documented CSV template, validation preview and explicit confirmation. Import creates new employees only, rejects duplicate employee IDs/emails and invalid rows, and writes the entire batch or nothing. Export the filtered directory with spreadsheet-safe text.
- A repeatable seed command produces exactly 10,000 fictional employees across six countries and currencies. Rerunning does not overwrite HR edits. No real employee or applicant data is used.

**Quality and delivery.** Python/FastAPI backend, React/TypeScript UI and relational SQLite storage. Validate at the API and database; paginate on the server; use transactional writes and conflict detection. Test money, report calculations, import failures, authentication, competing changes and persistence. Deliver source, honest incremental commits, setup/deployment instructions, architecture/trade-offs, AI workflow notes, a deployed demonstration and a recorded walkthrough. Deployment and video must be verified before calling the submission complete.

**Deliberately excluded.** Payroll execution, tax/compliance calculations, currency conversion, payslips, employee self-service, multi-organization tenancy, approval chains, scheduled/retroactive salary revisions and an AI chatbot. These add substantial policy, security or operational scope beyond maintaining salary data. Single HR demo identity is sufficient for evaluation; production requires SSO, individual accounts, backups and operational monitoring.

**Open confirmations.** Annual base versus total compensation; separate-currency reports versus conversion; structured reporting versus AI questions; CSV migration expectations; any deadline or deployment-access requirements.
