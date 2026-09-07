package com.estatecrm;

import com.estatecrm.Contracts.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LeadService {
  private final CrmStore db;
  static final String SELECT =
      "SELECT l.id,l.name,l.phone,l.email,l.stage,l.assigned_to AS \"assignedTo\",u.name AS"
          + " \"assigneeName\",l.next_follow_up AS \"nextFollowUp\",l.created_at AS"
          + " \"createdAt\",l.updated_at AS \"updatedAt\" FROM leads l JOIN users u ON"
          + " u.id=l.assigned_to";

  public LeadService(CrmStore db) {
    this.db = db;
  }

  public Map<String, Object> list(Actor actor, String q, Stage stage, Long assignee, int page) {
    page = Math.max(0, page);
    String where = " WHERE 1=1";
    List<Object> args = new ArrayList<>();
    if (!actor.admin()) {
      where += " AND l.assigned_to=?";
      args.add(actor.id());
    } else if (assignee != null) {
      where += " AND l.assigned_to=?";
      args.add(assignee);
    }
    if (q != null && !q.isBlank()) {
      where +=
          " AND (LOCATE(?,l.name)>0 OR LOCATE(?,l.phone)>0 OR LOCATE(?,COALESCE(l.email,''))>0)";
      args.addAll(List.of(q.trim(), q.trim(), q.trim()));
    }
    if (stage != null) {
      where += " AND l.stage=?";
      args.add(stage.name());
    }
    long total =
        db.jdbc()
            .queryForObject("SELECT COUNT(*) FROM leads l" + where, Long.class, args.toArray());
    args.add(20);
    args.add((long) page * 20);
    return Map.of(
        "items",
        db.jdbc()
            .queryForList(
                SELECT + where + " ORDER BY l.updated_at DESC,l.id DESC LIMIT ? OFFSET ?",
                args.toArray()),
        "total",
        total,
        "page",
        page,
        "size",
        20);
  }

  @Transactional(readOnly = true)
  public Map<String, Object> detail(long id, Actor actor) {
    db.lead(id, actor, false);
    var result = new LinkedHashMap<>(db.one(SELECT + " WHERE l.id=?", id));
    result.put(
        "notes",
        db.jdbc()
            .queryForList(
                "SELECT n.id,n.text,n.created_at AS \"createdAt\",u.name AS \"authorName\" FROM"
                    + " lead_notes n JOIN users u ON u.id=n.author_id WHERE n.lead_id=? ORDER BY"
                    + " n.created_at DESC,n.id DESC",
                id));
    result.put(
        "booking",
        db.jdbc()
            .queryForList(
                "SELECT b.id,b.booked_price AS \"bookedPrice\",b.booked_at AS"
                    + " \"bookedAt\",u.unit_number AS \"unitNumber\",bl.name AS"
                    + " \"buildingName\",p.name AS \"projectName\" FROM bookings b JOIN units u ON"
                    + " u.id=b.unit_id JOIN buildings bl ON bl.id=u.building_id JOIN projects p ON"
                    + " p.id=bl.project_id WHERE b.lead_id=?",
                id));
    return result;
  }

  @Transactional
  public long create(LeadInput input, Actor actor) {
    if (input.stage() == Stage.BOOKED)
      throw CrmStore.bad("Create a booking to mark a lead as Booked.");
    return db.insert(
        "INSERT INTO leads(name,phone,email,stage,assigned_to,next_follow_up) VALUES (?,?,?,?,?,?)",
        input.name().trim(),
        input.phone().trim(),
        input.email(),
        input.stage().name(),
        actor.id(),
        terminal(input.stage()) ? null : input.nextFollowUp());
  }

  @Transactional
  public void update(long id, LeadInput input, Actor actor) {
    var row = db.lead(id, actor, true);
    boolean booked = "BOOKED".equals(row.get("stage"));
    if (booked && input.stage() != Stage.BOOKED)
      throw CrmStore.conflict("Booked leads cannot change stage.");
    if (!booked && input.stage() == Stage.BOOKED)
      throw CrmStore.bad("Create a booking to mark a lead as Booked.");
    db.jdbc()
        .update(
            "UPDATE leads SET name=?,phone=?,email=?,stage=?,next_follow_up=? WHERE id=?",
            input.name().trim(),
            input.phone().trim(),
            input.email(),
            input.stage().name(),
            terminal(input.stage()) ? null : input.nextFollowUp(),
            id);
  }

  @Transactional
  public void assign(long id, long employee, Actor actor) {
    CrmStore.admin(actor);
    db.lead(id, actor, true);
    var user = db.one("SELECT role FROM users WHERE id=?", employee);
    if (!"SALES".equals(user.get("role"))) throw CrmStore.bad("Choose a Sales Employee.");
    db.jdbc().update("UPDATE leads SET assigned_to=? WHERE id=?", employee, id);
  }

  @Transactional
  public long note(long id, String text, Actor actor) {
    db.lead(id, actor, true);
    return db.insert(
        "INSERT INTO lead_notes(lead_id,author_id,text) VALUES (?,?,?)",
        id,
        actor.id(),
        text.trim());
  }

  static boolean terminal(Stage stage) {
    return stage == Stage.BOOKED || stage == Stage.LOST;
  }
}
