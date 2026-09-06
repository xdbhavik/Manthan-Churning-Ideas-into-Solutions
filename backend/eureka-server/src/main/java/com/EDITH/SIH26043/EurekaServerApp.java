package com.EDITH.SIH26043;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

/**
 * Service registry for the SIH26043 microservices (source/problem/evaluation).
 * Standalone single node on :8761; every service registers here and (where the
 * internal call is load-balanced) resolves its peers through this registry.
 */
@SpringBootApplication
@EnableEurekaServer
public class EurekaServerApp {

    public static void main(String[] args) {
        SpringApplication.run(EurekaServerApp.class, args);
    }
}
