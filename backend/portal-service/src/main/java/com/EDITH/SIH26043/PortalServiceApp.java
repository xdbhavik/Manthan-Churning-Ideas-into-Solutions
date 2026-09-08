package com.EDITH.SIH26043;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * The public problem portal as a standalone service. Owns the {@code sih_portal}
 * database: participant profiles (students + universities), the published problem
 * catalog, teams, submissions and submission files.
 *
 * <p>Identity is delegated to source-service (shared claim JWT); problems are
 * pushed here by evaluation-service when a cycle reaches
 * {@code EVALUATION_COMPLETED}; submitted projects travel back to evaluation-service
 * as project-review work items assigned to the evaluator who scored the problem.</p>
 */
@SpringBootApplication
public class PortalServiceApp {

    public static void main(String[] args) {
        SpringApplication.run(PortalServiceApp.class, args);
    }
}
