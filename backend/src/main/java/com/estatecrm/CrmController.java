package com.estatecrm;

import com.estatecrm.Contracts.*;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class CrmController {
  private final CrmStore db;
  private final LeadService leads;
  private final PropertyService properties;
  private final BookingService bookings;
  private final DashboardService dashboard;

  public CrmController(
      CrmStore db,
      LeadService leads,
      PropertyService properties,
      BookingService bookings,
      DashboardService dashboard) {
    this.db = db;
    this.leads = leads;
    this.properties = properties;
    this.bookings = bookings;
    this.dashboard = dashboard;
  }

  private Actor actor(Principal p) {
    return db.actor(p.getName());
  }

  @GetMapping("/employees")
  Object employees(Principal p) {
    CrmStore.admin(actor(p));
    return db.jdbc()
        .queryForList("SELECT id,name,email FROM users WHERE role='SALES' ORDER BY name");
  }

  @GetMapping("/dashboard")
  Object dashboard(Principal p) {
    return dashboard.summary(actor(p));
  }

  @GetMapping("/leads")
  Object leads(
      Principal p,
      @RequestParam(defaultValue = "") String q,
      @RequestParam(required = false) Stage stage,
      @RequestParam(required = false) Long assignee,
      @RequestParam(defaultValue = "0") int page) {
    return leads.list(actor(p), q, stage, assignee, page);
  }

  @GetMapping("/leads/{id}")
  Object lead(@PathVariable long id, Principal p) {
    return leads.detail(id, actor(p));
  }

  @PostMapping("/leads")
  @ResponseStatus(HttpStatus.CREATED)
  Object createLead(@Valid @RequestBody LeadInput input, Principal p) {
    return Map.of("id", leads.create(input, actor(p)));
  }

  @PutMapping("/leads/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void updateLead(@PathVariable long id, @Valid @RequestBody LeadInput input, Principal p) {
    leads.update(id, input, actor(p));
  }

  @PatchMapping("/leads/{id}/assignee")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void assign(@PathVariable long id, @Valid @RequestBody Assignment input, Principal p) {
    leads.assign(id, input.employeeId(), actor(p));
  }

  @PostMapping("/leads/{id}/notes")
  @ResponseStatus(HttpStatus.CREATED)
  Object note(@PathVariable long id, @Valid @RequestBody Note input, Principal p) {
    return Map.of("id", leads.note(id, input.text(), actor(p)));
  }

  @GetMapping("/properties")
  Object inventory() {
    return properties.inventory();
  }

  @PostMapping("/projects")
  @ResponseStatus(HttpStatus.CREATED)
  Object project(@Valid @RequestBody ProjectInput input, Principal p) {
    return Map.of("id", properties.project(null, input, actor(p)));
  }

  @PutMapping("/projects/{id}")
  Object project(@PathVariable long id, @Valid @RequestBody ProjectInput input, Principal p) {
    return Map.of("id", properties.project(id, input, actor(p)));
  }

  @PostMapping("/buildings")
  @ResponseStatus(HttpStatus.CREATED)
  Object building(@Valid @RequestBody BuildingInput input, Principal p) {
    return Map.of("id", properties.building(null, input, actor(p)));
  }

  @PutMapping("/buildings/{id}")
  Object building(@PathVariable long id, @Valid @RequestBody BuildingInput input, Principal p) {
    return Map.of("id", properties.building(id, input, actor(p)));
  }

  @PostMapping("/units")
  @ResponseStatus(HttpStatus.CREATED)
  Object unit(@Valid @RequestBody UnitInput input, Principal p) {
    return Map.of("id", properties.unit(null, input, actor(p)));
  }

  @PutMapping("/units/{id}")
  Object unit(@PathVariable long id, @Valid @RequestBody UnitInput input, Principal p) {
    return Map.of("id", properties.unit(id, input, actor(p)));
  }

  @GetMapping("/bookings")
  Object bookings(Principal p) {
    return bookings.list(actor(p));
  }

  @PostMapping("/bookings")
  @ResponseStatus(HttpStatus.CREATED)
  Object book(@Valid @RequestBody BookingInput input, Principal p) {
    return Map.of("id", bookings.book(input, actor(p)));
  }
}
