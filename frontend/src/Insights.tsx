import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Coins,
  Globe2,
  Users,
  Wallet,
  Info,
} from "lucide-react";
import { query, useResource } from "./api";
import { Empty, ErrorBox, Loading, Select } from "./components";
import { count, money } from "./format";
import type { Metadata, Report } from "./types";

export function Insights({
  overview = false,
  metadata,
  revision,
  openDirectory,
}: {
  overview?: boolean;
  metadata: Metadata;
  revision: number;
  openDirectory: () => void;
}) {
  const [currency, setCurrency] = useState("INR");
  const [group, setGroup] = useState("department");
  const [country, setCountry] = useState("");
  const [department, setDepartment] = useState("");
  const report = useResource<Report>(
    "/api/reports?" + query({ currency, group_by: group, country, department }),
    revision,
  );
  const data = report.data;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {overview ? "THE BIG PICTURE" : "UNDERSTAND YOUR COMPENSATION"}
          </div>
          <h1>
            {overview ? (
              <>
                A clear view of <em>people & pay.</em>
              </>
            ) : (
              "Salary insights"
            )}
          </h1>
          <p>
            {overview
              ? "Your people, your salary data, and the clarity to make better decisions."
              : "Explore how annual base pay is distributed across your organization."}
          </p>
        </div>
        {overview && (
          <button className="button secondary" onClick={openDirectory}>
            View employees
            <ArrowUpRight size={17} />
          </button>
        )}
      </div>
      <div className="report-controls">
        <span className="basis">
          <span className="live-dot" />
          Current salaries · Active employees
        </span>
        <div className="report-selects">
          <Select
            label="Reporting currency"
            value={currency}
            onChange={setCurrency}
          >
            {metadata.currencies.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
          {!overview && (
            <>
              <Select label="Country" value={country} onChange={setCountry}>
                <option value="">All countries</option>
                {Object.entries(metadata.countries).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </Select>
              <Select
                label="Department"
                value={department}
                onChange={setDepartment}
              >
                <option value="">All departments</option>
                {metadata.departments.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </>
          )}
        </div>
      </div>
      {report.loading ? (
        <Loading text="Calculating salary insights…" />
      ) : report.error ? (
        <ErrorBox message={report.error} retry={report.retry} />
      ) : (
        data && (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <span className="stat-icon">
                  <Users size={19} />
                </span>
                <div className="stat-label">
                  {overview
                    ? "People in your organization"
                    : `Active employees · ${currency}`}
                </div>
                <div className="stat-value">
                  {count(
                    overview
                      ? data.organization.active + data.organization.inactive
                      : data.summary.headcount,
                  )}
                </div>
                <div className="stat-note">
                  {overview
                    ? `${count(data.organization.active)} active · ${count(data.organization.inactive)} inactive`
                    : "Matching your report filters"}
                </div>
              </div>
              <div className="stat-card featured">
                <span className="stat-icon">
                  <Wallet size={19} />
                </span>
                <div className="stat-label">
                  Annual base salary · {currency}
                </div>
                <div
                  className="stat-value monetary"
                  title={money(data.summary.total, currency)}
                >
                  {money(data.summary.total, currency)}
                </div>
                <div className="stat-note">
                  Across {count(data.summary.headcount)} active employees
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">
                  <Coins size={19} />
                </span>
                <div className="stat-label">
                  Median annual salary · {currency}
                </div>
                <div className="stat-value monetary">
                  {money(data.summary.median, currency)}
                </div>
                <div className="stat-note">The middle salary in this group</div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">
                  <Globe2 size={19} />
                </span>
                <div className="stat-label">
                  {overview
                    ? "Pay currencies"
                    : `Mean annual salary · ${currency}`}
                </div>
                <div className={"stat-value " + (!overview ? "monetary" : "")}>
                  {overview
                    ? count(data.currencies.length)
                    : money(data.summary.mean, currency)}
                </div>
                <div className="stat-note">
                  {overview
                    ? "Reported separately, with no conversion"
                    : "Total annual salary ÷ active headcount"}
                </div>
              </div>
            </div>
            <div className={overview ? "overview-grid" : ""}>
              <section className="panel report-panel">
                <div className="panel-head">
                  <div>
                    <h2>Where salary spending goes</h2>
                    <p>Annual gross base salary in {currency}</p>
                  </div>
                  <div className="segmented" aria-label="Group salary report">
                    <button
                      className={group === "department" ? "selected" : ""}
                      onClick={() => setGroup("department")}
                    >
                      Department
                    </button>
                    <button
                      className={group === "country" ? "selected" : ""}
                      onClick={() => setGroup("country")}
                    >
                      Country
                    </button>
                  </div>
                </div>
                {!data.groups.length ? (
                  <Empty title="No salaries in this view">
                    Choose another currency or filter to explore your data.
                  </Empty>
                ) : (
                  <div
                    className="bar-chart"
                    role="img"
                    aria-label={`Annual salary spending by ${group}, in ${currency}. Exact values follow each bar.`}
                  >
                    {data.groups.map((item, index) => (
                      <div className="bar-row" key={item.label}>
                        <div className="bar-label">
                          <span>{item.label}</span>
                          <small>{count(item.headcount)} people</small>
                        </div>
                        <div className="bar-track">
                          <div
                            className={"bar-fill bar-" + (index % 6)}
                            style={{
                              width: `${Math.max(1, (Number(item.total) / Number(data.groups[0].total)) * 100)}%`,
                            }}
                          />
                        </div>
                        <div className="bar-amount">
                          {money(item.total, currency)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="panel-foot">
                  <Info size={15} />
                  <span>
                    One currency per view. Inactive employees, bonuses and
                    benefits are excluded.
                  </span>
                </div>
              </section>
              {overview && (
                <aside className="context-card">
                  <div className="context-orbit">
                    <Globe2 size={42} strokeWidth={1} />
                    <span />
                    <span />
                  </div>
                  <span className="eyebrow">CLEAR BY DESIGN</span>
                  <h2>
                    Every number.
                    <br />
                    In context.
                  </h2>
                  <p>
                    Salary means annual gross base pay. Each currency keeps its
                    own story.
                  </p>
                  <div className="context-line">
                    <CheckMark />
                    Current salaries, never projections
                  </div>
                  <div className="context-line">
                    <CheckMark />
                    Changes with a recorded reason
                  </div>
                  <div className="context-line">
                    <CheckMark />
                    Previous values kept in history
                  </div>
                  <button onClick={openDirectory}>
                    Explore your people
                    <ArrowRight size={17} />
                  </button>
                </aside>
              )}
            </div>
            <section className="panel detail-report">
              <div className="panel-head">
                <div>
                  <h2>{overview ? "A closer look" : "Salary distribution"}</h2>
                  <p>
                    {group === "department" ? "Department" : "Country"}{" "}
                    breakdown · {currency} · active employees
                  </p>
                </div>
                <span className="small-tag">
                  {count(data.summary.headcount)} people
                </span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>
                        {group === "department" ? "Department" : "Country"}
                      </th>
                      <th className="right">Headcount</th>
                      <th className="right">Total base salary</th>
                      <th className="right">Mean</th>
                      <th className="right">Median</th>
                      {!overview && (
                        <>
                          <th className="right">Minimum</th>
                          <th className="right">Maximum</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.groups.map((item) => (
                      <tr key={item.label}>
                        <td>
                          <strong>{item.label}</strong>
                        </td>
                        <td className="right">{count(item.headcount)}</td>
                        <td className="right tabular">
                          {money(item.total, currency)}
                        </td>
                        <td className="right tabular">
                          {money(item.mean, currency)}
                        </td>
                        <td className="right tabular">
                          {money(item.median, currency)}
                        </td>
                        {!overview && (
                          <>
                            <td className="right tabular">
                              {money(item.minimum, currency)}
                            </td>
                            <td className="right tabular">
                              {money(item.maximum, currency)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.groups.length && (
                <Empty title="No matching active employees">
                  There are no salary statistics for these filters.
                </Empty>
              )}
            </section>
          </>
        )
      )}
    </>
  );
}
function CheckMark() {
  return <span className="tiny-check">✓</span>;
}
