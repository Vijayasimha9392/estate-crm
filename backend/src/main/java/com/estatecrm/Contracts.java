package com.estatecrm;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Request contracts deliberately omit server-owned price, role and booking-state fields. */
public final class Contracts {
  private Contracts() {}

  public enum Stage {
    NEW,
    CONTACTED,
    SITE_VISIT,
    INTERESTED,
    NEGOTIATION,
    BOOKED,
    LOST
  }

  public record Login(@NotBlank @Email String email, @NotBlank @Size(max = 100) String password) {}

  public record LeadInput(
      @NotBlank @Size(max = 100) String name,
      @NotBlank @Pattern(regexp = "[+0-9() .-]{7,25}") String phone,
      @Email @Size(max = 254) String email,
      @NotNull Stage stage,
      LocalDate nextFollowUp) {}

  public record Assignment(@NotNull @Positive Long employeeId) {}

  public record Note(@NotBlank @Size(max = 2000) String text) {}

  public record ProjectInput(
      @NotBlank @Size(max = 100) String name, @NotBlank @Size(max = 150) String location) {}

  public record BuildingInput(
      @NotNull @Positive Long projectId, @NotBlank @Size(max = 100) String name) {}

  public record UnitInput(
      @NotNull @Positive Long buildingId,
      @NotBlank @Size(max = 30) String unitNumber,
      @NotBlank @Size(max = 30) String type,
      @NotNull @DecimalMin("0.01") @Digits(integer = 12, fraction = 2) BigDecimal price) {}

  public record BookingInput(@NotNull @Positive Long leadId, @NotNull @Positive Long unitId) {}

  public record Actor(long id, String name, String email, String role) {
    public boolean admin() {
      return role.equals("ADMIN");
    }
  }
}
