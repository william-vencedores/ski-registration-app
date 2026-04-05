package com.vencedores.ski.controller;

import com.vencedores.ski.dto.request.AttachDisclosureRequest;
import com.vencedores.ski.dto.request.CreateEventRequest;
import com.vencedores.ski.service.DisclosureService;
import com.vencedores.ski.service.EventService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class EventController {

    private final EventService eventService;
    private final DisclosureService disclosureService;

    public EventController(EventService eventService, DisclosureService disclosureService) {
        this.eventService = eventService;
        this.disclosureService = disclosureService;
    }

    // ── Public ──────────────────────────────────────────────────

    @GetMapping("/api/events")
    public ResponseEntity<?> listEvents(@RequestParam(defaultValue = "true") boolean activeOnly) {
        return ResponseEntity.ok(eventService.listEvents(activeOnly));
    }

    @GetMapping("/api/events/{id}")
    public ResponseEntity<?> getEvent(@PathVariable String id) {
        return ResponseEntity.ok(eventService.getEvent(id));
    }

    @GetMapping("/api/events/{eventId}/disclosures")
    public ResponseEntity<?> getEventDisclosures(@PathVariable String eventId) {
        return ResponseEntity.ok(disclosureService.getEventDisclosures(eventId));
    }

    // ── Admin ───────────────────────────────────────────────────

    @PostMapping("/api/admin/events")
    public ResponseEntity<?> createEvent(@RequestBody CreateEventRequest req) {
        return ResponseEntity.ok(eventService.createEvent(req));
    }

    @PutMapping("/api/admin/events/{id}")
    public ResponseEntity<?> updateEvent(@PathVariable String id, @RequestBody CreateEventRequest req) {
        return ResponseEntity.ok(eventService.updateEvent(id, req));
    }

    @DeleteMapping("/api/admin/events/{id}")
    public ResponseEntity<?> deleteEvent(@PathVariable String id) {
        eventService.deleteEvent(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // ── Event-Disclosure linking (Admin) ────────────────────────

    @PostMapping("/api/admin/events/{eventId}/disclosures")
    public ResponseEntity<?> attachDisclosure(@PathVariable String eventId,
                                               @RequestBody AttachDisclosureRequest req) {
        disclosureService.attachToEvent(eventId, req.getDisclosureId(), req.getDisplayOrder());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @DeleteMapping("/api/admin/events/{eventId}/disclosures/{disclosureId}")
    public ResponseEntity<?> detachDisclosure(@PathVariable String eventId,
                                               @PathVariable String disclosureId) {
        disclosureService.detachFromEvent(eventId, disclosureId);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
