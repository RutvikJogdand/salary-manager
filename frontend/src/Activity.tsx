import { useState } from "react";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { useResource } from "./api";
import { Empty, ErrorBox, Loading, Pagination } from "./components";
import { actionLabels, dateTime, initials, money } from "./format";
import type { AuditEvent } from "./types";

export function Activity({
  revision,
  edit,
}: {
  revision: number;
  edit: (id: number) => void;
}) {
  const [page, setPage] = useState(1);
  const result = useResource<{ items: AuditEvent[]; total: number }>(
    `/api/activity?page=${page}`,
    revision,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A RECORD YOU CAN FOLLOW</div>
          <h1>Change activity</h1>
          <p>Who changed what, when, and why. Previous values are retained.</p>
        </div>
        <span className="small-tag">
          <Clock3 size={14} />
          Latest first
        </span>
      </div>
      <section className="panel activity-panel">
        {result.loading ? (
          <Loading />
        ) : result.error ? (
          <ErrorBox message={result.error} retry={result.retry} />
        ) : !result.data?.items.length ? (
          <Empty title="Your first changes start here">
            Add an employee, import a file or update a salary. Changes will
            appear in this timeline. Seeded data is excluded.
          </Empty>
        ) : (
          <>
            {result.data.items.map((event) => (
              <div className="activity-row" key={event.id}>
                <span className={"avatar color-" + (event.employee_id % 4)}>
                  {initials(event.after.name)}
                </span>
                <div className="activity-text">
                  <button
                    className="text-button person-link"
                    onClick={() => edit(event.employee_id)}
                  >
                    {event.after.name}
                    <ArrowUpRight size={13} />
                  </button>
                  <div>
                    <span className="small-tag">
                      {actionLabels[event.action] || event.action}
                    </span>
                    <span className="event-code">
                      {event.after.employee_code}
                    </span>
                  </div>
                  <p>{event.reason}</p>
                  {event.before &&
                    (event.before.annual_salary !== event.after.annual_salary ||
                      event.before.currency !== event.after.currency) && (
                      <p className="salary-diff">
                        {money(
                          event.before.annual_salary,
                          event.before.currency,
                        )}{" "}
                        {event.before.currency} →{" "}
                        {money(event.after.annual_salary, event.after.currency)}{" "}
                        {event.after.currency}
                      </p>
                    )}
                  <small>{event.actor}</small>
                </div>
                <time>{dateTime(event.created_at)}</time>
              </div>
            ))}
            <Pagination
              page={page}
              total={result.data.total}
              onPage={setPage}
            />
          </>
        )}
      </section>
    </>
  );
}
