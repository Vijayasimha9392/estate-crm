import { useEffect, useState, type FormEvent } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Edit3,
  KeyRound,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { api, ApiError } from "./api";
import {
  Badge,
  date,
  Dialog,
  Empty,
  ErrorBox,
  Field,
  label,
  Loading,
  money,
  PageTitle,
  Submit,
  useRemote,
} from "./ui";
import {
  stages,
  type Inventory,
  type Lead,
  type Stage,
  type User,
} from "./types";
import { useUser } from "./auth";

function LeadForm({
  lead,
  onClose,
  onSaved,
}: {
  lead?: Lead;
  onClose: () => void;
  onSaved: (id: number) => void;
}) {
  const [name, setName] = useState(lead?.name || ""),
    [phone, setPhone] = useState(lead?.phone || ""),
    [email, setEmail] = useState(lead?.email || ""),
    [stage, setStage] = useState<Stage>(lead?.stage || "NEW"),
    [follow, setFollow] = useState(lead?.nextFollowUp || "");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<ApiError | null>(null);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        name,
        phone,
        email: email || null,
        stage,
        nextFollowUp: follow || null,
      };
      if (lead) {
        await api("/leads/" + lead.id, "PUT", body);
        onSaved(lead.id);
      } else {
        const result = await api<{ id: number }>("/leads", "POST", body);
        onSaved(result.id);
      }
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={lead ? "Edit lead" : "New lead"}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={save}>
        <div className="form-grid">
          <Field name="name" label="Full name" error={error}>
            <input
              id="name"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </Field>
          <Field name="phone" label="Phone number" error={error}>
            <input
              id="phone"
              type="tel"
              required
              minLength={7}
              maxLength={25}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field name="email" label="Email address (optional)" error={error}>
            <input
              id="email"
              type="email"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field name="stage" label="Lead stage" error={error}>
            <select
              id="stage"
              value={stage}
              disabled={lead?.stage === "BOOKED"}
              onChange={(e) => setStage(e.target.value as Stage)}
            >
              {stages
                .filter((s) => s !== "BOOKED" || lead?.stage === "BOOKED")
                .map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
            </select>
          </Field>
          <Field
            name="nextFollowUp"
            label="Next follow-up (optional)"
            error={error}
          >
            <input
              id="nextFollowUp"
              type="date"
              disabled={stage === "BOOKED" || stage === "LOST"}
              value={follow}
              onChange={(e) => setFollow(e.target.value)}
            />
          </Field>
        </div>
        {!lead && (
          <p className="helper">
            This lead is assigned to you. Admin can reassign it from the lead
            details.
          </p>
        )}
        {Boolean(error) && <ErrorBox error={error} />}
        <div className="form-actions">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <Submit busy={busy}>{lead ? "Save changes" : "Create lead"}</Submit>
        </div>
      </form>
    </Dialog>
  );
}
export function Leads() {
  const user = useUser(),
    navigate = useNavigate(),
    [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || ""),
    [search, setSearch] = useState(params.get("q") || ""),
    [stage, setStage] = useState(params.get("stage") || ""),
    [assignee, setAssignee] = useState(""),
    [page, setPage] = useState(0),
    [show, setShow] = useState(params.has("new"));
  const [employees, setEmployees] = useState<User[]>([]),
    [employeeError, setEmployeeError] = useState<unknown>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (user.role === "ADMIN")
      api<User[]>("/employees").then(setEmployees).catch(setEmployeeError);
  }, [user.role]);
  const query = new URLSearchParams({ q: search, page: String(page) });
  if (stage) query.set("stage", stage);
  if (assignee) query.set("assignee", assignee);
  const { data, error, loading, reload } = useRemote<{
    items: Lead[];
    total: number;
    size: number;
    page: number;
  }>("/leads?" + query.toString());
  function close() {
    setShow(false);
    if (params.has("new")) {
      const next = new URLSearchParams(params);
      next.delete("new");
      setParams(next, { replace: true });
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="RELATIONSHIPS"
        title="Leads"
        description="Keep every conversation and next step in one place."
        action={
          <button className="button primary" onClick={() => setShow(true)}>
            <Plus size={17} /> New lead
          </button>
        }
      />
      <section className="panel">
        <div className="filters">
          <div className="search-input">
            <Search size={18} />
            <input
              aria-label="Search leads"
              placeholder="Search name, phone or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter by lead stage"
            value={stage}
            onChange={(e) => {
              setStage(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All stages</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
          {user.role === "ADMIN" && (
            <select
              aria-label="Filter by employee"
              value={assignee}
              onChange={(e) => {
                setAssignee(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All employees</option>
              {employees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {Boolean(employeeError) && <ErrorBox error={employeeError} />}{" "}
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorBox error={error} retry={reload} />
        ) : !data?.items.length ? (
          <Empty
            title={
              search || stage || assignee ? "No matching leads" : "No leads yet"
            }
            detail={
              search || stage || assignee
                ? "Try another search or clear the filters."
                : "Add your first lead to start a conversation."
            }
            action={
              search || stage || assignee ? (
                <button
                  className="button"
                  onClick={() => {
                    setQ("");
                    setStage("");
                    setAssignee("");
                    setPage(0);
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <button
                  className="button primary"
                  onClick={() => setShow(true)}
                >
                  Create lead
                </button>
              )
            }
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Stage</th>
                    <th>Assigned to</th>
                    <th>Next follow-up</th>
                    <th>
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <Link className="strong-link" to={"/leads/" + l.id}>
                          {l.name}
                        </Link>
                        <small>{l.phone}</small>
                      </td>
                      <td>
                        <Badge value={l.stage} />
                      </td>
                      <td>{l.assigneeName}</td>
                      <td>{date(l.nextFollowUp)}</td>
                      <td>
                        <Link
                          className="icon-button"
                          to={"/leads/" + l.id}
                          aria-label={"Open " + l.name}
                        >
                          <ArrowUpRight size={19} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                {page * 20 + 1}–{Math.min((page + 1) * 20, data.total)} of{" "}
                {data.total} leads
              </span>
              <div>
                <button
                  className="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <button
                  className="button"
                  disabled={(page + 1) * 20 >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
      {show && (
        <LeadForm
          onClose={close}
          onSaved={(id) => {
            close();
            navigate("/leads/" + id);
          }}
        />
      )}
    </>
  );
}
function Assignment({ lead, onSaved }: { lead: Lead; onSaved: () => void }) {
  const { data, error, loading, reload } = useRemote<User[]>("/employees");
  const [selected, setSelected] = useState(String(lead.assignedTo)),
    [busy, setBusy] = useState(false),
    [saveError, setSaveError] = useState<unknown>(null);
  useEffect(() => setSelected(String(lead.assignedTo)), [lead.assignedTo]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaveError(null);
    try {
      await api("/leads/" + lead.id + "/assignee", "PATCH", {
        employeeId: Number(selected),
      });
      onSaved();
    } catch (e) {
      setSaveError(e);
    } finally {
      setBusy(false);
    }
  }
  if (error) return <ErrorBox error={error} retry={reload} />;
  return (
    <form className="assignment" onSubmit={save}>
      <label htmlFor="assignee">Assign to employee</label>
      <div>
        <select
          id="assignee"
          value={selected}
          disabled={loading || busy}
          onChange={(e) => setSelected(e.target.value)}
        >
          {!data?.some((x) => x.id === lead.assignedTo) && (
            <option value={lead.assignedTo}>{lead.assigneeName}</option>
          )}
          {data?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button
          className="button"
          disabled={busy || loading || Number(selected) === lead.assignedTo}
        >
          {busy ? "Saving…" : "Assign"}
        </button>
      </div>
      {Boolean(saveError) && <ErrorBox error={saveError} />}
    </form>
  );
}
function BookingDialog({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data, error, loading, reload } = useRemote<Inventory>("/properties");
  const [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false),
    [saveError, setSaveError] = useState<unknown>(null);
  const unit = data?.units.find(
    (u) => String(u.id) === selected && u.availability === "AVAILABLE",
  );
  async function book(e: FormEvent) {
    e.preventDefault();
    if (!unit) return;
    setBusy(true);
    setSaveError(null);
    try {
      await api("/bookings", "POST", { leadId: lead.id, unitId: unit.id });
      onSaved();
    } catch (e) {
      setSaveError(e);
      if (e instanceof ApiError && e.status === 409) {
        setSelected("");
        reload();
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="Confirm a booking" onClose={onClose} busy={busy}>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} retry={reload} />
      ) : (
        <form onSubmit={book}>
          <p className="helper">
            Choose a home for <strong>{lead.name}</strong>.
          </p>
          <Field name="unitId" label="Available unit">
            <select
              id="unitId"
              value={selected}
              required
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Select a unit</option>
              {data?.units
                .filter((u) => u.availability === "AVAILABLE")
                .map((u) => (
                  <option value={u.id} key={u.id}>
                    {u.projectName} · {u.buildingName} · {u.unitNumber} ·{" "}
                    {u.type}
                  </option>
                ))}
            </select>
          </Field>
          {!data?.units.some((u) => u.availability === "AVAILABLE") && (
            <Empty
              title="No available units"
              detail="All current units are booked. Contact Admin about new inventory."
            />
          )}
          {unit && (
            <div className="booking-confirm">
              <KeyRound size={24} />
              <span>
                {unit.projectName}
                <small>
                  {unit.buildingName} · Unit {unit.unitNumber} · {unit.type}
                </small>
              </span>
              <strong>{money(unit.price)}</strong>
            </div>
          )}
          <p className="helper">
            Confirming marks this lead and unit as Booked. Cancellation is not
            available in this version.
          </p>
          <div className="form-actions">
            <button
              className="button"
              type="button"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="button primary" disabled={busy || !unit}>
              {busy ? "Confirming…" : "Confirm booking"}
            </button>
          </div>
        </form>
      )}
      {Boolean(saveError) && <ErrorBox error={saveError} />}
    </Dialog>
  );
}
export function LeadDetail() {
  const { id } = useParams(),
    user = useUser();
  const {
    data: lead,
    error,
    loading,
    reload,
  } = useRemote<Lead>("/leads/" + id);
  const [edit, setEdit] = useState(false),
    [booking, setBooking] = useState(false),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [noteError, setNoteError] = useState<unknown>(null),
    [success, setSuccess] = useState("");
  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    setNoteError(null);
    try {
      await api("/leads/" + id + "/notes", "POST", { text: note });
      setNote("");
      reload();
    } catch (e) {
      setNoteError(e);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (error)
    return (
      <>
        <Link className="back-link" to="/leads">
          <ArrowLeft size={16} /> Leads
        </Link>
        <ErrorBox error={error} retry={reload} />
      </>
    );
  if (!lead) return null;
  return (
    <>
      <Link className="back-link" to="/leads">
        <ArrowLeft size={16} /> All leads
      </Link>
      <PageTitle
        eyebrow={"LEAD / " + String(lead.id).padStart(4, "0")}
        title={lead.name}
        description="Contact details, conversations and the next step."
        action={
          <div className="actions">
            <button className="button" onClick={() => setEdit(true)}>
              <Edit3 size={16} /> Edit lead
            </button>
            {!["BOOKED", "LOST"].includes(lead.stage) && (
              <button
                className="button primary"
                onClick={() => setBooking(true)}
              >
                <KeyRound size={16} /> Book a unit
              </button>
            )}
          </div>
        }
      />
      {success && (
        <div className="success" role="status">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}
      <div className="detail-grid">
        <div>
          <section className="panel contact-panel">
            <div className="section-title">
              <h2>Lead details</h2>
              <Badge value={lead.stage} />
            </div>
            <div className="contact-line">
              <Phone size={18} />
              <div>
                <small>Phone</small>
                <a href={"tel:" + lead.phone}>{lead.phone}</a>
              </div>
            </div>
            <div className="contact-line">
              <Mail size={18} />
              <div>
                <small>Email</small>
                {lead.email ? (
                  <a href={"mailto:" + lead.email}>{lead.email}</a>
                ) : (
                  <span>Not provided</span>
                )}
              </div>
            </div>
            <div className="contact-line">
              <UserRound size={18} />
              <div>
                <small>Assigned to</small>
                <span>{lead.assigneeName}</span>
              </div>
            </div>
            <div className="contact-line">
              <CalendarClock size={18} />
              <div>
                <small>Next follow-up</small>
                <span>{date(lead.nextFollowUp)}</span>
              </div>
            </div>
            {user.role === "ADMIN" && (
              <Assignment lead={lead} onSaved={reload} />
            )}
          </section>
          {lead.booking?.map((b) => (
            <section className="panel booked-card" key={b.id}>
              <KeyRound size={22} />
              <h2>Booking confirmed</h2>
              <strong>{b.projectName}</strong>
              <p>
                {b.buildingName} · Unit {b.unitNumber}
              </p>
              <div>{money(b.bookedPrice)}</div>
              <small>Booked on {date(b.bookedAt)}</small>
            </section>
          ))}
        </div>
        <section className="panel notes-panel">
          <div className="section-title">
            <div>
              <h2>Conversation notes</h2>
              <p>Keep the context for your next follow-up.</p>
            </div>
            <MessageSquare size={20} />
          </div>
          <form onSubmit={addNote}>
            <label className="sr-only" htmlFor="note">
              Add a note
            </label>
            <textarea
              id="note"
              placeholder="What did you discuss? What happens next?"
              maxLength={2000}
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="note-actions">
              <small>{note.length}/2000</small>
              <button
                className="button primary"
                disabled={busy || !note.trim()}
              >
                {busy ? "Adding…" : "Add note"}
              </button>
            </div>
            {Boolean(noteError) && <ErrorBox error={noteError} />}
          </form>
          <div className="timeline">
            {lead.notes?.length ? (
              lead.notes.map((n) => (
                <article key={n.id}>
                  <div className="note-heading">
                    <strong>{n.authorName}</strong>
                    <time>{date(n.createdAt)}</time>
                  </div>
                  <p>{n.text}</p>
                </article>
              ))
            ) : (
              <Empty
                title="No notes yet"
                detail="Add a conversation summary to keep your team informed."
              />
            )}
          </div>
        </section>
      </div>
      {edit && (
        <LeadForm
          lead={lead}
          onClose={() => setEdit(false)}
          onSaved={() => {
            setEdit(false);
            reload();
          }}
        />
      )}
      {booking && (
        <BookingDialog
          lead={lead}
          onClose={() => setBooking(false)}
          onSaved={() => {
            setBooking(false);
            setSuccess(
              "Booking confirmed. The unit is now unavailable to other buyers.",
            );
            reload();
          }}
        />
      )}
    </>
  );
}
