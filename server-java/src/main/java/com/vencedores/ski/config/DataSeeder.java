package com.vencedores.ski.config;

import com.vencedores.ski.repository.DynamoDbRepository;
import com.vencedores.ski.service.AdminUserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final DynamoDbRepository repo;
    private final AdminUserService adminUserService;

    @Value("${app.admin.default-username}")
    private String defaultUsername;

    @Value("${app.admin.default-password}")
    private String defaultPassword;

    public DataSeeder(DynamoDbRepository repo, AdminUserService adminUserService) {
        this.repo = repo;
        this.adminUserService = adminUserService;
    }

    @Override
    public void run(String... args) {
        // Create table if using local DynamoDB
        try {
            repo.createTableIfNotExists();
        } catch (Exception e) {
            log.warn("Could not create/check table (may already exist in AWS): {}", e.getMessage());
        }

        // Seed default admin user if none exists
        try {
            adminUserService.ensureDefaultAdmin(defaultUsername, defaultPassword);
            log.info("Default admin user ensured: {}", defaultUsername);
        } catch (Exception e) {
            log.error("Failed to seed default admin: {}", e.getMessage());
        }
    }
}
