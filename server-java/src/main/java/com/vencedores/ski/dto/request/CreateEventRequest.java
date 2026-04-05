package com.vencedores.ski.dto.request;

import lombok.Data;

@Data
public class CreateEventRequest {
    private String id;
    private String name;
    private String date;
    private String location;
    private Double lat;
    private Double lng;
    private double price;
    private boolean badge;
    private String badgeText;
    private boolean active;
    private Integer capacity;
    private Double deposit;
}
