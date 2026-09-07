package com.estatecrm;

import com.estatecrm.Contracts.Actor;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {
  private final CrmStore db;
  private final ZoneId zone;

  public DashboardService(CrmStore db, @Value("${app.timezone}") String zone) {
    this.db = db;
    this.zone = ZoneId.of(zone);
  }

  @Transactional(readOnly = true)
  public Map<String, Object> summary(Actor actor) {
    var today = LocalDate.now(zone);
    String scope = actor.admin() ? "" : " AND l.assigned_to=?";
    List<Object> args = new ArrayList<>(List.of(today, today));
    if (!actor.admin()) args.add(actor.id());
    var counts =
        db.one(
            "SELECT COUNT(*) AS \"totalLeads\",COALESCE(SUM(stage NOT IN ('BOOKED','LOST')),0) AS"
                + " \"activeLeads\",COALESCE(SUM(stage NOT IN ('BOOKED','LOST') AND"
                + " next_follow_up=?),0) AS \"dueToday\",COALESCE(SUM(stage NOT IN"
                + " ('BOOKED','LOST') AND next_follow_up<?),0) AS overdue FROM leads l WHERE 1=1"
                + scope,
            args.toArray());
    Object[] scopeArgs = actor.admin() ? new Object[] {} : new Object[] {actor.id()};
    var bookings =
        db.one(
            "SELECT COUNT(*) AS \"bookingCount\",COALESCE(SUM(b.booked_price),0) AS \"bookedValue\""
                + " FROM bookings b JOIN leads l ON l.id=b.lead_id WHERE 1=1"
                + scope,
            scopeArgs);
    var followArgs = new ArrayList<Object>();
    followArgs.add(today);
    if (!actor.admin()) followArgs.add(actor.id());
    return Map.of(
        "counts",
        counts,
        "bookings",
        bookings,
        "today",
        today,
        "timezone",
        zone.toString(),
        "stages",
        db.jdbc()
            .queryForList(
                "SELECT stage,COUNT(*) AS count FROM leads l WHERE 1=1" + scope + " GROUP BY stage",
                scopeArgs),
        "followUps",
        db.jdbc()
            .queryForList(
                LeadService.SELECT
                    + " WHERE l.stage NOT IN ('BOOKED','LOST') AND l.next_follow_up<=?"
                    + scope
                    + " ORDER BY l.next_follow_up,l.id LIMIT 10",
                followArgs.toArray()));
  }
}
