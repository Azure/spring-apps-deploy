package com.azure.spring.cloud.test.config.client;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class Application {

    public static void main(String [] args) {
        SpringApplication.run(Application.class, args);
    }
    
    @GetMapping("/{message}")
    public String echo(@PathVariable("message") String message) {
        System.out.println(message + " from echo sample");
        System.out.flush();
        return message;
    }

    @GetMapping("/health")
    public String health() {
        return "GREEN";
    }

    @GetMapping("/javaversion")
    public String version() {
        return System.getProperty("java.version");
    }
}
