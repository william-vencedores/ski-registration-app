package com.vencedores.ski.controller;

import com.vencedores.ski.dto.request.SendCodeRequest;
import com.vencedores.ski.dto.request.VerifyCodeRequest;
import com.vencedores.ski.service.VerificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/returning")
public class ReturningUserController {

    private final VerificationService verificationService;

    public ReturningUserController(VerificationService verificationService) {
        this.verificationService = verificationService;
    }

    @PostMapping("/send-code")
    public ResponseEntity<Map<String, Object>> sendCode(@RequestBody SendCodeRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        verificationService.sendVerificationCode(request.getEmail());
        // Always return success to prevent email enumeration
        return ResponseEntity.ok(Map.of("success", true, "message", "If this email has a registration, a code was sent."));
    }

    @PostMapping("/verify-code")
    public ResponseEntity<Map<String, Object>> verifyCode(@RequestBody VerifyCodeRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank() ||
                request.getCode() == null || request.getCode().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and code are required"));
        }
        var result = verificationService.verifyCode(request.getEmail(), request.getCode());
        if ((boolean) result.get("verified")) {
            return ResponseEntity.ok(result);
        }
        return ResponseEntity.status(401).body(result);
    }
}
