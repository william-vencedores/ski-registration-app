package com.vencedores.ski.dto.request;

import lombok.Data;

@Data
public class CreateDisclosureRequest {
    private String titleEs;
    private String titleEn;
    private String contentEs;
    private String contentEn;
    private boolean required;
}
