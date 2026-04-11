package com.vencedores.ski.service;

import com.vencedores.ski.repository.DynamoDbRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class VerificationService {

    private static final Logger log = LoggerFactory.getLogger(VerificationService.class);
    private static final int CODE_EXPIRY_SECONDS = 600; // 10 minutes
    private static final int MAX_ATTEMPTS = 5;
    private static final int MAX_SENDS = 3;

    private final DynamoDbRepository repo;
    private final EmailService emailService;

    public VerificationService(DynamoDbRepository repo, EmailService emailService) {
        this.repo = repo;
        this.emailService = emailService;
    }

    public void sendVerificationCode(String email) {
        String normalizedEmail = email.toLowerCase().trim();
        String pk = "VERIFY#" + normalizedEmail;
        String sk = "CODE";

        // Check rate limit
        var existing = repo.getItem(pk, sk);
        if (existing != null) {
            int sendCount = getNum(existing, "sendCount");
            long createdEpoch = Long.parseLong(str(existing, "createdEpoch"));
            long elapsed = Instant.now().getEpochSecond() - createdEpoch;
            if (elapsed < CODE_EXPIRY_SECONDS && sendCount >= MAX_SENDS) {
                log.info("[Verify] Rate limit reached for {}", normalizedEmail);
                return; // silently return to prevent enumeration
            }
        }

        String code = String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
        long now = Instant.now().getEpochSecond();

        var item = new HashMap<String, AttributeValue>();
        item.put("PK", s(pk));
        item.put("SK", s(sk));
        item.put("code", s(code));
        item.put("attempts", n(0));
        item.put("sendCount", n(existing != null ? getNum(existing, "sendCount") + 1 : 1));
        item.put("createdEpoch", s(String.valueOf(now)));
        item.put("expiresAt", n(now + CODE_EXPIRY_SECONDS));
        repo.putItem(item);

        emailService.sendVerificationCodeAsync(normalizedEmail, code);
        log.info("[Verify] Code sent to {}", normalizedEmail);
    }

    public Map<String, Object> verifyCode(String email, String code) {
        String normalizedEmail = email.toLowerCase().trim();
        String pk = "VERIFY#" + normalizedEmail;
        String sk = "CODE";

        var item = repo.getItem(pk, sk);
        if (item == null) {
            return Map.of("verified", false, "error", "invalid_code");
        }

        // Check expiry
        long expiresAt = Long.parseLong(item.get("expiresAt").n());
        if (Instant.now().getEpochSecond() > expiresAt) {
            repo.deleteItem(pk, sk);
            return Map.of("verified", false, "error", "code_expired");
        }

        // Check attempts
        int attempts = getNum(item, "attempts");
        if (attempts >= MAX_ATTEMPTS) {
            repo.deleteItem(pk, sk);
            return Map.of("verified", false, "error", "max_attempts");
        }

        String storedCode = str(item, "code");
        if (!storedCode.equals(code.trim())) {
            // Increment attempts
            repo.updateItem(pk, sk,
                    "SET attempts = attempts + :one",
                    Map.of(":one", AttributeValue.builder().n("1").build()),
                    null);
            return Map.of("verified", false, "error", "invalid_code");
        }

        // Success — delete verification item and return profile
        repo.deleteItem(pk, sk);

        var profile = getLatestProfile(normalizedEmail);
        if (profile == null) {
            return Map.of("verified", true, "profile", Map.of());
        }

        return Map.of("verified", true, "profile", profile);
    }

    private Map<String, Object> getLatestProfile(String email) {
        var items = repo.queryGsi("GSI2", "GSI2PK", "EMAIL#" + email, "GSI2SK", null);
        if (items.isEmpty()) {
            return null;
        }

        // Get the most recent registration (last item, sorted by GSI2SK = createdAt)
        var latest = items.getLast();

        var profile = new LinkedHashMap<String, Object>();
        profile.put("firstName", str(latest, "firstName"));
        profile.put("lastName", str(latest, "lastName"));
        profile.put("email", str(latest, "email"));
        profile.put("phone", str(latest, "phone"));
        profile.put("dob", str(latest, "dob"));
        profile.put("city", str(latest, "city"));
        profile.put("state", str(latest, "state"));
        profile.put("emergencyName", str(latest, "emergencyName"));
        profile.put("emergencyPhone", str(latest, "emergencyPhone"));
        profile.put("emergencyRelation", str(latest, "emergencyRelation"));
        profile.put("skillLevel", str(latest, "skillLevel"));
        profile.put("dietary", str(latest, "dietary"));
        profile.put("medConditions", str(latest, "medConditions"));
        profile.put("conditionDetails", str(latest, "conditionDetails"));
        profile.put("medAllergies", str(latest, "medAllergies"));
        profile.put("allergyDetails", str(latest, "allergyDetails"));
        profile.put("medMedications", str(latest, "medMedications"));
        profile.put("medicationDetails", str(latest, "medicationDetails"));
        return profile;
    }

    private String str(Map<String, AttributeValue> item, String key) {
        var v = item.get(key);
        return v != null && v.s() != null ? v.s() : "";
    }

    private int getNum(Map<String, AttributeValue> item, String key) {
        var v = item.get(key);
        return v != null && v.n() != null ? (int) Double.parseDouble(v.n()) : 0;
    }

    private AttributeValue s(String val) {
        return AttributeValue.builder().s(val != null ? val : "").build();
    }

    private AttributeValue n(long val) {
        return AttributeValue.builder().n(String.valueOf(val)).build();
    }
}
