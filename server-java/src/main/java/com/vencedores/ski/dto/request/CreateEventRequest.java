package com.vencedores.ski.dto.request;

import lombok.Data;

@Data
public class CreateEventRequest {
    private String id;
    private String name;
    private String date;
    private String location;
    private double price;
    private boolean badge;
    private String badgeText;
    private boolean active;
}
