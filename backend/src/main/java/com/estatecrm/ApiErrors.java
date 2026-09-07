package com.estatecrm;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrors {
  private static final Logger log = LoggerFactory.getLogger(ApiErrors.class);

  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<?> business(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode())
        .body(Map.of("message", e.getReason() == null ? "Request failed" : e.getReason()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<?> validation(MethodArgumentNotValidException e) {
    Map<String, String> fields = new LinkedHashMap<>();
    e.getBindingResult()
        .getFieldErrors()
        .forEach(f -> fields.putIfAbsent(f.getField(), f.getDefaultMessage()));
    return ResponseEntity.badRequest()
        .body(Map.of("message", "Please check the highlighted fields.", "fields", fields));
  }

  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MethodArgumentTypeMismatchException.class
  })
  ResponseEntity<?> malformed(Exception e) {
    return ResponseEntity.badRequest()
        .body(Map.of("message", "Invalid request. Check dates, numbers and allowed values."));
  }

  @ExceptionHandler(AuthenticationException.class)
  ResponseEntity<?> authentication(Exception e) {
    return ResponseEntity.status(401).body(Map.of("message", "Email or password is incorrect."));
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<?> permission(Exception e) {
    return ResponseEntity.status(403)
        .body(Map.of("message", "You do not have permission for this action."));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<?> integrity(Exception e) {
    return ResponseEntity.status(409)
        .body(
            Map.of(
                "message",
                "This record conflicts with existing data. Refresh and check for duplicates."));
  }

  @ExceptionHandler(PessimisticLockingFailureException.class)
  ResponseEntity<?> lock(Exception e) {
    return ResponseEntity.status(409)
        .body(Map.of("message", "Another update is in progress. Refresh and try again."));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<?> unexpected(Exception e) {
    log.error("Unexpected request failure", e);
    return ResponseEntity.internalServerError()
        .body(Map.of("message", "Something went wrong. Please try again."));
  }
}
