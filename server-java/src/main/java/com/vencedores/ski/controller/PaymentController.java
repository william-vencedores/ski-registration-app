package com.vencedores.ski.controller;

import com.stripe.exception.StripeException;
import com.vencedores.ski.dto.request.CreatePaymentIntentRequest;
import com.vencedores.ski.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/create-intent")
    public ResponseEntity<?> createIntent(@RequestBody CreatePaymentIntentRequest req) {
        try {
            var result = paymentService.createPaymentIntent(
                    req.getEventId(), req.getEmail(), req.getName(), req.isPartialPayment());
            return ResponseEntity.ok(result);
        } catch (StripeException e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/create-balance-intent")
    public ResponseEntity<?> createBalanceIntent(@RequestBody Map<String, String> req) {
        try {
            var result = paymentService.createBalancePaymentIntent(
                    req.get("registrationId"), req.get("email"), req.get("name"));
            return ResponseEntity.ok(result);
        } catch (StripeException e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
