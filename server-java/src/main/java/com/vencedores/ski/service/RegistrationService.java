package com.vencedores.ski.service;

import com.vencedores.ski.dto.request.SubmitRegistrationRequest;
import com.vencedores.ski.exception.BadRequestException;
import com.vencedores.ski.exception.ResourceNotFoundException;
import com.vencedores.ski.repository.DynamoDbRepository;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.time.Instant;
import java.util.*;

@Service
public class RegistrationService {

    private final DynamoDbRepository repo;
    private final EventService eventService;
    private final EmailService emailService;

    public RegistrationService(DynamoDbRepository repo, EventService eventService,
                               EmailService emailService) {
        this.repo = repo;
        this.eventService = eventService;
        this.emailService = emailService;
    }

    public Map<String, Object> submitRegistration(SubmitRegistrationRequest req) {
        if (req.getFirstName() == null || req.getLastName() == null ||
                req.getEmail() == null || req.getEventId() == null ||
                req.getPaymentIntentId() == null) {
            throw new BadRequestException("Missing required fields");
        }

        // Validate event exists and decrement spots
        var event = eventService.getEvent(req.getEventId());
        eventService.decrementSpotsLeft(req.getEventId());

        String confirmationId = req.getPaymentIntentId()
                .substring(req.getPaymentIntentId().length() - 8).toUpperCase();
        var now = Instant.now().toString();

        // Build registration item
        var item = new HashMap<String, AttributeValue>();
        item.put("PK", s("EVENT#" + req.getEventId()));
        item.put("SK", s("REG#" + confirmationId));
        item.put("GSI1PK", s("REG#" + confirmationId));
        item.put("GSI1SK", s("METADATA"));
        item.put("id", s(confirmationId));
        item.put("createdAt", s(now));
        item.put("eventId", s(req.getEventId()));
        item.put("eventName", s((String) event.get("name")));
        // Personal
        item.put("firstName", s(req.getFirstName()));
        item.put("lastName", s(req.getLastName()));
        item.put("email", s(req.getEmail()));
        item.put("phone", s(req.getPhone()));
        item.put("dob", s(req.getDob()));
        item.put("city", s(req.getCity()));
        item.put("state", s(req.getState()));
        // Emergency
        item.put("emergencyName", s(req.getEmergencyName()));
        item.put("emergencyPhone", s(req.getEmergencyPhone()));
        item.put("emergencyRelation", s(req.getEmergencyRelation()));
        // Skill & dietary
        item.put("skillLevel", s(req.getSkillLevel()));
        item.put("dietary", s(req.getDietary()));
        // Medical
        item.put("medConditions", s(req.getMedConditions()));
        item.put("conditionDetails", s(req.getConditionDetails()));
        item.put("medAllergies", s(req.getMedAllergies()));
        item.put("allergyDetails", s(req.getAllergyDetails()));
        item.put("medMedications", s(req.getMedMedications()));
        item.put("medicationDetails", s(req.getMedicationDetails()));
        // Legal
        item.put("liabilityAccepted", bool(req.isLiabilityAccepted()));
        item.put("medicalAccepted", bool(req.isMedicalAccepted()));
        item.put("signature", s(req.getSignature()));
        // Payment
        item.put("paymentIntentId", s(req.getPaymentIntentId()));
        item.put("totalPaid", n(req.getTotalPaid()));
        item.put("totalOwed", n(req.getTotalOwed()));
        String paymentStatus = req.getTotalPaid() >= req.getTotalOwed() ? "paid" : "partial";
        item.put("paymentStatus", s(paymentStatus));

        repo.putItem(item);

        // Save disclosure acceptances
        if (req.getDisclosureAcceptances() != null) {
            for (var acceptance : req.getDisclosureAcceptances()) {
                var accItem = new HashMap<String, AttributeValue>();
                accItem.put("PK", s("REG#" + confirmationId));
                accItem.put("SK", s("DISCLOSURE#" + acceptance.getDisclosureId()));
                accItem.put("regId", s(confirmationId));
                accItem.put("disclosureId", s(acceptance.getDisclosureId()));
                accItem.put("acceptedVersion", n(acceptance.getVersion()));
                accItem.put("acceptedAt", s(now));
                repo.putItem(accItem);
            }
        }

        // Send email (non-blocking)
        emailService.sendConfirmationEmailAsync(
                req.getEmail(),
                req.getFirstName() + " " + req.getLastName(),
                (String) event.get("name"),
                confirmationId,
                req.getTotalPaid()
        );

        return Map.of(
                "success", true,
                "confirmationId", confirmationId,
                "message", "Registration successful"
        );
    }

    public List<Map<String, Object>> listRegistrations(String eventId) {
        List<Map<String, AttributeValue>> items;
        if (eventId != null && !eventId.isBlank()) {
            items = repo.queryByPkAndSkPrefix("EVENT#" + eventId, "REG#");
        } else {
            items = repo.scanWithFilter("begins_with(SK, :sk)",
                    Map.of(":sk", s("REG#")));
        }
        return items.stream()
                .map(this::itemToRegistrationMap)
                .toList();
    }

    public Map<String, Object> getRegistration(String regId) {
        var items = repo.queryGsi("GSI1", "GSI1PK", "REG#" + regId, "GSI1SK", null);
        if (items.isEmpty()) {
            throw new ResourceNotFoundException("Registration not found: " + regId);
        }
        return itemToRegistrationMap(items.getFirst());
    }

