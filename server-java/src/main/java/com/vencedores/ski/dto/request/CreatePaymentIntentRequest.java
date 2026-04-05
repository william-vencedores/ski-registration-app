package com.vencedores.ski.dto.request;

import lombok.Data;

@Data
public class CreatePaymentIntentRequest {
    private String eventId;
    private String email;
    private String name;
    private boolean partialPayment;
}
