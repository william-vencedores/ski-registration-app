package com.vencedores.ski.dto.request;

import lombok.Data;

@Data
public class CreateEventRequest {
    private String id;
    private String icon;
    private String nameEs;
    private String nameEn;
    private String metaEs;
    private String metaEn;
    private double price;
    private double processing;
    private boolean badge;
    private String badgeEs;
    private String badgeEn;
    private boolean active;
}
