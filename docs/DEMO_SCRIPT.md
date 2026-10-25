# Video walkthrough script (recording pending)

This is a recording plan, **not** a recorded demo. Use the verified deployed application and record the browser; do not show passwords, hosting secrets or other browser tabs. Aim for 3-4 minutes.

| Time | Show | Explain |
| --- | --- | --- |
| 0:00-0:25 | Overview after sign-in | The HR problem, 10,000 fictional employees, proposed annual gross base salary scope. |
| 0:25-0:55 | Employee directory | Search an ID; filter country/department; show server pagination and annual/currency labels. |
| 0:55-1:35 | Salary editor + history | Change one salary, give a reason, save, reopen, show previous/new amounts. Mention version checking prevents stale overwrites. |
| 1:35-2:10 | Salary insights | Switch INR to USD, show totals/median and department breakdown, explain why currencies are separate. |
| 2:10-2:45 | CSV migration | Preview a deliberately invalid file; no partial import. Then show a valid preview and confirm if appropriate. |
| 2:45-3:20 | Code and tests | Show transaction boundary, one concurrency test and test results. Explain SQLite/persistent-disk trade-off. |
| 3:20-3:45 | Requirements and Git history | Show requirements before code, incremental milestones, honest AI workflow and deliberate exclusions. |

End with the actual deployed URL and repository. Add the real recording URL to README only after checking that a reviewer can open it. This script does not satisfy the video requirement until recorded.

## Narration guide

Record after signing in; keep credentials out of the recording.
Review the implementation first and explain it in your own words.

1. Overview: Explain the HR problem and annual gross base salary scope.
   The seed creates 10,000 fictional employees; the demo has 10,002
   after a two-record test import.
2. Directory: Search an employee ID and demonstrate filters/pagination.
3. Salary history: Show a saved change, its reason and old/new values.
   Explain why a stale second-tab update is rejected.
4. Reports: Switch currencies. Explain that totals and medians remain
   within one currency, without exchange-rate assumptions.
5. Import: Show invalid and valid previews. Explain atomic import and
   duplicate rejection. Use fresh fictional IDs for any new import.
6. Engineering: Show the salary/audit transaction, a concurrency test
   and successful CI. Explain SQLite, the persistent disk and the
   single-instance limitation.
7. Requirements and AI: Show requirements before implementation,
   incremental commits and the honest AI-use record in AI_WORKFLOW.md.
   Clearly identify assumptions still awaiting employer clarification.

End with the live URL and repository. Add the recording link to README
only after recording and checking reviewer access.
