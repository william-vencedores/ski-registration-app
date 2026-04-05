package com.vencedores.ski.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardController {

    @GetMapping(value = {"/", "/{path:^(?!api|assets)[^\\.]*}/**"})
    public String forward() {
        return "forward:/index.html";
    }
}
