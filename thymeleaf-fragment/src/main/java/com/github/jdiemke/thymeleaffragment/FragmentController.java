package com.github.jdiemke.thymeleaffragment;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class FragmentController {

    @GetMapping
    String getFragmentTemplate(Model model) {
        model.addAttribute("name", "Johannes");

        return "fragment";
    }

}
