package com.vencedores.ski.controller;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.net.Webhook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/webhook")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    @Value("${stripe.webhook-secret:}")
    private String webhookSecret;

    @PostMapping
    public ResponseEntity<?> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("[Webhook] STRIPE_WEBHOOK_SECRET not set — skipping verification");
            return ResponseEntity.ok(Map.of("received", true));
        }

        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            log.error("[Webhook] Signature verification failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Webhook Error: " + e.getMessage());
        }

        switch (event.getType()) {
            case "payment_intent.succeeded" ->
                    log.info("[Webhook] Payment succeeded: {}", event.getId());
            case "payment_intent.payment_failed" ->
                    log.error("[Webhook] Payment failed: {}", event.getId());
            case "charge.refunded" ->
                    log.info("[Webhook] Charge refunded: {}", event.getId());
            default ->
                    log.info("[Webhook] Unhandled event: {}", event.getType());
        }

        return ResponseEntity.ok(Map.of("received", true));
    }
}
