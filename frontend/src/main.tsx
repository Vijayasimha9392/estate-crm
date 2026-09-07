import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  Users,
  KeyRound,
  LogOut,
  Menu,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { api, ApiError, resetCsrf } from "./api";
import { ErrorBox, Field, Loading, Submit } from "./ui";
import type { User } from "./types";
import { UserContext } from "./auth";
import { Dashboard, Bookings } from "./overview";
import { Leads, LeadDetail } from "./leads";
import { Properties } from "./properties";
import "./style.css";

function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState<ApiError | null>(null),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await resetCsrf();
      const user = await api<User>("/auth/login", "POST", { email, password });
      await resetCsrf();
      onLogin(user);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand">
          <Building2 />
          <span>
            estate<span className="brand-period">.</span>
          </span>
        </div>
        <div>
          <span className="eyebrow">YOUR SALES WORKSPACE</span>
          <h1>
            Every lead.
            <br />A place to begin.
          </h1>
          <p>
            Keep conversations moving, find the right property, and turn
            interest into a booking.
          </p>
          <div className="login-pills">
            <span>Leads</span>
            <span>Properties</span>
            <span>Bookings</span>
          </div>
        </div>
        <small>Real estate, thoughtfully organized.</small>
      </section>
      <section className="login-form">
        <div className="login-box">
          <ShieldCheck size={28} />
          <h2>Welcome back</h2>
          <p>Sign in to your sales workspace.</p>
          <form onSubmit={submit}>
            <Field name="email" label="Email address" error={error}>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </Field>
            <Field name="password" label="Password" error={error}>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {Boolean(error) && <ErrorBox error={error} />}
            <Submit busy={busy}>Sign in</Submit>
          </form>
          <div className="demo-note">
            Using the local demo? Account details are in the project README.
            <ArrowUpRight size={16} />
          </div>
        </div>
      </section>
    </div>
  );
}
function Shell({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function logout() {
    setBusy(true);
    setError(null);
    try {
      await api("/auth/logout", "POST");
      onLogout();
      navigate("/");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const nav = [
    ["/", "Overview", LayoutDashboard],
    ["/leads", "Leads", Users],
    ["/properties", "Properties", Building2],
    ["/bookings", "Bookings", KeyRound],
  ] as const;
  return (
    <UserContext.Provider value={user}>
      <div className="app">
        <aside className={open ? "sidebar open" : "sidebar"}>
          <div className="brand">
            <Building2 />
            <span>
              estate<span className="brand-period">.</span>
            </span>
          </div>
          <span className="nav-caption">WORKSPACE</span>
          <nav>
            {nav.map(([path, name, Icon]) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                onClick={() => setOpen(false)}
              >
                <Icon size={19} />
                {name}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="workspace-note">
              <span className="small-cap">ONE WORKSPACE</span>
              <p>
                From first conversation
                <br />
                to the right home.
              </p>
            </div>
            <div className="profile">
              <div className="avatar">
                {user.name
                  .split(" ")
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <strong>{user.name}</strong>
                <small>
                  {user.role === "ADMIN" ? "Administrator" : "Sales employee"}
                </small>
              </div>
              <button
                className="icon-button"
                title="Sign out"
                aria-label="Sign out"
                disabled={busy}
                onClick={logout}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </aside>
        {open && (
          <button
            className="nav-scrim"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
        )}
        <main>
          <header className="topbar">
            <button
              className="icon-button mobile-menu"
              aria-label="Toggle navigation"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <Menu />
            </button>
            <span>
              Sales workspace <span className="topbar-separator">/</span>{" "}
              <strong>
                {user.role === "ADMIN" ? "Team view" : "My workspace"}
              </strong>
            </span>
            <span className="topbar-date">
              {new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Kolkata",
              })}
            </span>
          </header>
          <div className="content">
            {Boolean(error) && <ErrorBox error={error} />}
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/leads/:id" element={<LeadDetail />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </UserContext.Provider>
  );
}
function App() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<unknown>(null),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api<User>("/auth/me")
      .then((u) => {
        if (active) setUser(u);
      })
      .catch((e) => {
        if (active && e.status !== 401) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const expire = () => setUser(null);
    window.addEventListener("session-expired", expire);
    return () => {
      active = false;
      window.removeEventListener("session-expired", expire);
    };
  }, [retry]);
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="connection-error">
        <h1>Workspace unavailable</h1>
        <ErrorBox error={error} retry={() => setRetry((v) => v + 1)} />
      </div>
    );
  return user ? (
    <Shell user={user} onLogout={() => setUser(null)} />
  ) : (
    <Login onLogin={setUser} />
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
