import { useState, type FormEvent } from "react";
import { Building2, Edit3, Plus, Search } from "lucide-react";
import { api, ApiError } from "./api";
import {
  Badge,
  Dialog,
  Empty,
  ErrorBox,
  Field,
  Loading,
  money,
  PageTitle,
  Submit,
  useRemote,
} from "./ui";
import type { Inventory, Project, Building, Unit } from "./types";
import { useUser } from "./auth";
type Kind = "projects" | "buildings" | "units";
type Edit = { kind: Kind; record?: Project | Building | Unit };
function PropertyForm({
  edit,
  inventory,
  onClose,
  onSaved,
}: {
  edit: Edit;
  inventory: Inventory;
  onClose: () => void;
  onSaved: () => void;
}) {
  const record = edit.record;
  const [name, setName] = useState(
      record && "name" in record ? record.name : "",
    ),
    [location, setLocation] = useState(
      record && "location" in record ? record.location : "",
    ),
    [project, setProject] = useState(
      record && "projectId" in record ? String(record.projectId) : "",
    ),
    [building, setBuilding] = useState(
      record && "buildingId" in record ? String(record.buildingId) : "",
    ),
    [number, setNumber] = useState(
      record && "unitNumber" in record ? record.unitNumber : "",
    ),
    [type, setType] = useState(
      record && "type" in record ? record.type : "2 BHK",
    ),
    [price, setPrice] = useState(
      record && "price" in record ? String(record.price) : "",
    );
  const [error, setError] = useState<ApiError | null>(null),
    [busy, setBusy] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body =
      edit.kind === "projects"
        ? { name, location }
        : edit.kind === "buildings"
          ? { name, projectId: Number(project) }
          : {
              buildingId: Number(building),
              unitNumber: number,
              type,
              price: Number(price),
            };
    try {
      await api(
        "/" + edit.kind + (record ? "/" + record.id : ""),
        record ? "PUT" : "POST",
        body,
      );
      onSaved();
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={
        (record ? "Edit " : "New ") +
        { projects: "project", buildings: "building", units: "unit" }[edit.kind]
      }
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={save}>
        <div className="form-grid">
          {edit.kind !== "units" && (
            <Field name="name" label="Name" error={error}>
              <input
                id="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </Field>
          )}
          {edit.kind === "projects" && (
            <Field name="location" label="Location" error={error}>
              <input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                maxLength={150}
              />
            </Field>
          )}
          {edit.kind === "buildings" && (
            <Field name="projectId" label="Project" error={error}>
              <select
                id="projectId"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                required
                disabled={!!record}
              >
                <option value="">Choose a project</option>
                {inventory.projects.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {edit.kind === "units" && (
            <>
              <Field name="buildingId" label="Building" error={error}>
                <select
                  id="buildingId"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  required
                  disabled={!!record}
                >
                  <option value="">Choose a building</option>
                  {inventory.buildings.map((b) => (
                    <option value={b.id} key={b.id}>
                      {
                        inventory.projects.find((p) => p.id === b.projectId)
                          ?.name
                      }{" "}
                      · {b.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field name="unitNumber" label="Unit number" error={error}>
                <input
                  id="unitNumber"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  required
                  maxLength={30}
                />
              </Field>
              <Field name="type" label="Unit type" error={error}>
                <input
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                  maxLength={30}
                  placeholder="e.g. 2 BHK"
                />
              </Field>
              <Field name="price" label="Price (INR)" error={error}>
                <input
                  id="price"
                  type="number"
                  min="0.01"
                  max="999999999999.99"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </Field>
            </>
          )}
        </div>
        {error && <ErrorBox error={error} />}
        <div className="form-actions">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <Submit busy={busy} />
        </div>
      </form>
    </Dialog>
  );
}
export function Properties() {
  const user = useUser(),
    { data, error, loading, reload } = useRemote<Inventory>("/properties");
  const [view, setView] = useState<Kind>("units"),
    [project, setProject] = useState(""),
    [building, setBuilding] = useState(""),
    [available, setAvailable] = useState(""),
    [q, setQ] = useState(""),
    [edit, setEdit] = useState<Edit | null>(null);
  const units =
    data?.units.filter(
      (u) =>
        (!project || u.projectId === Number(project)) &&
        (!building || u.buildingId === Number(building)) &&
        (!available || u.availability === available) &&
        [u.unitNumber, u.type, u.projectName, u.buildingName]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase()),
    ) || [];
  const admin = user.role === "ADMIN";
  return (
    <>
      <PageTitle
        eyebrow="INVENTORY"
        title="Properties"
        description="Find the right home across your projects and buildings."
        action={
          admin && (
            <button
              className="button primary"
              disabled={!data || loading}
              onClick={() => setEdit({ kind: view })}
            >
              <Plus size={17} /> New {view.slice(0, -1)}
            </button>
          )
        }
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} retry={reload} />
      ) : (
        data && (
          <>
            <div className="inventory-stats">
              <span>
                <strong>{data.projects.length}</strong> projects
              </span>
              <span>
                <strong>{data.buildings.length}</strong> buildings
              </span>
              <span>
                <strong>
                  {
                    data.units.filter((u) => u.availability === "AVAILABLE")
                      .length
                  }
                </strong>{" "}
                available units
              </span>
              <span>
                <strong>
                  {data.units.filter((u) => u.availability === "BOOKED").length}
                </strong>{" "}
                booked
              </span>
            </div>
            <div className="tabs" role="tablist" aria-label="Property level">
              {(["units", "buildings", "projects"] as Kind[]).map((v) => (
                <button
                  id={"tab-" + v}
                  role="tab"
                  aria-selected={v === view}
                  aria-controls="inventory-panel"
                  tabIndex={v === view ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      const values: Kind[] = ["units", "buildings", "projects"];
                      const next =
                        values[
                          (values.indexOf(view) +
                            (e.key === "ArrowRight" ? 1 : 2)) %
                            3
                        ];
                      setView(next);
                      document.getElementById("tab-" + next)?.focus();
                    }
                  }}
                  className={v === view ? "active" : ""}
                  key={v}
                  onClick={() => setView(v)}
                >
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <section
              className="panel"
              id="inventory-panel"
              role="tabpanel"
              aria-labelledby={"tab-" + view}
            >
              {view === "units" ? (
                <>
                  <div className="filters">
                    <div className="search-input">
                      <Search size={18} />
                      <input
                        aria-label="Search units"
                        placeholder="Search units or type…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                    </div>
                    <select
                      aria-label="Project"
                      value={project}
                      onChange={(e) => {
                        setProject(e.target.value);
                        setBuilding("");
                      }}
                    >
                      <option value="">All projects</option>
                      {data.projects.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Building"
                      value={building}
                      onChange={(e) => setBuilding(e.target.value)}
                    >
                      <option value="">All buildings</option>
                      {data.buildings
                        .filter(
                          (b) => !project || b.projectId === Number(project),
                        )
                        .map((b) => (
                          <option value={b.id} key={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                    <select
                      aria-label="Availability"
                      value={available}
                      onChange={(e) => setAvailable(e.target.value)}
                    >
                      <option value="">Any availability</option>
                      <option value="AVAILABLE">Available</option>
                      <option value="BOOKED">Booked</option>
                    </select>
                  </div>
                  {!units.length ? (
                    <Empty
                      title={
                        data.units.length ? "No matching units" : "No units yet"
                      }
                      detail={
                        data.units.length
                          ? "Try changing your search or filters."
                          : "Create a project and building, then add your first unit."
                      }
                    />
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Unit</th>
                            <th>Project / building</th>
                            <th>Type</th>
                            <th>Price</th>
                            <th>Availability</th>
                            {admin && <th>Manage</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {units.map((u) => (
                            <tr key={u.id}>
                              <td>
                                <div className="unit-name">
                                  <Building2 size={19} />
                                  <strong>{u.unitNumber}</strong>
                                </div>
                              </td>
                              <td>
                                {u.projectName}
                                <small>{u.buildingName}</small>
                              </td>
                              <td>{u.type}</td>
                              <td>{money(u.price)}</td>
                              <td>
                                <Badge value={u.availability} />
                              </td>
                              {admin && (
                                <td>
                                  <button
                                    className="icon-button"
                                    disabled={u.availability === "BOOKED"}
                                    aria-label={"Edit unit " + u.unitNumber}
                                    title={
                                      u.availability === "BOOKED"
                                        ? "Booked units cannot be edited"
                                        : "Edit unit"
                                    }
                                    onClick={() =>
                                      setEdit({ kind: "units", record: u })
                                    }
                                  >
                                    <Edit3 size={17} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : view === "projects" ? (
                <div className="property-cards">
                  {data.projects.length ? (
                    data.projects.map((p) => (
                      <article key={p.id}>
                        <Building2 size={25} />
                        <h2>{p.name}</h2>
                        <p>{p.location}</p>
                        <div>
                          <span>
                            {
                              data.buildings.filter((b) => b.projectId === p.id)
                                .length
                            }{" "}
                            buildings
                          </span>
                          {admin && (
                            <button
                              className="button"
                              onClick={() =>
                                setEdit({ kind: "projects", record: p })
                              }
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  ) : (
                    <Empty
                      title="No projects yet"
                      detail="Admin can create a project to organize buildings and units."
                    />
                  )}
                </div>
              ) : (
                <div className="property-cards">
                  {data.buildings.length ? (
                    data.buildings.map((b) => (
                      <article key={b.id}>
                        <Building2 size={25} />
                        <h2>{b.name}</h2>
                        <p>
                          {
                            data.projects.find((p) => p.id === b.projectId)
                              ?.name
                          }
                        </p>
                        <div>
                          <span>
                            {
                              data.units.filter((u) => u.buildingId === b.id)
                                .length
                            }{" "}
                            units
                          </span>
                          {admin && (
                            <button
                              className="button"
                              onClick={() =>
                                setEdit({ kind: "buildings", record: b })
                              }
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  ) : (
                    <Empty
                      title="No buildings yet"
                      detail="Add a building to an existing project before creating units."
                    />
                  )}
                </div>
              )}
            </section>
            {edit && (
              <PropertyForm
                edit={edit}
                inventory={data}
                onClose={() => setEdit(null)}
                onSaved={() => {
                  setEdit(null);
                  reload();
                }}
              />
            )}
          </>
        )
      )}
    </>
  );
}
