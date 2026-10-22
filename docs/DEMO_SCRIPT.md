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
