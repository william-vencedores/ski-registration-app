package com.vencedores.ski.service;

import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import com.vencedores.ski.exception.BadRequestException;
import com.vencedores.ski.repository.DynamoDbRepository;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class PaymentService {

    private final EventService eventService;
    private final DynamoDbRepository repo;

    public PaymentService(EventService eventService, DynamoDbRepository repo) {
        this.eventService = eventService;
        this.repo = repo;
    }

    public Map<String, Object> createBalancePaymentIntent(String registrationId, String email, String name)
            throws StripeException {
        // Look up the registration to get remaining balance
        var items = repo.queryGsi("GSI1", "GSI1PK", "REG#" + registrationId, "GSI1SK", null);
        if (items.isEmpty()) {
            throw new BadRequestException("Registration not found");
        }
        var reg = items.getFirst();
        double totalPaid = Double.parseDouble(reg.get("totalPaid") != null ? reg.get("totalPaid").n() : "0");
        double totalOwed = Double.parseDouble(reg.get("totalOwed") != null ? reg.get("totalOwed").n() : "0");
        double remaining = totalOwed - totalPaid;

        if (remaining <= 0) {
            throw new BadRequestException("No balance remaining");
        }

        // Processing fee on the remaining amount
        double processing = Math.round((remaining * 0.029 + 0.30) * 100.0) / 100.0;
        double chargeAmount = remaining + processing;
        long amountCents = Math.round(chargeAmount * 100);

        String eventName = reg.get("eventName") != null ? reg.get("eventName").s() : "Event";

        var params = PaymentIntentCreateParams.builder()
                .setAmount(amountCents)
                .setCurrency("usd")
                .setReceiptEmail(email)
                .putMetadata("registrationId", registrationId)
                .putMetadata("balancePayment", "true")
                .putMetadata("email", email)
                .setDescription("Vencedores Ski — " + eventName + " (Remaining Balance)")
                .build();

        PaymentIntent paymentIntent = PaymentIntent.create(params);
        return Map.of(
                "clientSecret", paymentIntent.getClientSecret(),
                "chargeAmount", chargeAmount,
                "remaining", remaining,
                "processing", processing
        );
    }

    public Map<String, Object> createPaymentIntent(String eventId, String email, String name,
                                                    boolean partialPayment) throws StripeException {
        var event = eventService.getEvent(eventId);
        if (event == null) {
            throw new BadRequestException("Invalid event ID");
        }

        double price = ((Number) event.get("price")).doubleValue();
        double deposit = ((Number) event.get("deposit")).doubleValue();

        // Determine the base amount (deposit or full price)
        double baseAmount = (partialPayment && deposit > 0) ? deposit : price;

        // Stripe fee: 2.9% + $0.30
        double processing = Math.round((baseAmount * 0.029 + 0.30) * 100.0) / 100.0;
        double chargeAmount = baseAmount + processing;
        long amountCents = Math.round(chargeAmount * 100);

        // Calculate full total owed (price + full processing)
        double fullProcessing = Math.round((price * 0.029 + 0.30) * 100.0) / 100.0;
        double totalOwed = price + fullProcessing;

        var params = PaymentIntentCreateParams.builder()
                .setAmount(amountCents)
                .setCurrency("usd")
                .setReceiptEmail(email)
                .putMetadata("eventId", eventId)
                .putMetadata("name", name)
                .putMetadata("email", email)
                .putMetadata("partialPayment", String.valueOf(partialPayment))
                .setDescription("Vencedores Ski — " + event.get("name")
                        + (partialPayment && deposit > 0 ? " (Deposit)" : ""))
                .build();

        PaymentIntent paymentIntent = PaymentIntent.create(params);
        return Map.of(
                "clientSecret", paymentIntent.getClientSecret(),
                "chargeAmount", chargeAmount,
                "totalOwed", totalOwed
        );
    }
}
