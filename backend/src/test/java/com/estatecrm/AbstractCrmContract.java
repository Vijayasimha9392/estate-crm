package com.estatecrm;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.estatecrm.Contracts.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties = "app.seed-demo=false")
@AutoConfigureMockMvc
abstract class AbstractCrmContract {
  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired CrmStore db;
  @Autowired BookingService bookings;
  @Autowired PasswordEncoder passwords;
  @Autowired ObjectMapper json;
  long admin, maya, arjun, leadA, leadB, unit;

  @Test
  void adminInventoryAndLeadWorkflowUsesThePublicApi() throws Exception {
    var adminUser = user("admin@estate.test").roles("ADMIN");
    var projectResult =
        mvc.perform(
                post("/api/projects")
                    .with(adminUser)
                    .with(csrf())
                    .contentType("application/json")
                    .content("{\"name\":\"New Project\",\"location\":\"Pune\"}"))
            .andExpect(status().isCreated())
            .andReturn();
    long projectId =
        json.readTree(projectResult.getResponse().getContentAsString()).get("id").asLong();
    var buildingResult =
        mvc.perform(
                post("/api/buildings")
                    .with(adminUser)
                    .with(csrf())
                    .contentType("application/json")
                    .content(
                        json.writeValueAsString(Map.of("projectId", projectId, "name", "Tower C"))))
            .andExpect(status().isCreated())
            .andReturn();
    long buildingId =
        json.readTree(buildingResult.getResponse().getContentAsString()).get("id").asLong();
    mvc.perform(
            post("/api/units")
                .with(adminUser)
                .with(csrf())
                .contentType("application/json")
                .content(
                    json.writeValueAsString(
                        Map.of(
                            "buildingId",
                            buildingId,
                            "unitNumber",
                            "301",
                            "type",
                            "3 BHK",
                            "price",
                            9000000))))
        .andExpect(status().isCreated());
    mvc.perform(get("/api/properties").with(adminUser))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.units[0].unitNumber").exists())
        .andExpect(jsonPath("$.units[0].projectId").exists())
        .andExpect(jsonPath("$.buildings[0].projectId").exists());
    var leadResult =
        mvc.perform(
                post("/api/leads")
                    .with(adminUser)
                    .with(csrf())
                    .contentType("application/json")
                    .content(
                        "{\"name\":\"New"
                            + " Buyer\",\"phone\":\"9000000012\",\"stage\":\"NEW\",\"nextFollowUp\":\"2026-09-10\"}"))
            .andExpect(status().isCreated())
            .andReturn();
    long leadId = json.readTree(leadResult.getResponse().getContentAsString()).get("id").asLong();
    mvc.perform(
            patch("/api/leads/" + leadId + "/assignee")
                .with(adminUser)
                .with(csrf())
                .contentType("application/json")
                .content(json.writeValueAsString(Map.of("employeeId", maya))))
        .andExpect(status().isNoContent());
    mvc.perform(
            post("/api/leads/" + leadId + "/notes")
                .with(user("maya@estate.test").roles("SALES"))
                .with(csrf())
                .contentType("application/json")
                .content("{\"text\":\"Site visit planned\"}"))
        .andExpect(status().isCreated());
    mvc.perform(get("/api/leads/" + leadId).with(user("maya@estate.test").roles("SALES")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.assigneeName").value("Maya"))
        .andExpect(jsonPath("$.nextFollowUp").value("2026-09-10"))
        .andExpect(jsonPath("$.notes[0].authorName").value("Maya"))
        .andExpect(jsonPath("$.notes[0].createdAt").exists());
  }

  @BeforeEach
  void seed() {
    for (String table :
        List.of("bookings", "lead_notes", "leads", "units", "buildings", "projects", "users"))
      jdbc.update("DELETE FROM " + table);
    String hash = passwords.encode("EstateDemo!2026");
    admin =
        db.insert(
            "INSERT INTO users(name,email,password_hash,role) VALUES"
                + " ('Admin','admin@estate.test',?,'ADMIN')",
            hash);
    maya =
        db.insert(
            "INSERT INTO users(name,email,password_hash,role) VALUES"
                + " ('Maya','maya@estate.test',?,'SALES')",
            hash);
    arjun =
        db.insert(
            "INSERT INTO users(name,email,password_hash,role) VALUES"
                + " ('Arjun','arjun@estate.test',?,'SALES')",
            hash);
    leadA =
        db.insert(
            "INSERT INTO leads(name,phone,stage,assigned_to,next_follow_up) VALUES ('Customer"
                + " A','9000000000','INTERESTED',?,CURRENT_DATE)",
            maya);
    leadB =
        db.insert(
            "INSERT INTO leads(name,phone,stage,assigned_to) VALUES ('Customer"
                + " B','9000000001','NEW',?)",
            arjun);
    long p = db.insert("INSERT INTO projects(name,location) VALUES ('Project','Hyderabad')");
    long b = db.insert("INSERT INTO buildings(project_id,name) VALUES (?,'Tower A')", p);
    unit =
        db.insert(
            "INSERT INTO units(building_id,unit_number,type,price) VALUES (?,'101','2"
                + " BHK',7500000.00)",
            b);
  }

  @Test
  void sessionLoginAndLogoutRequireCsrf() throws Exception {
    mvc.perform(get("/api/leads")).andExpect(status().isUnauthorized());
    mvc.perform(
            post("/api/auth/login")
                .contentType("application/json")
                .content("{\"email\":\"maya@estate.test\",\"password\":\"EstateDemo!2026\"}"))
        .andExpect(status().isForbidden());
    var csrfResult = mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn();
    var token = json.readTree(csrfResult.getResponse().getContentAsString());
    var session = (MockHttpSession) csrfResult.getRequest().getSession();
    mvc.perform(
            post("/api/auth/login")
                .session(session)
                .header(token.get("headerName").asText(), token.get("token").asText())
                .contentType("application/json")
                .content("{\"email\":\"maya@estate.test\",\"password\":\"EstateDemo!2026\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.role").value("SALES"));
    mvc.perform(get("/api/auth/me").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value("maya@estate.test"));
    mvc.perform(post("/api/auth/logout").session(session).with(csrf()))
        .andExpect(status().isNoContent());
    mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
  }

  @Test
  void employeesCannotAccessAnotherLeadOrAdminActions() throws Exception {
    var employee = user("maya@estate.test").roles("SALES");
    mvc.perform(get("/api/leads").with(employee))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(1))
        .andExpect(jsonPath("$.items[0].name").value("Customer A"));
    mvc.perform(get("/api/leads/" + leadB).with(employee)).andExpect(status().isNotFound());
    mvc.perform(
            post("/api/leads/" + leadB + "/notes")
                .with(employee)
                .with(csrf())
                .contentType("application/json")
                .content("{\"text\":\"Forbidden\"}"))
        .andExpect(status().isNotFound());
    mvc.perform(
            patch("/api/leads/" + leadA + "/assignee")
                .with(employee)
                .with(csrf())
                .contentType("application/json")
                .content("{\"employeeId\":" + arjun + "}"))
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/projects")
                .with(employee)
                .with(csrf())
                .contentType("application/json")
                .content("{\"name\":\"No\",\"location\":\"No\"}"))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/dashboard").with(employee))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.counts.totalLeads").value(1));
  }

  @Test
  void leadStageCannotCreateAnUnbackedBooking() throws Exception {
    mvc.perform(
            put("/api/leads/" + leadA)
                .with(user("maya@estate.test").roles("SALES"))
                .with(csrf())
                .contentType("application/json")
                .content(
                    "{\"name\":\"Customer"
                        + " A\",\"phone\":\"9000000000\",\"email\":null,\"stage\":\"BOOKED\",\"nextFollowUp\":null}"))
        .andExpect(status().isBadRequest());
    assertThat(jdbc.queryForObject("SELECT stage FROM leads WHERE id=?", String.class, leadA))
        .isEqualTo("INTERESTED");
  }

  @Test
  void successfulBookingUpdatesAllRecordsAndUsesServerPrice() throws Exception {
    mvc.perform(
            post("/api/bookings")
                .with(user("maya@estate.test").roles("SALES"))
                .with(csrf())
                .contentType("application/json")
                .content("{\"leadId\":" + leadA + ",\"unitId\":" + unit + "}"))
        .andExpect(status().isCreated());
    assertThat(jdbc.queryForObject("SELECT availability FROM units WHERE id=?", String.class, unit))
        .isEqualTo("BOOKED");
    assertThat(jdbc.queryForObject("SELECT stage FROM leads WHERE id=?", String.class, leadA))
        .isEqualTo("BOOKED");
    assertThat(
            jdbc.queryForObject("SELECT next_follow_up FROM leads WHERE id=?", String.class, leadA))
        .isNull();
    mvc.perform(get("/api/dashboard").with(user("maya@estate.test").roles("SALES")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.bookings.bookingCount").value(1))
        .andExpect(jsonPath("$.bookings.bookedValue").value(7500000));
    mvc.perform(get("/api/bookings").with(user("arjun@estate.test").roles("SALES")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
    mvc.perform(
            post("/api/bookings")
                .with(user("arjun@estate.test").roles("SALES"))
                .with(csrf())
                .contentType("application/json")
                .content("{\"leadId\":" + leadB + ",\"unitId\":" + unit + "}"))
        .andExpect(status().isConflict());
  }

  @Test
  void concurrentEmployeesGetExactlyOneBooking() throws Exception {
    ExecutorService executor = Executors.newFixedThreadPool(2);
    CountDownLatch ready = new CountDownLatch(2), go = new CountDownLatch(1);
    try {
      var first = executor.submit(() -> attempt(leadA, "maya@estate.test", ready, go));
      var second = executor.submit(() -> attempt(leadB, "arjun@estate.test", ready, go));
      assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
      go.countDown();
      assertThat(List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS)))
          .containsExactlyInAnyOrder(201, 409);
      assertThat(
              jdbc.queryForObject(
                  "SELECT COUNT(*) FROM bookings WHERE unit_id=?", Long.class, unit))
          .isEqualTo(1);
      assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM leads WHERE stage='BOOKED'", Long.class))
          .isEqualTo(1);
    } finally {
      go.countDown();
      executor.shutdownNow();
    }
  }

  private int attempt(long lead, String email, CountDownLatch ready, CountDownLatch go)
      throws Exception {
    var actor = db.actor(email);
    ready.countDown();
    if (!go.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Barrier timed out");
    try {
      bookings.book(new BookingInput(lead, unit), actor);
      return 201;
    } catch (ResponseStatusException e) {
      return e.getStatusCode().value();
    }
  }

  @Test
  void finalStepFailureRollsBackBookingAndUnit() {
    jdbc.execute("ALTER TABLE leads ADD CONSTRAINT test_reject_booked CHECK (stage <> 'BOOKED')");
    try {
      assertThatThrownBy(
              () -> bookings.book(new BookingInput(leadA, unit), db.actor("maya@estate.test")))
          .isInstanceOf(org.springframework.dao.DataAccessException.class)
.hasMessageContaining("test_reject_booked");
      assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM bookings", Long.class)).isZero();
      assertThat(
              jdbc.queryForObject("SELECT availability FROM units WHERE id=?", String.class, unit))
          .isEqualTo("AVAILABLE");
      assertThat(jdbc.queryForObject("SELECT stage FROM leads WHERE id=?", String.class, leadA))
          .isEqualTo("INTERESTED");
    } finally {
      jdbc.execute("ALTER TABLE leads DROP CONSTRAINT test_reject_booked");
    }
  }

  @Test
  void invalidInputsAndSpoofedPriceAreRejected() throws Exception {
    var employee = user("maya@estate.test").roles("SALES");
    mvc.perform(
            post("/api/leads")
                .with(employee)
                .with(csrf())
                .contentType("application/json")
                .content("{\"name\":\"\",\"phone\":\"x\",\"stage\":\"NEW\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fields.name").exists());
    mvc.perform(
            post("/api/bookings")
                .with(employee)
                .with(csrf())
                .contentType("application/json")
                .content("{\"leadId\":" + leadA + ",\"unitId\":" + unit + ",\"bookedPrice\":1}"))
        .andExpect(status().isBadRequest());
  }
}
