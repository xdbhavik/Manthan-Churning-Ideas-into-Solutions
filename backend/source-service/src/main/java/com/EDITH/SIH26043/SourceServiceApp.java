package com.EDITH.SIH26043;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class SourceServiceApp {

	public static void main(String[] args) {
		SpringApplication.run(SourceServiceApp.class, args);
	}

}
