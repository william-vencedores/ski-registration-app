package com.vencedores.ski.controller;

import com.vencedores.ski.dto.request.SubmitRegistrationRequest;
import com.vencedores.ski.service.RegistrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
