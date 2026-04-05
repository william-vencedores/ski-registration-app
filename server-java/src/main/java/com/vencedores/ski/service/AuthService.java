package com.vencedores.ski.service;

import com.vencedores.ski.repository.DynamoDbRepository;
import com.vencedores.ski.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.time.Instant;
import java.util.Map;

@Service
public class AuthService {

    private final DynamoDbRepository repo;
    private final JwtTokenProvider tokenProvider;
    private final PasswordEncoder passwordEncoder;

    public AuthService(DynamoDbRepository repo, JwtTokenProvider tokenProvider,
                       PasswordEncoder passwordEncoder) {
        this.repo = repo;
        this.tokenProvider = tokenProvider;
        this.passwordEncoder = passwordEncoder;
    }

    public Map<String, Object> login(String username, String password) {
        var item = repo.getItem("ADMIN", "USER#" + username);
        if (item == null || !passwordEncoder.matches(password, item.get("passwordHash").s())) {
            try {
                Thread.sleep(600); // Delay on failure
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
            return null;
        }

        // Update lastLogin
        repo.updateItem("ADMIN", "USER#" + username,
                "SET lastLogin = :t",
                Map.of(":t", AttributeValue.builder().s(Instant.now().toString()).build()),
                null);

        String token = tokenProvider.generateToken(username, "admin");
        return Map.of(
                "token", token,
                "expiresIn", "8h",
                "username", username
        );
    }
}
