package com.github.jdiemke.thymeleaffragment;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.Arrays;
import java.util.List;

@Controller
public class FragmentController {

    @GetMapping
    String getFragmentTemplate(Model model) {
        List<Event> events = List.of(
                new Event("Event 1", 100),
                new Event("Event 2", 300, "/openair2.png"),
                new Event("Event 3", 120),
                new Event("Event 4", 200, "/openair2.png")
        );
        model.addAttribute("events", events);
        model.addAttribute("name", "Johannes");
        model.addAttribute("team", Arrays.asList(
                "Swampert",
                "Zoroark",
                "Torterra"
        ));

        return "fragment";
    }

}

class Event {
    private final String title;
    private final int price;
    private final String imageUrl;
    private static String fallbackImageUrl = "/openair.png";

    Event(String title, int price) {
        this(title, price, fallbackImageUrl);
    }

    Event(String title, int price, String imageUrl) {
        this.title = title;
        this.price = price;
        this.imageUrl = imageUrl;
    }

    public String getTitle() {
        return title;
    }

    public int getPrice() {
        return price;
    }

    public String getImageUrl() {
        return imageUrl;
    }
}
