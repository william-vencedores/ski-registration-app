package com.vencedores.ski.controller;

import com.vencedores.ski.dto.request.CreateAdminUserRequest;
import com.vencedores.ski.service.AdminUserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(adminUserService.listUsers());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateAdminUserRequest req) {
        return ResponseEntity.ok(adminUserService.createUser(req));
    }

    @PutMapping("/{username}")
    public ResponseEntity<?> update(@PathVariable String username, @RequestBody CreateAdminUserRequest req) {
        return ResponseEntity.ok(adminUserService.updateUser(username, req));
    }

    @DeleteMapping("/{username}")
    public ResponseEntity<?> delete(@PathVariable String username) {
        adminUserService.deleteUser(username);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
