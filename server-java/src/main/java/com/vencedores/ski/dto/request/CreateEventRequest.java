package com.vencedores.ski.dto.request;

import lombok.Data;

@Data
public class CreateEventRequest {
    private String id;
    private String name;
    private String meta;
    private double price;
    private double processing;
    private boolean badge;
    private String badgeText;
    private boolean active;
}
