package com.vencedores.ski.service;

import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import com.vencedores.ski.exception.BadRequestException;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class PaymentService {

    private final EventService eventService;

    public PaymentService(EventService eventService) {
        this.eventService = eventService;
    }

    public String createPaymentIntent(String eventId, String email, String name) throws StripeException {
        var event = eventService.getEvent(eventId);
        if (event == null) {
            throw new BadRequestException("Invalid event ID");
        }

        double price = ((Number) event.get("price")).doubleValue();
        // Stripe fee: 2.9% + $0.30
        double processing = Math.round((price * 0.029 + 0.30) * 100.0) / 100.0;
        long amount = Math.round((price + processing) * 100);

        var params = PaymentIntentCreateParams.builder()
                .setAmount(amount)
                .setCurrency("usd")
                .setReceiptEmail(email)
                .putMetadata("eventId", eventId)
                .putMetadata("name", name)
                .putMetadata("email", email)
                .setDescription("Vencedores Ski — " + event.get("name"))
                .build();

        PaymentIntent paymentIntent = PaymentIntent.create(params);
        return paymentIntent.getClientSecret();
    }
}
