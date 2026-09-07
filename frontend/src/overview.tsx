import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarClock,
  KeyRound,
  Users,
  Wallet,
  Plus,
} from "lucide-react";
import {
  Badge,
  date,
  Empty,
  ErrorBox,
  label,
  Loading,
  money,
  PageTitle,
  useRemote,
} from "./ui";
import { stages, type Booking, type DashboardData } from "./types";
import { useUser } from "./auth";

export function Dashboard() {
  const user = useUser(),
    { data, error, loading, reload } = useRemote<DashboardData>("/dashboard");
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} retry={reload} />;
  if (!data) return null;
  const cards = [
    {
      label: "Active leads",
      value: data.counts.activeLeads,
      caption: `${data.counts.totalLeads} total leads`,
      Icon: Users,
    },
    {
      label: "Follow-ups today",
      value: data.counts.dueToday,
      caption: `${data.counts.overdue} overdue`,
      Icon: CalendarClock,
    },
    {
      label: "Confirmed bookings",
      value: data.bookings.bookingCount,
      caption: "All time",
      Icon: KeyRound,
    },
    {
      label: "Booked value",
      value: money(data.bookings.bookedValue),
      caption: "All time · INR",
      Icon: Wallet,
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow="AT A GLANCE"
        title={`Good to see you, ${user.name.split(" ")[0]}`}
        description="Your leads, next conversations, and confirmed bookings."
        action={
          <Link className="button primary" to="/leads?new=1">
            <Plus size={17} /> New lead
          </Link>
        }
      />
      <div className="stats">
        {cards.map((c) => (
          <div className="stat" key={c.label}>
            <div className="stat-heading">
              {c.label}
              <c.Icon size={19} />
            </div>
            <strong>{c.value}</strong>
            <span>{c.caption}</span>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-title">
            <div>
              <h2>Next conversations</h2>
              <p>Overdue and due today · {data.timezone}</p>
            </div>
            <Link className="text-link" to="/leads">
              All leads <ArrowUpRight size={16} />
            </Link>
          </div>
          {data.followUps.length === 0 ? (
            <Empty
              title="You're all caught up"
              detail="No active leads have a follow-up due today or earlier."
            />
          ) : (
            <div className="follow-list">
              {data.followUps.map((l) => (
                <Link to={"/leads/" + l.id} key={l.id} className="follow-item">
                  <div className="avatar light">{l.name.slice(0, 1)}</div>
                  <div className="follow-name">
                    <strong>{l.name}</strong>
                    <small>
                      {l.assigneeName} · {label(l.stage)}
                    </small>
                  </div>
                  <div
                    className={
                      "due " +
                      (l.nextFollowUp! < data.today ? "overdue-text" : "")
                    }
                  >
                    <span>
                      {l.nextFollowUp! < data.today ? "Overdue" : "Today"}
                    </span>
                    <small>{date(l.nextFollowUp)}</small>
                  </div>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="panel pipeline">
          <div className="section-title">
            <div>
              <h2>Lead pipeline</h2>
              <p>Where conversations stand</p>
            </div>
          </div>
          {stages.map((stage) => {
            const count = Number(
              data.stages.find((s) => s.stage === stage)?.count || 0,
            );
            return (
              <Link
                to={"/leads?stage=" + stage}
                key={stage}
                className="pipeline-row"
              >
                <div>
                  <span>{label(stage)}</span>
                  <strong>{count}</strong>
                </div>
                <div className="track">
                  <div
                    className={"fill " + stage.toLowerCase()}
                    style={{
                      width: `${data.counts.totalLeads ? (count / data.counts.totalLeads) * 100 : 0}%`,
                    }}
                  />
                </div>
              </Link>
            );
          })}
        </section>
      </div>
      <div className="workspace-footer">
        <BuildingNote />{" "}
        <span>Figures reflect the records you can access.</span>
      </div>
    </>
  );
}
function BuildingNote() {
  return <span>ESTATE / SALES OPERATIONS</span>;
}
export function Bookings() {
  const { data, error, loading, reload } = useRemote<Booking[]>("/bookings");
  return (
    <>
      <PageTitle
        eyebrow="SALES"
        title="Bookings"
        description="Confirmed homes, with a record of every successful booking."
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} retry={reload} />
      ) : !data?.length ? (
        <section className="panel">
          <Empty
            title="Your first booking starts with a lead"
            detail="Open an active lead and choose an available unit to confirm a booking."
            action={
              <Link className="button primary" to="/leads">
                View leads <ArrowUpRight size={16} />
              </Link>
            }
          />
        </section>
      ) : (
        <>
          <div className="booking-summary">
            <KeyRound size={21} />
            <strong>{data.length} confirmed bookings</strong>
            <span>
              {money(data.reduce((sum, b) => sum + Number(b.bookedPrice), 0))}{" "}
              total booked value
            </span>
          </div>
          <div className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Property</th>
                  <th>Booked value</th>
                  <th>Booked by</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link className="strong-link" to={"/leads/" + b.leadId}>
                        {b.leadName}
                      </Link>
                      <small>Booking #{String(b.id).padStart(4, "0")}</small>
                    </td>
                    <td>
                      {b.projectName}
                      <small>
                        {b.buildingName} · {b.unitNumber}
                      </small>
                    </td>
                    <td>{money(b.bookedPrice)}</td>
                    <td>{b.bookedByName}</td>
                    <td>{date(b.bookedAt)}</td>
                    <td>
                      <Badge value="BOOKED" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
