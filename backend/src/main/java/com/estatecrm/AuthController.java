package com.estatecrm;

import com.estatecrm.Contracts.*;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.Map;
import org.springframework.security.authentication.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AuthController {
  private final AuthenticationManager manager;
  private final SecurityContextRepository contexts;
  private final CsrfTokenRepository tokens;
  private final CrmStore store;

  public AuthController(
      AuthenticationManager manager,
      SecurityContextRepository contexts,
      CsrfTokenRepository tokens,
      CrmStore store) {
    this.manager = manager;
    this.contexts = contexts;
    this.tokens = tokens;
    this.store = store;
  }

  @GetMapping("/health")
  Map<String, String> health() {
    return Map.of("status", "ok");
  }

  @GetMapping("/auth/csrf")
  Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
  }

  @PostMapping("/auth/login")
  Actor login(
      @Valid @RequestBody Login input, HttpServletRequest request, HttpServletResponse response) {
    var auth =
        manager.authenticate(
            UsernamePasswordAuthenticationToken.unauthenticated(
                input.email().trim(), input.password()));
    if (request.getSession(false) != null) request.changeSessionId();
    var context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(auth);
    SecurityContextHolder.setContext(context);
    contexts.saveContext(context, request, response);
    tokens.saveToken(null, request, response);
    return store.actor(auth.getName());
  }

  @GetMapping("/auth/me")
  Actor me(Principal principal) {
    return store.actor(principal.getName());
  }
}
