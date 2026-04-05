package com.vencedores.ski.controller;

import com.vencedores.ski.dto.request.AttendanceRequest;
import com.vencedores.ski.service.RegistrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final RegistrationService registrationService;

    public AdminController(RegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @GetMapping("/registrations")
    public ResponseEntity<?> listRegistrations(@RequestParam(required = false) String eventId) {
        var registrations = registrationService.listRegistrations(eventId);
        return ResponseEntity.ok(Map.of(
                "total", registrations.size(),
                "registrations", registrations
        ));
    }

    @GetMapping("/registrations/{id}")
    public ResponseEntity<?> getRegistration(@PathVariable String id) {
        return ResponseEntity.ok(registrationService.getRegistration(id));
    }

    @PatchMapping("/registrations/{id}/attendance")
    public ResponseEntity<?> toggleAttendance(@PathVariable String id,
                                               @RequestBody AttendanceRequest req,
                                               Authentication auth) {
        var result = registrationService.toggleAttendance(id, req.isAttended(), auth.getName());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/registrations/{id}/email")
    public ResponseEntity<?> resendEmail(@PathVariable String id) {
        return ResponseEntity.ok(registrationService.resendEmail(id));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        return ResponseEntity.ok(registrationService.getStats());
    }
}
