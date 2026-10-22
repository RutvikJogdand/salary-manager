import { useEffect, useState } from "react";
import {
  Download,
  Plus,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { query, useResource } from "./api";
import { Empty, ErrorBox, Loading, Pagination, Select } from "./components";
import { count, initials, money } from "./format";
import type { DirectoryResult, Metadata } from "./types";

export function Directory({
  metadata,
  revision,
  edit,
  openImport,
}: {
  metadata: Metadata;
  revision: number;
  edit: (id: number | "new") => void;
  openImport: () => void;
}) {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [department, setDepartment] = useState("");
  const [currency, setCurrency] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setQ(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);
  const params = query({
    q,
    country,
    department,
    currency,
    status,
    sort,
    page,
    page_size: 25,
  });
  const result = useResource<DirectoryResult>(
    "/api/employees?" + params,
    revision,
  );
  function filter(set: (v: string) => void) {
    return (value: string) => {
      set(value);
      setPage(1);
    };
  }
  function reset() {
    setSearch("");
    setQ("");
    setCountry("");
    setDepartment("");
    setCurrency("");
    setStatus("");
    setPage(1);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR PEOPLE, IN ONE PLACE</div>
          <h1>Employee directory</h1>
          <p>
            Find a person. Review their pay. Keep every change accounted for.
          </p>
        </div>
        <button className="button primary" onClick={() => edit("new")}>
          <Plus size={17} />
          Add employee
        </button>
      </div>
      <section className="panel directory-panel">
        <div className="directory-toolbar">
          <div className="search">
            <Search size={18} />
            <input
              aria-label="Search employees"
              placeholder="Search by name, email or employee ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="toolbar-actions">
            <button className="button secondary" onClick={openImport}>
              Import CSV
            </button>
            <a
              className="button secondary"
              href={"/api/employees/export?" + params}
            >
              <Download size={16} />
              Export results
            </a>
          </div>
        </div>
        <div className="filters">
          <SlidersHorizontal size={16} />
          <Select label="Country" value={country} onChange={filter(setCountry)}>
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
            onChange={filter(setDepartment)}
          >
            <option value="">All departments</option>
            {metadata.departments.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
          <Select
            label="Currency"
            value={currency}
            onChange={filter(setCurrency)}
          >
            <option value="">All currencies</option>
            {metadata.currencies.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
          <Select label="Status" value={status} onChange={filter(setStatus)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Select label="Sort" value={sort} onChange={filter(setSort)}>
            <option value="name">Name A–Z</option>
            <option value="code">Employee ID</option>
            <option value="salary">Currency, then salary ↑</option>
            <option value="updated">Updated: oldest first</option>
          </Select>
          {(q || country || department || currency || status) && (
            <button className="text-button" onClick={reset}>
              Reset
            </button>
          )}
        </div>
        <div className="table-meta">
          <span>
            {result.data
              ? `${count(result.data.total)} employees`
              : "Employee records"}
          </span>
          <span>Salary basis: annual gross base pay</span>
        </div>
        {result.loading ? (
          <Loading text="Finding employees…" />
        ) : result.error ? (
          <ErrorBox message={result.error} retry={result.retry} />
        ) : !result.data?.items.length ? (
          <Empty title="No employees match these filters">
            Try a different name or reset your filters.
          </Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department / role</th>
                  <th>Country</th>
                  <th className="right">Annual base salary</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Open record</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <button
                        className="person"
                        onClick={() => edit(person.id)}
                      >
                        <span className={"avatar color-" + (person.id % 4)}>
                          {initials(person.name)}
                        </span>
                        <span>
                          <strong>{person.name}</strong>
                          <small>{person.employee_code}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <strong className="normal">{person.department}</strong>
                      <small>{person.job_title}</small>
                    </td>
                    <td>{metadata.countries[person.country]}</td>
                    <td className="right tabular">
                      <strong>
                        {money(person.annual_salary, person.currency)}
                      </strong>
                      <small>{person.currency} / year</small>
                    </td>
                    <td>
                      <span className={"status " + person.status}>
                        <i />
                        {person.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${person.name} (${person.employee_code})`}
                        onClick={() => edit(person.id)}
                      >
                        <ArrowUpRight size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result.data && (
          <Pagination page={page} total={result.data.total} onPage={setPage} />
        )}
      </section>
    </>
  );
}
