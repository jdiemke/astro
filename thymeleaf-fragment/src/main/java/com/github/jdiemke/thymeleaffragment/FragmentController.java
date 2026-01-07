package com.github.jdiemke.thymeleaffragment;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.Arrays;

@Controller
public class FragmentController {

    @GetMapping
    String getFragmentTemplate(Model model) {
        model.addAttribute("name", "Johannes");
        model.addAttribute("team", Arrays.asList(
                "Swampert",
                "Zoroark",
                "Torterra"
        ));

        return "fragment";
    }

}
