package com.vencedores.ski.controller;

import com.vencedores.ski.dto.request.CreateDisclosureRequest;
import com.vencedores.ski.service.DisclosureService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/disclosures")
public class DisclosureController {

    private final DisclosureService disclosureService;

    public DisclosureController(DisclosureService disclosureService) {
        this.disclosureService = disclosureService;
    }

    @GetMapping
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(disclosureService.listDisclosures());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable String id) {
        return ResponseEntity.ok(disclosureService.getDisclosure(id));
    }

    @GetMapping("/{id}/versions/{version}")
    public ResponseEntity<?> getVersion(@PathVariable String id, @PathVariable int version) {
        return ResponseEntity.ok(disclosureService.getDisclosureVersion(id, version));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateDisclosureRequest req) {
        return ResponseEntity.ok(disclosureService.createDisclosure(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody CreateDisclosureRequest req) {
        return ResponseEntity.ok(disclosureService.updateDisclosure(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        disclosureService.deleteDisclosure(id);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
