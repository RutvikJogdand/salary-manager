import { useEffect, useState, type FormEvent } from "react";
import {
  BarChart3,
  Check,
  ChevronDown,
  Clock3,
  FileUp,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Users,
  X,
} from "lucide-react";
import { api, setCSRF, useResource } from "./api";
import { ErrorBox, Loading } from "./components";
import { Directory } from "./Directory";
import { EmployeeEditor } from "./EmployeeEditor";
import { Insights } from "./Insights";
import { ImportView } from "./ImportView";
import { Activity } from "./Activity";
import type { Metadata, Session } from "./types";

type Page = "overview" | "employees" | "insights" | "activity" | "import";
const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "employees", label: "Employees", icon: Users },
  { id: "insights", label: "Salary insights", icon: BarChart3 },
  { id: "activity", label: "Change activity", icon: Clock3 },
  { id: "import", label: "Import employees", icon: FileUp },
] as const;

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        a<span>↗</span>
      </span>
      <div>
        <strong>
          acme<span>®</span>
        </strong>
        <small>PEOPLE & PAY</small>
      </div>
    </div>
  );
}

function Login({ signedIn }: { signedIn: (session: Session) => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      signedIn(
        await api<Session>("/api/login", {
          method: "POST",
          body: JSON.stringify({ password }),
        }),
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <section className="login-story">
        <Brand />
        <div>
          <div className="eyebrow">THE HR WORKSPACE</div>
          <h1>
            Good decisions
            <br />
            start with
            <br />
            <em>a clear picture.</em>
          </h1>
          <p>
            A thoughtful home for your people and their pay.
            <br />
            Less spreadsheet sprawl. More confidence.
          </p>
        </div>
        <span className="login-footer">
          ACME ORGANIZATION · COMPENSATION MANAGEMENT
        </span>
        <div className="login-art" aria-hidden="true">
          <div />
          <div />
          <div />
          <div />
        </div>
      </section>
      <section className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <div className="login-lock">
            <LockKeyhole size={24} />
          </div>
          <div className="eyebrow">WELCOME TO ACME</div>
          <h2>Your workspace awaits.</h2>
          <p>Sign in to manage people and explore compensation.</p>
          <label>
            Workspace password
            <input
              autoFocus
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </label>
          {error && <ErrorBox message={error} />}
          <button className="button primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in to workspace"}
            <span>→</span>
          </button>
          <div className="login-note">
            <LockKeyhole size={13} />
            Private HR workspace · Fictional assessment data
          </div>
        </form>
      </section>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>();
  const [startError, setStartError] = useState("");
  const [page, setPage] = useState<Page>("overview");
  const [mobile, setMobile] = useState(false);
  const [editor, setEditor] = useState<number | "new" | null>(null);
  const [revision, setRevision] = useState(0);
  const [toast, setToast] = useState("");
  const metadata = useResource<Metadata>(session ? "/api/metadata" : null);
  function signedIn(value: Session) {
    setCSRF(value.csrf_token);
    setSession(value);
  }
  useEffect(() => {
    api<Session>("/api/session")
      .then(signedIn)
      .catch((error) => {
        if (error.status === 401) setSession(null);
        else setStartError(error.message);
      });
    const expired = () => {
      setSession(null);
      setEditor(null);
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  function go(next: Page) {
    setPage(next);
    setMobile(false);
    window.scrollTo({ top: 0 });
  }
  async function logout() {
    try {
      await api("/api/logout", { method: "POST" });
      setSession(null);
      setCSRF("");
    } catch (error) {
      setToast((error as Error).message);
    }
  }
  if (startError)
    return (
      <div className="startup">
        <ErrorBox message={startError} retry={() => window.location.reload()} />
      </div>
    );
  if (session === undefined)
    return (
      <div className="startup">
        <Loading />
      </div>
    );
  if (session === null) return <Login signedIn={signedIn} />;
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-shade"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={"sidebar " + (mobile ? "mobile-open" : "")}>
        <Brand />
        <div className="workspace-switch">
          <span className="workspace-icon">A</span>
          <span>
            <strong>ACME Organization</strong>
            <small>HR workspace</small>
          </span>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              aria-current={page === item.id ? "page" : undefined}
              onClick={() => go(item.id)}
            >
              <item.icon size={18} />
              {item.label}
              {page === item.id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="small-tag">A LITTLE MORE CLARITY</span>
          <h3>
            People first.
            <br />
            Numbers in context.
          </h3>
          <p>
            One place to maintain salary data and understand your organization.
          </p>
          <span className="note-line" />
        </div>
        <div className="sidebar-bottom">
          <div className="user-avatar">HR</div>
          <div>
            <strong>{session.name}</strong>
            <small>Workspace administrator</small>
          </div>
          <button
            className="icon-button"
            aria-label="Sign out"
            onClick={logout}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            Workspace<span>/</span>
            <strong>
              {navigation.find((item) => item.id === page)?.label}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="demo-label">
              <span />
              Demo workspace
            </span>
            <div className="topbar-divider" />
            <span className="today">
              {new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(new Date())}
            </span>
          </div>
        </header>
        <main>
          {metadata.loading ? (
            <Loading />
          ) : metadata.error ? (
            <ErrorBox message={metadata.error} retry={metadata.retry} />
          ) : (
            metadata.data && (
              <>
                {page === "overview" && (
                  <Insights
                    overview
                    metadata={metadata.data}
                    revision={revision}
                    openDirectory={() => go("employees")}
                  />
                )}
                {page === "insights" && (
                  <Insights
                    metadata={metadata.data}
                    revision={revision}
                    openDirectory={() => go("employees")}
                  />
                )}
                {page === "employees" && (
                  <Directory
                    metadata={metadata.data}
                    revision={revision}
                    edit={setEditor}
                    openImport={() => go("import")}
                  />
                )}
                {page === "activity" && (
                  <Activity revision={revision} edit={setEditor} />
                )}
                {page === "import" && (
                  <ImportView
                    changed={() => setRevision((x) => x + 1)}
                    openDirectory={() => go("employees")}
                  />
                )}
              </>
            )
          )}
          <footer className="page-footer">
            <span>ACME · People & Pay</span>
            <span>Fictional data. Real clarity.</span>
          </footer>
        </main>
      </div>
      {editor !== null && metadata.data && (
        <EmployeeEditor
          employeeId={editor}
          metadata={metadata.data}
          close={() => setEditor(null)}
          saved={() => {
            setEditor(null);
            setRevision((x) => x + 1);
            setToast("Employee record saved.");
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
