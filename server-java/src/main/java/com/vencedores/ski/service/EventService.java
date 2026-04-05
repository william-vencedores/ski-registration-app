package com.vencedores.ski.service;

import com.vencedores.ski.dto.request.CreateEventRequest;
import com.vencedores.ski.exception.BadRequestException;
import com.vencedores.ski.exception.ResourceNotFoundException;
import com.vencedores.ski.repository.DynamoDbRepository;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.time.Instant;
import java.util.*;

@Service
public class EventService {

    private final DynamoDbRepository repo;

    public EventService(DynamoDbRepository repo) {
        this.repo = repo;
    }

    public Map<String, Object> createEvent(CreateEventRequest req) {
        if (req.getId() == null || req.getId().isBlank()) {
            throw new BadRequestException("Event ID is required");
        }

        var existing = repo.getItem("EVENT#" + req.getId(), "METADATA");
        if (existing != null) {
            throw new BadRequestException("Event with ID '" + req.getId() + "' already exists");
        }

        var now = Instant.now().toString();
        var item = new HashMap<String, AttributeValue>();
        item.put("PK", s("EVENT#" + req.getId()));
        item.put("SK", s("METADATA"));
        item.put("GSI1PK", s("ENTITY#EVENT"));
        item.put("GSI1SK", s("EVENT#" + req.getId()));
        item.put("id", s(req.getId()));
        item.put("icon", s(req.getIcon() != null ? req.getIcon() : ""));
        item.put("nameEs", s(req.getNameEs()));
        item.put("nameEn", s(req.getNameEn()));
        item.put("metaEs", s(req.getMetaEs() != null ? req.getMetaEs() : ""));
        item.put("metaEn", s(req.getMetaEn() != null ? req.getMetaEn() : ""));
        item.put("price", n(req.getPrice()));
        item.put("processing", n(req.getProcessing()));
        item.put("badge", bool(req.isBadge()));
        item.put("badgeEs", s(req.getBadgeEs() != null ? req.getBadgeEs() : ""));
        item.put("badgeEn", s(req.getBadgeEn() != null ? req.getBadgeEn() : ""));
        item.put("active", bool(req.isActive()));
        item.put("createdAt", s(now));
        item.put("updatedAt", s(now));

        repo.putItem(item);
        return itemToEventMap(item);
    }

    public Map<String, Object> getEvent(String eventId) {
        var item = repo.getItem("EVENT#" + eventId, "METADATA");
        if (item == null) {
            throw new ResourceNotFoundException("Event not found: " + eventId);
        }
        return itemToEventMap(item);
    }

    public List<Map<String, Object>> listEvents(boolean activeOnly) {
        var items = repo.queryGsi("GSI1", "GSI1PK", "ENTITY#EVENT", "GSI1SK", "EVENT#");
        return items.stream()
                .filter(item -> !activeOnly || getBool(item, "active"))
                .map(this::itemToEventMap)
                .toList();
    }

    public Map<String, Object> updateEvent(String eventId, CreateEventRequest req) {
        var existing = repo.getItem("EVENT#" + eventId, "METADATA");
        if (existing == null) {
            throw new ResourceNotFoundException("Event not found: " + eventId);
        }

        var now = Instant.now().toString();
        var item = new HashMap<>(existing);
        if (req.getIcon() != null) item.put("icon", s(req.getIcon()));
        if (req.getNameEs() != null) item.put("nameEs", s(req.getNameEs()));
        if (req.getNameEn() != null) item.put("nameEn", s(req.getNameEn()));
        if (req.getMetaEs() != null) item.put("metaEs", s(req.getMetaEs()));
        if (req.getMetaEn() != null) item.put("metaEn", s(req.getMetaEn()));
        item.put("price", n(req.getPrice()));
        item.put("processing", n(req.getProcessing()));
        item.put("badge", bool(req.isBadge()));
        if (req.getBadgeEs() != null) item.put("badgeEs", s(req.getBadgeEs()));
        if (req.getBadgeEn() != null) item.put("badgeEn", s(req.getBadgeEn()));
        item.put("active", bool(req.isActive()));
        item.put("updatedAt", s(now));

        repo.putItem(item);
        return itemToEventMap(item);
    }

    public void deleteEvent(String eventId) {
        var existing = repo.getItem("EVENT#" + eventId, "METADATA");
        if (existing == null) {
            throw new ResourceNotFoundException("Event not found: " + eventId);
        }
        repo.deleteItem("EVENT#" + eventId, "METADATA");
    }

    private Map<String, Object> itemToEventMap(Map<String, AttributeValue> item) {
        var map = new LinkedHashMap<String, Object>();
        map.put("id", str(item, "id"));
        map.put("icon", str(item, "icon"));
        map.put("nameEs", str(item, "nameEs"));
        map.put("nameEn", str(item, "nameEn"));
        map.put("metaEs", str(item, "metaEs"));
        map.put("metaEn", str(item, "metaEn"));
        map.put("price", getNum(item, "price"));
        map.put("processing", getNum(item, "processing"));
        map.put("badge", getBool(item, "badge"));
        map.put("badgeEs", str(item, "badgeEs"));
        map.put("badgeEn", str(item, "badgeEn"));
        map.put("active", getBool(item, "active"));
        map.put("createdAt", str(item, "createdAt"));
        map.put("updatedAt", str(item, "updatedAt"));
        return map;
    }

    private String str(Map<String, AttributeValue> item, String key) {
        var v = item.get(key);
        return v != null ? v.s() : "";
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

    private AttributeValue bool(boolean val) {
        return AttributeValue.builder().bool(val).build();
    }
}
