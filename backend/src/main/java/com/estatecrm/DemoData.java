package com.estatecrm;

import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "app.seed-demo", havingValue = "true")
public class DemoData implements CommandLineRunner {
  private final CrmStore db;
  private final PasswordEncoder passwords;

  public DemoData(CrmStore db, PasswordEncoder passwords) {
    this.db = db;
    this.passwords = passwords;
  }

  @Override
  @Transactional
  public void run(String... args) {
    if (db.jdbc().queryForObject("SELECT COUNT(*) FROM users", Long.class) > 0) return;
    String hash = passwords.encode("EstateDemo!2026");
    db.insert(
        "INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,?)",
        "Admin",
        "admin@estate.test",
        hash,
        "ADMIN");
    long maya =
        db.insert(
            "INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,?)",
            "Maya Shah",
            "maya@estate.test",
            hash,
            "SALES");
    long arjun =
        db.insert(
            "INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,?)",
            "Arjun Rao",
            "arjun@estate.test",
            hash,
            "SALES");
    long project =
        db.insert(
            "INSERT INTO projects(name,location) VALUES (?,?)",
            "Skyline Residences",
            "Gachibowli, Hyderabad");
    long second =
        db.insert(
            "INSERT INTO projects(name,location) VALUES (?,?)",
            "Parkside Living",
            "Whitefield, Bengaluru");
    long a = db.insert("INSERT INTO buildings(project_id,name) VALUES (?,?)", project, "Tower A");
    long b = db.insert("INSERT INTO buildings(project_id,name) VALUES (?,?)", project, "Tower B");
    long c =
        db.insert("INSERT INTO buildings(project_id,name) VALUES (?,?)", second, "Garden Tower");
    for (int i = 0; i < 12; i++)
      db.insert(
          "INSERT INTO units(building_id,unit_number,type,price) VALUES (?,?,?,?)",
          i < 4 ? a : i < 8 ? b : c,
          "" + (101 + i % 4),
          i % 2 == 0 ? "2 BHK" : "3 BHK",
          7500000 + i * 350000);
    String[] names = {
      "Neha Kapoor",
      "Rohan Mehta",
      "Aisha Khan",
      "Vikram Reddy",
      "Priya Nair",
      "Karan Patel",
      "Sneha Joshi",
      "Aditya Iyer"
    };
    String[] stages = {
      "NEGOTIATION", "SITE_VISIT", "INTERESTED", "NEW", "CONTACTED", "LOST", "INTERESTED", "NEW"
    };
    LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
    for (int i = 0; i < names.length; i++) {
      long lead =
          db.insert(
              "INSERT INTO leads(name,phone,email,stage,assigned_to,next_follow_up) VALUES"
                  + " (?,?,?,?,?,?)",
              names[i],
              "900000000" + i,
              "lead" + i + "@example.test",
              stages[i],
              i % 2 == 0 ? maya : arjun,
              i == 5 ? null : today.plusDays(i % 4 - 1));
      db.insert(
          "INSERT INTO lead_notes(lead_id,author_id,text) VALUES (?,?,?)",
          lead,
          i % 2 == 0 ? maya : arjun,
          i % 2 == 0
              ? "Interested in a family apartment. Confirm preferred floor before the next call."
              : "Initial enquiry received. Follow up to understand budget and move-in timeline.");
    }
  }
}
