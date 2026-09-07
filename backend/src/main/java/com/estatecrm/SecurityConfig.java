package com.estatecrm;

import java.util.List;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.*;
import org.springframework.security.web.csrf.*;

@Configuration
public class SecurityConfig {
  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  UserDetailsService userDetailsService(JdbcTemplate jdbc) {
    return email -> {
      var rows =
          jdbc.queryForList("SELECT email,password_hash,role FROM users WHERE email=?", email);
      if (rows.isEmpty()) throw new UsernameNotFoundException("Invalid credentials");
      var row = rows.get(0);
      return User.withUsername((String) row.get("email"))
          .password((String) row.get("password_hash"))
          .roles((String) row.get("role"))
          .build();
    };
  }

  @Bean
  AuthenticationManager authenticationManager(UserDetailsService users, PasswordEncoder encoder) {
    var provider = new DaoAuthenticationProvider(users);
    provider.setPasswordEncoder(encoder);
    return new ProviderManager(List.of(provider));
  }

  @Bean
  SecurityContextRepository securityContextRepository() {
    return new HttpSessionSecurityContextRepository();
  }

  @Bean
  CsrfTokenRepository csrfTokenRepository() {
    return new HttpSessionCsrfTokenRepository();
  }

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http, SecurityContextRepository contexts, CsrfTokenRepository csrf)
      throws Exception {
    http.securityContext(c -> c.securityContextRepository(contexts));
    http.csrf(c -> c.csrfTokenRepository(csrf));
    http.authorizeHttpRequests(
        a ->
            a.requestMatchers("/api/auth/csrf", "/api/auth/login", "/api/health", "/error")
                .permitAll()
                .anyRequest()
                .authenticated());
    http.exceptionHandling(
        e ->
            e.authenticationEntryPoint(
                    (q, r, x) -> {
                      r.setStatus(401);
                      r.setContentType("application/json");
                      r.getWriter().write("{\"message\":\"Please sign in to continue.\"}");
                    })
                .accessDeniedHandler(
                    (q, r, x) -> {
                      r.setStatus(403);
                      r.setContentType("application/json");
                      r.getWriter()
                          .write(
                              "{\"message\":\"Permission denied or session expired. Refresh and try"
                                  + " again.\"}");
                    }));
    http.logout(
        l ->
            l.logoutUrl("/api/auth/logout")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
                .logoutSuccessHandler((q, r, a) -> r.setStatus(204)));
    return http.build();
  }
}
