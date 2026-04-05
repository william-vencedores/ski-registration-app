package com.vencedores.ski.dto.request;

import lombok.Data;

@Data
public class CreateAdminUserRequest {
    private String username;
    private String password;
    private String displayName;
}
