package com.estatecrm;

import org.springframework.test.context.TestPropertySource;

/** Fast application contract tests. H2 is a test dependency only, never a deployment database. */
@TestPropertySource(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:crm;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
      "spring.datasource.username=sa",
      "spring.datasource.password=",
      "spring.datasource.driver-class-name=org.h2.Driver"
    })
class CrmApiTest extends AbstractCrmContract {}
