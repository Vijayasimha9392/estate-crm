package com.estatecrm;

import com.estatecrm.Contracts.Actor;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

@Repository
public class CrmStore {
  private final JdbcTemplate jdbc;

  public CrmStore(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public JdbcTemplate jdbc() {
    return jdbc;
  }

  long insert(String sql, Object... args) {
    var keys = new GeneratedKeyHolder();
    jdbc.update(
        c -> {
          var p = c.prepareStatement(sql, new String[] {"id"});
          for (int i = 0; i < args.length; i++) p.setObject(i + 1, args[i]);
          return p;
        },
        keys);
    return Objects.requireNonNull(keys.getKey()).longValue();
  }

  Map<String, Object> one(String sql, Object... args) {
    var rows = jdbc.queryForList(sql, args);
    if (rows.isEmpty())
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found.");
    return rows.get(0);
  }

  public Actor actor(String email) {
    var row = one("SELECT id,name,email,role FROM users WHERE email=?", email);
    return new Actor(
        number(row, "id"),
        (String) row.get("name"),
        (String) row.get("email"),
        (String) row.get("role"));
  }

  static long number(Map<String, Object> row, String key) {
    return ((Number) row.get(key)).longValue();
  }

  static void admin(Actor actor) {
    if (!actor.admin())
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Only Admin can perform this action.");
  }

  Map<String, Object> lead(long id, Actor actor, boolean lock) {
    var row = one("SELECT * FROM leads WHERE id=?" + (lock ? " FOR UPDATE" : ""), id);
    if (!actor.admin() && number(row, "assigned_to") != actor.id())
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found.");
    return row;
  }

  static ResponseStatusException conflict(String message) {
    return new ResponseStatusException(HttpStatus.CONFLICT, message);
  }

  static ResponseStatusException bad(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
