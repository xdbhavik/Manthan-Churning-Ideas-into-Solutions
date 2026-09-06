package com.EDITH.SIH26043;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Full-context smoke test (hits the live local DB, like every source-service
 * test). Eureka client registration is switched off so the context stays
 * hermetic and no background heartbeat threads point at a real registry.
 */
@SpringBootTest(properties = "eureka.client.enabled=false")
class SourceServiceAppTests {

	@Test
	void contextLoads() {
	}

}
