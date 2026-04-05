package com.vencedores.ski.service;

import com.vencedores.ski.dto.request.CreateAdminUserRequest;
import com.vencedores.ski.exception.BadRequestException;
import com.vencedores.ski.exception.ResourceNotFoundException;
import com.vencedores.ski.repository.DynamoDbRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.time.Instant;
import java.util.*;

@Service
public class AdminUserService {

    private final DynamoDbRepository repo;
    private final PasswordEncoder passwordEncoder;

    public AdminUserService(DynamoDbRepository repo, PasswordEncoder passwordEncoder) {
        this.repo = repo;
        this.passwordEncoder = passwordEncoder;
    }

    public Map<String, Object> createUser(CreateAdminUserRequest req) {
        if (req.getUsername() == null || req.getPassword() == null) {
            throw new BadRequestException("Username and password are required");
        }

        var existing = repo.getItem("ADMIN", "USER#" + req.getUsername());
        if (existing != null) {
            throw new BadRequestException("User already exists: " + req.getUsername());
        }

        var now = Instant.now().toString();
        var item = new HashMap<String, AttributeValue>();
        item.put("PK", s("ADMIN"));
        item.put("SK", s("USER#" + req.getUsername()));
        item.put("username", s(req.getUsername()));
        item.put("passwordHash", s(passwordEncoder.encode(req.getPassword())));
        item.put("displayName", s(req.getDisplayName() != null ? req.getDisplayName() : req.getUsername()));
        item.put("createdAt", s(now));

        repo.putItem(item);
        return userToMap(item);
    }

    public List<Map<String, Object>> listUsers() {
        var items = repo.queryByPkAndSkPrefix("ADMIN", "USER#");
        return items.stream().map(this::userToMap).toList();
    }

    public Map<String, Object> updateUser(String username, CreateAdminUserRequest req) {
        var existing = repo.getItem("ADMIN", "USER#" + username);
        if (existing == null) {
            throw new ResourceNotFoundException("User not found: " + username);
        }

        var updates = new StringBuilder("SET ");
        var exprValues = new HashMap<String, AttributeValue>();
        var parts = new ArrayList<String>();

        if (req.getDisplayName() != null) {
            parts.add("displayName = :dn");
            exprValues.put(":dn", s(req.getDisplayName()));
        }
        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            parts.add("passwordHash = :ph");
            exprValues.put(":ph", s(passwordEncoder.encode(req.getPassword())));
        }

        if (parts.isEmpty()) {
            throw new BadRequestException("Nothing to update");
        }

        updates.append(String.join(", ", parts));
        repo.updateItem("ADMIN", "USER#" + username, updates.toString(), exprValues, null);

        var updated = repo.getItem("ADMIN", "USER#" + username);
        return userToMap(updated);
    }

    public void deleteUser(String username) {
        // Prevent deleting last admin
        var allAdmins = repo.queryByPkAndSkPrefix("ADMIN", "USER#");
        if (allAdmins.size() <= 1) {
            throw new BadRequestException("Cannot delete the last admin user");
        }

        var existing = repo.getItem("ADMIN", "USER#" + username);
        if (existing == null) {
            throw new ResourceNotFoundException("User not found: " + username);
        }

        repo.deleteItem("ADMIN", "USER#" + username);
    }

    public void ensureDefaultAdmin(String defaultUsername, String defaultPassword) {
        var admins = repo.queryByPkAndSkPrefix("ADMIN", "USER#");
        if (admins.isEmpty()) {
            var req = new CreateAdminUserRequest();
            req.setUsername(defaultUsername);
            req.setPassword(defaultPassword);
            req.setDisplayName("Admin");
            createUser(req);
        }
    }

    private Map<String, Object> userToMap(Map<String, AttributeValue> item) {
        var map = new LinkedHashMap<String, Object>();
        map.put("username", str(item, "username"));
        map.put("displayName", str(item, "displayName"));
        map.put("createdAt", str(item, "createdAt"));
        map.put("lastLogin", str(item, "lastLogin"));
        // Never expose passwordHash
        return map;
    }

    private String str(Map<String, AttributeValue> item, String key) {
        var v = item.get(key);
        return v != null && v.s() != null ? v.s() : "";
    }

    private AttributeValue s(String val) {
        return AttributeValue.builder().s(val != null ? val : "").build();
    }
}