    public Map<String, Object> toggleAttendance(String regId, boolean attended, String adminUsername) {
        // Find the registration via GSI
        var items = repo.queryGsi("GSI1", "GSI1PK", "REG#" + regId, "GSI1SK", null);
        if (items.isEmpty()) {
            throw new ResourceNotFoundException("Registration not found: " + regId);
        }

        var item = items.getFirst();
        String pk = item.get("PK").s();
        String sk = item.get("SK").s();
        String markedAt = attended ? Instant.now().toString() : "";

        repo.updateItem(pk, sk,
                "SET attended = :a, attendanceMarkedAt = :at, attendanceMarkedBy = :by",
                Map.of(
                        ":a", bool(attended),
                        ":at", s(markedAt),
                        ":by", s(adminUsername)
                ), null);

        return Map.of(
                "id", regId,
                "attended", attended,
                "attendanceMarkedAt", markedAt
        );
    }

    public Map<String, Object> resendEmail(String regId) {
        var reg = getRegistration(regId);
        emailService.sendConfirmationEmailAsync(
                (String) reg.get("email"),
                reg.get("firstName") + " " + reg.get("lastName"),
                (String) reg.get("eventName"),
                (String) reg.get("id"),
                ((Number) reg.get("totalPaid")).doubleValue()
        );
        return Map.of("success", true, "sentTo", reg.get("email"));
    }

    public Map<String, Object> getStats() {
        var allRegs = repo.scanWithFilter("begins_with(SK, :sk)",
                Map.of(":sk", s("REG#")));

        var byEvent = new LinkedHashMap<String, Map<String, Object>>();
        double totalRevenue = 0;

        for (var item : allRegs) {
            String eventId = str(item, "eventId");
            double paid = getNum(item, "totalPaid");
            boolean attended = getBool(item, "attended");
            totalRevenue += paid;

            byEvent.computeIfAbsent(eventId, k -> {
                var m = new LinkedHashMap<String, Object>();
                m.put("eventId", eventId);
                m.put("eventName", str(item, "eventName"));
                m.put("count", 0);
                m.put("attended", 0);
                m.put("revenue", 0.0);
                return m;
            });

            var eventStats = byEvent.get(eventId);
            eventStats.put("count", (int) eventStats.get("count") + 1);
            if (attended) eventStats.put("attended", (int) eventStats.get("attended") + 1);
            eventStats.put("revenue", (double) eventStats.get("revenue") + paid);
        }

        return Map.of(
                "totalRegistrations", allRegs.size(),
                "totalRevenue", totalRevenue,
                "events", new ArrayList<>(byEvent.values())
        );
    }

    public List<Map<String, Object>> getRegistrationAcceptances(String regId) {
        var items = repo.queryByPkAndSkPrefix("REG#" + regId, "DISCLOSURE#");
        return items.stream()
                .<Map<String, Object>>map(item -> {
                    var map = new LinkedHashMap<String, Object>();
                    map.put("disclosureId", str(item, "disclosureId"));
                    map.put("acceptedVersion", (int) getNum(item, "acceptedVersion"));
                    map.put("acceptedAt", str(item, "acceptedAt"));
                    return map;
                })
                .toList();
    }

    private Map<String, Object> itemToRegistrationMap(Map<String, AttributeValue> item) {
        var map = new LinkedHashMap<String, Object>();
        map.put("id", str(item, "id"));
        map.put("createdAt", str(item, "createdAt"));
        map.put("eventId", str(item, "eventId"));
        map.put("eventName", str(item, "eventName"));
        map.put("firstName", str(item, "firstName"));
        map.put("lastName", str(item, "lastName"));
        map.put("email", str(item, "email"));
        map.put("phone", str(item, "phone"));
        map.put("dob", str(item, "dob"));
        map.put("city", str(item, "city"));
        map.put("state", str(item, "state"));
        map.put("emergencyName", str(item, "emergencyName"));
        map.put("emergencyPhone", str(item, "emergencyPhone"));
        map.put("emergencyRelation", str(item, "emergencyRelation"));
        map.put("skillLevel", str(item, "skillLevel"));
        map.put("dietary", str(item, "dietary"));
        map.put("medConditions", str(item, "medConditions"));
        map.put("conditionDetails", str(item, "conditionDetails"));
        map.put("medAllergies", str(item, "medAllergies"));
        map.put("allergyDetails", str(item, "allergyDetails"));
        map.put("medMedications", str(item, "medMedications"));
        map.put("medicationDetails", str(item, "medicationDetails"));
        map.put("liabilityAccepted", getBool(item, "liabilityAccepted"));
        map.put("medicalAccepted", getBool(item, "medicalAccepted"));
        map.put("signature", str(item, "signature"));
        map.put("totalPaid", getNum(item, "totalPaid"));
        map.put("totalOwed", getNum(item, "totalOwed"));
        map.put("paymentStatus", str(item, "paymentStatus"));
        map.put("attended", getBool(item, "attended"));
        map.put("attendanceMarkedAt", str(item, "attendanceMarkedAt"));
        map.put("attendanceMarkedBy", str(item, "attendanceMarkedBy"));
        // Intentionally omit paymentIntentId
        return map;
    }

    private String str(Map<String, AttributeValue> item, String key) {
        var v = item.get(key);
        return v != null && v.s() != null ? v.s() : "";
    }

    private double getNum(Map<String, AttributeValue> item, String key) {
        var v = item.get(key);
        return v != null && v.n() != null ? Double.parseDouble(v.n()) : 0;
    }

    private boolean getBool(Map<String, AttributeValue> item, String key) {
        var v = item.get(key);
        return v != null && v.bool() != null && v.bool();
    }

    private AttributeValue s(String val) {
        return AttributeValue.builder().s(val != null ? val : "").build();
    }

    private AttributeValue n(double val) {
        return AttributeValue.builder().n(String.valueOf(val)).build();
    }

    private AttributeValue n(int val) {
        return AttributeValue.builder().n(String.valueOf(val)).build();
    }

    private AttributeValue bool(boolean val) {
        return AttributeValue.builder().bool(val).build();
    }
}
