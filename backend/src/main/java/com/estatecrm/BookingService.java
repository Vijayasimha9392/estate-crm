package com.estatecrm;

import com.estatecrm.Contracts.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {
  private final CrmStore db;

  public BookingService(CrmStore db) {
    this.db = db;
  }

  /** All booking writers lock lead first, then unit. No network work inside this transaction. */
  @Transactional
  public long book(BookingInput input, Actor actor) {
    var lead = db.lead(input.leadId(), actor, true);
    if ("BOOKED".equals(lead.get("stage")))
      throw CrmStore.conflict("This lead already has a booking.");
    if ("LOST".equals(lead.get("stage")))
      throw CrmStore.conflict("Reopen this lead before booking a unit.");
    var unit = db.one("SELECT * FROM units WHERE id=? FOR UPDATE", input.unitId());
    if (!"AVAILABLE".equals(unit.get("availability")))
      throw CrmStore.conflict(
          "This unit has just been booked. Please choose another available unit.");
    long id =
        db.insert(
            "INSERT INTO bookings(lead_id,unit_id,booked_by,booked_price) VALUES (?,?,?,?)",
            input.leadId(),
            input.unitId(),
            actor.id(),
            unit.get("price"));
    db.jdbc().update("UPDATE units SET availability='BOOKED' WHERE id=?", input.unitId());
    db.jdbc()
        .update("UPDATE leads SET stage='BOOKED',next_follow_up=NULL WHERE id=?", input.leadId());
    return id;
  }

  public List<Map<String, Object>> list(Actor actor) {
    String sql =
        "SELECT bk.id,bk.lead_id AS \"leadId\",l.name AS \"leadName\",bk.booked_price AS"
            + " \"bookedPrice\",bk.booked_at AS \"bookedAt\",u.unit_number AS"
            + " \"unitNumber\",bl.name AS \"buildingName\",p.name AS \"projectName\",emp.name AS"
            + " \"bookedByName\" FROM bookings bk JOIN leads l ON l.id=bk.lead_id JOIN units u ON"
            + " u.id=bk.unit_id JOIN buildings bl ON bl.id=u.building_id JOIN projects p ON"
            + " p.id=bl.project_id JOIN users emp ON emp.id=bk.booked_by";
    return actor.admin()
        ? db.jdbc().queryForList(sql + " ORDER BY bk.id DESC")
        : db.jdbc().queryForList(sql + " WHERE l.assigned_to=? ORDER BY bk.id DESC", actor.id());
  }
}
