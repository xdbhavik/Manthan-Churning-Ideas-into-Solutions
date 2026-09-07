package com.EDITH.SIH26043;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * The Phase-2 evaluation pipeline as a standalone service. Owns the
 * {@code sih_eval} database and every {@code evaluation_*} aggregate; reaches
 * problem data only through {@code GET /internal/problems/{id}} on
 * problem-service.
 */
@SpringBootApplication
public class EvaluationServiceApp {

    public static void main(String[] args) {
        SpringApplication.run(EvaluationServiceApp.class, args);
    }
}
