package com.estatecrm;

import com.estatecrm.Contracts.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PropertyService {
  private final CrmStore db;

  public PropertyService(CrmStore db) {
    this.db = db;
  }

  public Map<String, Object> inventory() {
    return Map.of(
        "projects",
        db.jdbc().queryForList("SELECT id,name,location FROM projects ORDER BY name"),
        "buildings",
        db.jdbc()
            .queryForList(
                "SELECT id,project_id AS \"projectId\",name FROM buildings ORDER BY name"),
        "units",
        db.jdbc()
            .queryForList(
                "SELECT u.id,u.building_id AS \"buildingId\",u.unit_number AS"
                    + " \"unitNumber\",u.type,u.price,u.availability,b.name AS"
                    + " \"buildingName\",p.id AS \"projectId\",p.name AS \"projectName\" FROM units"
                    + " u JOIN buildings b ON b.id=u.building_id JOIN projects p ON"
                    + " p.id=b.project_id ORDER BY p.name,b.name,u.unit_number"));
  }

  @Transactional
  public long project(Long id, ProjectInput input, Actor actor) {
    CrmStore.admin(actor);
    if (id == null)
      return db.insert(
          "INSERT INTO projects(name,location) VALUES (?,?)",
          input.name().trim(),
          input.location().trim());
    db.one("SELECT id FROM projects WHERE id=?", id);
    db.jdbc()
        .update(
            "UPDATE projects SET name=?,location=? WHERE id=?",
            input.name().trim(),
            input.location().trim(),
            id);
    return id;
  }

  @Transactional
  public long building(Long id, BuildingInput input, Actor actor) {
    CrmStore.admin(actor);
    db.one("SELECT id FROM projects WHERE id=?", input.projectId());
    if (id == null)
      return db.insert(
          "INSERT INTO buildings(project_id,name) VALUES (?,?)",
          input.projectId(),
          input.name().trim());
    var old = db.one("SELECT project_id FROM buildings WHERE id=? FOR UPDATE", id);
    if (CrmStore.number(old, "project_id") != input.projectId())
      throw CrmStore.bad("A building cannot be moved to another project.");
    db.jdbc().update("UPDATE buildings SET name=? WHERE id=?", input.name().trim(), id);
    return id;
  }

  @Transactional
  public long unit(Long id, UnitInput input, Actor actor) {
    CrmStore.admin(actor);
    db.one("SELECT id FROM buildings WHERE id=?", input.buildingId());
    if (id == null)
      return db.insert(
          "INSERT INTO units(building_id,unit_number,type,price) VALUES (?,?,?,?)",
          input.buildingId(),
          input.unitNumber().trim(),
          input.type().trim(),
          input.price());
    var old = db.one("SELECT * FROM units WHERE id=? FOR UPDATE", id);
    if ("BOOKED".equals(old.get("availability")))
      throw CrmStore.conflict("Booked units cannot be edited.");
    if (CrmStore.number(old, "building_id") != input.buildingId())
      throw CrmStore.bad("A unit cannot be moved to another building.");
    db.jdbc()
        .update(
            "UPDATE units SET unit_number=?,type=?,price=? WHERE id=?",
            input.unitNumber().trim(),
            input.type().trim(),
            input.price(),
            id);
    return id;
  }
}
