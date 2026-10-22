import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Clock3, X } from "lucide-react";
import { api, ApiError, useResource } from "./api";
import { ErrorBox, Loading } from "./components";
import { actionLabels, dateTime, money } from "./format";
import type {
  Employee,
  EmployeeDetail,
  EmployeeInput,
  Metadata,
} from "./types";

const fields: (keyof EmployeeInput)[] = [
  "employee_code",
  "name",
  "email",
  "country",
  "department",
  "job_title",
  "hired_on",
  "currency",
  "annual_salary",
  "status",
];
const blank: EmployeeInput = {
  employee_code: "",
  name: "",
  email: "",
  country: "IN",
  department: "Engineering",
  job_title: "",
  hired_on: "",
  currency: "INR",
  annual_salary: "",
  status: "active",
};

export function EmployeeForm({
  employee,
  metadata,
  onSaved,
  onCancel,
}: {
  employee?: Employee;
  metadata: Metadata;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<EmployeeInput>(
    employee
      ? (Object.fromEntries(
          fields.map((key) => [key, employee[key]]),
        ) as unknown as EmployeeInput)
      : blank,
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const change = (key: keyof EmployeeInput, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setConflict(false);
    try {
      await api(employee ? `/api/employees/${employee.id}` : "/api/employees", {
        method: employee ? "PUT" : "POST",
        body: JSON.stringify(
          employee
            ? { ...form, expected_version: employee.version, reason }
            : form,
        ),
      });
      onSaved();
    } catch (error) {
      setError((error as Error).message);
      setConflict(error instanceof ApiError && error.status === 409);
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={save} className="employee-form">
      <div className="section-label">EMPLOYEE DETAILS</div>
      <div className="form-grid">
        <label>
          Full name
          <input
            required
            maxLength={120}
            value={form.name}
            onChange={(e) => change("name", e.target.value)}
            placeholder="e.g. Maya Shah"
          />
        </label>
        <label>
          Employee ID
          <input
            required
            disabled={!!employee}
            pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,31}"
            value={form.employee_code}
            onChange={(e) => change("employee_code", e.target.value)}
            placeholder="e.g. ACME-10001"
          />
        </label>
        <label className="span-two">
          Work email
          <input
            required
            type="email"
            maxLength={254}
            value={form.email}
            onChange={(e) => change("email", e.target.value)}
            placeholder="maya@acme.example.test"
          />
        </label>
        <label>
          Country
          <select
            value={form.country}
            onChange={(e) => change("country", e.target.value)}
          >
            {Object.entries(metadata.countries).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Department
          <select
            value={form.department}
            onChange={(e) => change("department", e.target.value)}
          >
            {metadata.departments.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Job title
          <input
            required
            maxLength={120}
            value={form.job_title}
            onChange={(e) => change("job_title", e.target.value)}
            placeholder="e.g. Software Engineer"
          />
        </label>
        <label>
          Hire date
          <input
            required
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={form.hired_on}
            onChange={(e) => change("hired_on", e.target.value)}
          />
        </label>
      </div>
      <div className="form-divider" />
      <div className="section-label">COMPENSATION</div>
      <p className="field-hint">
        Annual gross base salary, before taxes. Changes take effect immediately.
      </p>
      <div className="form-grid">
        <label>
          Annual base salary
          <input
            required
            inputMode="decimal"
            pattern="(0|[1-9][0-9]{0,9})(\.[0-9]{1,2})?"
            value={form.annual_salary}
            onChange={(e) => change("annual_salary", e.target.value)}
            placeholder="1800000.00"
          />
        </label>
        <label>
          Currency
          <select
            value={form.currency}
            onChange={(e) => change("currency", e.target.value)}
          >
            {metadata.currencies.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={form.status}
            onChange={(e) => change("status", e.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <div className="field-hint align-end">
          Inactive employees stay in the directory and history, and are excluded
          from salary reports.
        </div>
        {employee && (
          <label className="span-two">
            Reason for change
            <textarea
              required
              minLength={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual compensation review"
            />
          </label>
        )}
      </div>
      {error && <ErrorBox message={error} />}
      {conflict && (
        <p className="field-hint">
          Your input is still here. Copy any changes you want to keep, then
          close and reopen the record to load its latest version.
        </p>
      )}
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="button secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="button primary" disabled={saving}>
          <Check size={16} />
          {saving ? "Saving…" : employee ? "Save changes" : "Add employee"}
        </button>
      </div>
    </form>
  );
}

export function EmployeeEditor({
  employeeId,
  metadata,
  close,
  saved,
}: {
  employeeId: number | "new";
  metadata: Metadata;
  close: () => void;
  saved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const detail = useResource<EmployeeDetail>(
    employeeId === "new" ? null : `/api/employees/${employeeId}`,
  );
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="employee-dialog"
      onClose={close}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="dialog-head">
        <div>
          <div className="eyebrow">PEOPLE & PAY</div>
          <h2>
            {employeeId === "new"
              ? "Add an employee"
              : detail.data?.employee.name || "Employee details"}
          </h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close employee editor"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      <div className="dialog-body">
        {employeeId === "new" ? (
          <EmployeeForm metadata={metadata} onSaved={saved} onCancel={close} />
        ) : detail.loading ? (
          <Loading />
        ) : detail.error ? (
          <ErrorBox message={detail.error} retry={detail.retry} />
        ) : (
          detail.data && (
            <>
              <EmployeeForm
                key={detail.data.employee.version}
                employee={detail.data.employee}
                metadata={metadata}
                onSaved={saved}
                onCancel={close}
              />
              <section className="history">
                <h3>
                  <Clock3 size={18} /> Change history
                </h3>
                <p className="field-hint">
                  Most recent 100 events. Previous values remain recorded.
                </p>
                {detail.data.history.map((event) => (
                  <div className="history-event" key={event.id}>
                    <div className="history-dot" />
                    <div>
                      <strong>
                        {actionLabels[event.action] || event.action}
                      </strong>
                      <p>{event.reason}</p>
                      {event.before &&
                        (event.before.annual_salary !==
                          event.after.annual_salary ||
                          event.before.currency !== event.after.currency) && (
                          <p className="salary-diff">
                            {money(
                              event.before.annual_salary,
                              event.before.currency,
                            )}{" "}
                            {event.before.currency} →{" "}
                            {money(
                              event.after.annual_salary,
                              event.after.currency,
                            )}{" "}
                            {event.after.currency}
                          </p>
                        )}
                      <small>
                        {dateTime(event.created_at)} · {event.actor}
                      </small>
                    </div>
                  </div>
                ))}
              </section>
            </>
          )
        )}
      </div>
    </dialog>
  );
}
