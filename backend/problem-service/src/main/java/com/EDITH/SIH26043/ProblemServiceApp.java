package com.EDITH.SIH26043;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Step 4 strangler extraction: the problem aggregate as a standalone service.
 * Owns the {@code sih_problem} database and every domain/problem/location/
 * evidence/problem_domain row plus the problem-scoped audit trail. It reaches
 * source data only through {@code GET /internal/source-accounts/{id}} on
 * source-service (served by the monolith until Step 5), which gates whether a
 * submission's account is owned by the caller and still allowed to act.
 */
@SpringBootApplication
public class ProblemServiceApp {

    public static void main(String[] args) {
        SpringApplication.run(ProblemServiceApp.class, args);
    }
}
