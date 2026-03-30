package com.athleticaos.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import com.athleticaos.backend.repositories.PlayerRepository;
import lombok.RequiredArgsConstructor;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TestRunner implements CommandLineRunner {
    private final PlayerRepository pr;
    
    @Override
    public void run(String... args) throws Exception {
        Set<UUID> ids = pr.findAllPersonIds();
        System.out.println("----- DEBUG -----");
        System.out.println("Size: " + ids.size());
        if(!ids.isEmpty()){
            Object first = ids.iterator().next();
            System.out.println("Class: " + first.getClass().getName());
            System.out.println("Value: " + first.toString());
        }
        System.out.println("-----------------");
    }
}
