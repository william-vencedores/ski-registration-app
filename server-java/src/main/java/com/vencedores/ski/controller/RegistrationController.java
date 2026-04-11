package com.vencedores.ski.controller;

import com.vencedores.ski.dto.request.SubmitRegistrationRequest;
import com.vencedores.ski.service.RegistrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/registration")
public class RegistrationController {

    private final RegistrationService registrationService;

    public RegistrationController(RegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @PostMapping("/submit")
    public ResponseEntity<?> submit(@RequestBody SubmitRegistrationRequest req) {
        var result = registrationService.submitRegistration(req);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/pay-balance")
    public ResponseEntity<?> payBalance(@RequestBody Map<String, Object> req) {
        String regId = (String) req.get("registrationId");
        double amountPaid = ((Number) req.get("amountPaid")).doubleValue();
        var result = registrationService.payBalance(regId, amountPaid);
        return ResponseEntity.ok(result);
    }
}
