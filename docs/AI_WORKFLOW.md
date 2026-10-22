# AI-assisted development record

The candidate supplied the Incubyte brief to ChatGPT/Codex and asked to build the assessment. AI is being used for requirements framing, implementation, tests, review and documentation. No claim is made that the candidate independently wrote or reviewed generated code.

## Initial brief (summary)

Build employee salary management software for an HR manager at a 10,000-person multinational organization, using a Python/React stack, relational persistence, meaningful tests, a pre-implementation one-page requirements document, incremental commits and a deployable application.

## Decisions before code

- Keep the role's Python preference rather than choosing a JavaScript backend just to fit the built-in hosting tool.
- Identify unanswered compensation/currency/AI-product questions and explicitly label proposed scope.
- Separate currencies instead of adding unrelated monetary units.
- Include migration from spreadsheets and auditable edits because they directly address the stated workflow.
- Use fictional data only. Do not submit the work or message the hiring team automatically.

Further implementation decisions and actual validation results will be added as work progresses. Commit authorship records AI-assisted work; commits are made at real milestones, not backdated or manufactured afterwards.

## Actual implementation and verification

AI generated the Python modules, SQL schema, React interface, tests and documentation. It executed tests and the production build, inspected failures and made repairs. The human user connected Render during the work; this does not imply they reviewed or approved every product decision or code path.

Meaningful checks included exact minor-unit arithmetic, concurrent stale-edit rejection, rollback if audit insertion fails, repeatable seed preservation and import revalidation. UI component tests check salary payloads and conflict behavior. No test result, GitHub CI result, deployment or video is claimed without corresponding execution.

Corrections made during development:

- Removed an invalid CSS import after the production build identified it.
- Added CSV header parse handling after reviewing malformed-file behavior.
- Added a streamed-body size cap so missing Content-Length cannot bypass the request limit.
- Added exact BigInt-based money formatting so large report totals do not lose cents in JavaScript.
- Formatted generated Python and TypeScript into readable source files.
- Replaced a nonportable virtual-environment launch command with a cross-platform launcher. Managed preview still lacked Python dependencies; this is recorded as a verification limit rather than hidden.

51 Python tests, 5 frontend tests and the production frontend build passed. The local benchmark exercises the required 10,000-person dataset. Current infrastructure limits are documented in `VALIDATION.md` and `DELIVERY_STATUS.md`.

## Candidate review still required

Read the requirements and unresolved questions, run the app, follow `CODE_WALKTHROUGH.md`, inspect the transaction and currency rules, and explain the trade-offs in your own words. The candidate should correct choices they disagree with and commit those changes. Do not manufacture a manual-TDD story, human authorship or completed deployment history from AI-generated work.
