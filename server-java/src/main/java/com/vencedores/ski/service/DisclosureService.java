package com.vencedores.ski.service;

import com.vencedores.ski.dto.request.CreateDisclosureRequest;
import com.vencedores.ski.exception.BadRequestException;
import com.vencedores.ski.exception.ResourceNotFoundException;
import com.vencedores.ski.repository.DynamoDbRepository;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.time.Instant;
import java.util.*;

@Service
public class DisclosureService {

    private final DynamoDbRepository repo;

    public DisclosureService(DynamoDbRepository repo) {
        this.repo = repo;
    }

    public Map<String, Object> createDisclosure(CreateDisclosureRequest req) {
        String id = UUID.randomUUID().toString().substring(0, 8);
        var now = Instant.now().toString();
        int version = 1;

        // Write version record
        var versionItem = new HashMap<String, AttributeValue>();
        versionItem.put("PK", s("DISCLOSURE#" + id));
        versionItem.put("SK", s("VERSION#" + version));
        versionItem.put("id", s(id));
        versionItem.put("version", n(version));
        versionItem.put("titleEs", s(req.getTitleEs()));
        versionItem.put("titleEn", s(req.getTitleEn()));
        versionItem.put("contentEs", s(req.getContentEs()));
        versionItem.put("contentEn", s(req.getContentEn()));
        versionItem.put("required", bool(req.isRequired()));
        versionItem.put("createdAt", s(now));
        repo.putItem(versionItem);

        // Write LATEST pointer
        var latestItem = new HashMap<String, AttributeValue>();
        latestItem.put("PK", s("DISCLOSURE#" + id));
        latestItem.put("SK", s("LATEST"));
        latestItem.put("id", s(id));
        latestItem.put("latestVersion", n(version));
        latestItem.put("titleEs", s(req.getTitleEs()));
        latestItem.put("titleEn", s(req.getTitleEn()));
        latestItem.put("required", bool(req.isRequired()));
        latestItem.put("createdAt", s(now));
        repo.putItem(latestItem);

        return itemToDisclosureMap(versionItem);
    }

    public Map<String, Object> updateDisclosure(String id, CreateDisclosureRequest req) {
        var latest = repo.getItem("DISCLOSURE#" + id, "LATEST");
        if (latest == null) {
            throw new ResourceNotFoundException("Disclosure not found: " + id);
        }

        int newVersion = (int) getNum(latest, "latestVersion") + 1;
        var now = Instant.now().toString();

        // Write new version
        var versionItem = new HashMap<String, AttributeValue>();
        versionItem.put("PK", s("DISCLOSURE#" + id));
        versionItem.put("SK", s("VERSION#" + newVersion));
        versionItem.put("id", s(id));
        versionItem.put("version", n(newVersion));
        versionItem.put("titleEs", s(req.getTitleEs()));
        versionItem.put("titleEn", s(req.getTitleEn()));
        versionItem.put("contentEs", s(req.getContentEs()));
        versionItem.put("contentEn", s(req.getContentEn()));
        versionItem.put("required", bool(req.isRequired()));
        versionItem.put("createdAt", s(now));
        repo.putItem(versionItem);

        // Update LATEST pointer
        repo.updateItem("DISCLOSURE#" + id, "LATEST",
                "SET latestVersion = :v, titleEs = :tEs, titleEn = :tEn, #req = :req",
                Map.of(
                        ":v", n(newVersion),
                        ":tEs", s(req.getTitleEs()),
                        ":tEn", s(req.getTitleEn()),
                        ":req", bool(req.isRequired())
                ),
                Map.of("#req", "required"));

        return itemToDisclosureMap(versionItem);
    }

    public Map<String, Object> getDisclosure(String id) {
        var latest = repo.getItem("DISCLOSURE#" + id, "LATEST");
        if (latest == null) {
            throw new ResourceNotFoundException("Disclosure not found: " + id);
        }
        int version = (int) getNum(latest, "latestVersion");
        var versionItem = repo.getItem("DISCLOSURE#" + id, "VERSION#" + version);
        return itemToDisclosureMap(versionItem);
    }

    public Map<String, Object> getDisclosureVersion(String id, int version) {
        var item = repo.getItem("DISCLOSURE#" + id, "VERSION#" + version);
        if (item == null) {
            throw new ResourceNotFoundException("Disclosure version not found: " + id + " v" + version);
        }
        return itemToDisclosureMap(item);
    }

    public List<Map<String, Object>> listDisclosures() {
        var items = repo.scanWithFilter("begins_with(SK, :sk)",
                Map.of(":sk", s("LATEST")));
        return items.stream()
                .filter(item -> item.get("PK").s().startsWith("DISCLOSURE#"))
                .<Map<String, Object>>map(item -> {
                    var map = new LinkedHashMap<String, Object>();
                    map.put("id", str(item, "id"));
                    map.put("latestVersion", (int) getNum(item, "latestVersion"));
                    map.put("titleEs", str(item, "titleEs"));
                    map.put("titleEn", str(item, "titleEn"));
                    map.put("required", getBool(item, "required"));
                    map.put("createdAt", str(item, "createdAt"));
                    return map;
                })
                .toList();
    }

    public void deleteDisclosure(String id) {
        var latest = repo.getItem("DISCLOSURE#" + id, "LATEST");
        if (latest == null) {
            throw new ResourceNotFoundException("Disclosure not found: " + id);
        }
        // Delete all versions and LATEST
        var allItems = repo.queryByPk("DISCLOSURE#" + id);
        for (var item : allItems) {
            repo.deleteItem(item.get("PK").s(), item.get("SK").s());
        }
    }

    // Event-disclosure linking
    public void attachToEvent(String eventId, String disclosureId, int displayOrder) {
        var disclosure = repo.getItem("DISCLOSURE#" + disclosureId, "LATEST");
        if (disclosure == null) {
            throw new ResourceNotFoundException("Disclosure not found: " + disclosureId);
        }

        var item = new HashMap<String, AttributeValue>();
        item.put("PK", s("EVENT#" + eventId));
        item.put("SK", s("DISCLOSURE#" + disclosureId));
        item.put("eventId", s(eventId));
        item.put("disclosureId", s(disclosureId));
        item.put("displayOrder", n(displayOrder));
        item.put("addedAt", s(Instant.now().toString()));
        repo.putItem(item);
    }

    public void detachFromEvent(String eventId, String disclosureId) {
        repo.deleteItem("EVENT#" + eventId, "DISCLOSURE#" + disclosureId);
    }

    public List<Map<String, Object>> getEventDisclosures(String eventId) {
        var links = repo.queryByPkAndSkPrefix("EVENT#" + eventId, "DISCLOSURE#");

        return links.stream()
                .sorted(Comparator.comparingDouble(item -> getNum(item, "displayOrder")))
                .map(link -> {
                    String disclosureId = str(link, "disclosureId");
                    try {
                        var disclosure = getDisclosure(disclosureId);
                        disclosure.put("displayOrder", (int) getNum(link, "displayOrder"));
                        return disclosure;
                    } catch (ResourceNotFoundException e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();
    }

    private Map<String, Object> itemToDisclosureMap(Map<String, AttributeValue> item) {
        var map = new LinkedHashMap<String, Object>();
        map.put("id", str(item, "id"));
        map.put("version", (int) getNum(item, "version"));
        map.put("titleEs", str(item, "titleEs"));
        map.put("titleEn", str(item, "titleEn"));
        map.put("contentEs", str(item, "contentEs"));
        map.put("contentEn", str(item, "contentEn"));
        map.put("required", getBool(item, "required"));
        map.put("createdAt", str(item, "createdAt"));
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
