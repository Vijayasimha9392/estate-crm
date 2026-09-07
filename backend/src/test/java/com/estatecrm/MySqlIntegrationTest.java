package com.estatecrm;

import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Required pre-submission database check: mvn -DmysqlTests=true -Dtest=MySqlIntegrationTest test
 * (Docker running).
 */
@Testcontainers
@EnabledIfSystemProperty(named = "mysqlTests", matches = "true")
class MySqlIntegrationTest extends AbstractCrmContract {
  @Container static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4");

  @DynamicPropertySource
  static void database(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", mysql::getJdbcUrl);
    registry.add("spring.datasource.username", mysql::getUsername);
    registry.add("spring.datasource.password", mysql::getPassword);
  }
}
