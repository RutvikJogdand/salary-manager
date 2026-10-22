import { useState, type ChangeEvent } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { api } from "./api";
import { ErrorBox } from "./components";
import { count, money } from "./format";
import type { ImportPreview } from "./types";

export function ImportView({
  changed,
  openDirectory,
}: {
  changed: () => void;
  openDirectory: () => void;
}) {
  const [filename, setFilename] = useState("");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportPreview>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<number>();
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview(undefined);
    setSuccess(undefined);
    setError("");
    setText("");
    if (!file) {
      setFilename("");
      return;
    }
    setFilename(file.name);
    if (file.size > 3000000) {
      setError("Choose a UTF-8 CSV smaller than 3 MB.");
      return;
    }
    try {
      setText(await file.text());
    } catch {
      setError("The file could not be read. Please choose it again.");
    }
  }
  async function validate() {
    setBusy(true);
    setError("");
    setPreview(undefined);
    try {
      setPreview(
        await api<ImportPreview>("/api/import/preview", {
          method: "POST",
          body: JSON.stringify({ csv_text: text }),
        }),
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    if (!preview?.valid) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ imported: number }>("/api/import/commit", {
        method: "POST",
        body: JSON.stringify({ csv_text: text, checksum: preview.checksum }),
      });
      setSuccess(result.imported);
      setPreview(undefined);
      setText("");
      changed();
    } catch (error) {
      setError((error as Error).message);
      setPreview(undefined);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MOVE BEYOND SPREADSHEETS</div>
          <h1>Bring your people over.</h1>
          <p>
            Validate a CSV, review the results, then import with confidence.
          </p>
        </div>
        <a className="button secondary" href="/api/import/template">
          <Download size={17} />
          Download template
        </a>
      </div>
      <div className="import-layout">
        <section className="panel import-panel">
          <div className="step-head">
            <span>01</span>
            <div>
              <h2>Choose your employee file</h2>
              <p>UTF-8 CSV · up to 10,000 employees · maximum 3 MB</p>
            </div>
          </div>
          <label className="upload-zone">
            <span className="upload-icon">
              <Upload size={27} />
            </span>
            <strong>{filename || "Choose a CSV file"}</strong>
            <span>Use the template to get the column names right.</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={choose}
              disabled={busy}
              aria-label="Employee CSV file"
            />
          </label>
          <button
            className="button primary"
            disabled={!text || busy}
            onClick={validate}
          >
            {busy ? "Working…" : "Validate file"}
            <ArrowRight size={16} />
          </button>
          {error && <ErrorBox message={error} />}
          {success !== undefined && (
            <div className="import-success" role="status">
              <CheckCircle2 size={25} />
              <div>
                <h3>{count(success)} employees imported</h3>
                <p>The records and their initial salaries are now saved.</p>
                <button className="text-button" onClick={openDirectory}>
                  Open employee directory →
                </button>
              </div>
            </div>
          )}
          {preview && (
            <div className="import-review">
              <div className="step-head">
                <span>02</span>
                <div>
                  <h2>Review before you import</h2>
                  <p>
                    {count(preview.total_rows)} rows checked ·{" "}
                    {count(preview.valid_rows)} valid ·{" "}
                    {count(preview.error_count)} errors
                  </p>
                </div>
              </div>
              {!preview.valid ? (
                <div className="validation-errors" role="alert">
                  <strong>
                    Nothing has been imported. Correct these rows and choose the
                    updated file.
                  </strong>
                  <ul>
                    {preview.errors.map((error) => (
                      <li key={error.row}>
                        <b>Row {error.row}:</b> {error.message}
                      </li>
                    ))}
                  </ul>
                  {preview.error_count > 30 && (
                    <p>Showing the first 30 errors.</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="valid-banner">
                    <ShieldCheck size={19} />
                    All rows passed validation. Ready to import.
                  </div>
                  <p className="field-hint">
                    Preview of the first {preview.preview.length} records:
                  </p>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Department</th>
                          <th className="right">Annual base salary</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.preview.map((person) => (
                          <tr key={person.employee_code}>
                            <td>
                              <strong>{person.name}</strong>
                              <small>{person.employee_code}</small>
                            </td>
                            <td>{person.department}</td>
                            <td className="right">
                              {money(person.annual_salary, person.currency)}
                              <small>{person.currency}</small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    className="button primary confirm-import"
                    disabled={busy}
                    onClick={commit}
                  >
                    <CheckCircle2 size={17} />
                    {busy
                      ? "Importing…"
                      : `Confirm import of ${count(preview.total_rows)} employees`}
                  </button>
                </>
              )}
            </div>
          )}
        </section>
        <aside className="panel import-help">
          <FileSpreadsheet size={26} />
          <h2>A clean start for your data.</h2>
          <p>
            Import adds new employees. It never overwrites existing salary
            records.
          </p>
          <ol>
            <li>Download the template and replace the example row.</li>
            <li>
              Enter annual gross base salary with up to two decimal places,
              without currency symbols or commas.
            </li>
            <li>Keep employee IDs and email addresses unique.</li>
            <li>Preview the file, fix any errors, then confirm.</li>
          </ol>
          <div className="info-note">
            If any row fails validation, the entire import is rejected. No
            partial employee lists to untangle.
          </div>
          <p className="field-hint">
            Supported countries: IN, US, GB, DE, CA, SG. Supported currencies:
            INR, USD, GBP, EUR, CAD, SGD.
          </p>
        </aside>
      </div>
    </>
  );
}
