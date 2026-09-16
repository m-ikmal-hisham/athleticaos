package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.services.PlaceholderEmailBackfillService;
import com.athleticaos.backend.utils.EmailUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlaceholderEmailBackfillServiceImpl implements PlaceholderEmailBackfillService {

    private static final int DEFAULT_BATCH_SIZE = 200;

    private final PersonRepository personRepository;

    @Override
    @Transactional
    public Summary run(boolean dryRun, int batchSize) {
        int size = batchSize > 0 ? batchSize : DEFAULT_BATCH_SIZE;
        long candidates = personRepository.countPersonsNeedingPlaceholderEmail();
        long filled = 0;
        int page = 0;
        // Live runs remove rows from the candidate set, so page 0 is re-read each time.
        // Dry runs change nothing, so they walk the pages instead.
        long maxIterations = (candidates / size) + 2;

        for (long iteration = 0; iteration < maxIterations; iteration++) {
            Page<Person> batch = personRepository.findPersonsNeedingPlaceholderEmail(
                    PageRequest.of(dryRun ? page : 0, size));
            if (batch.isEmpty()) {
                break;
            }
            List<Person> updated = new ArrayList<>();
            for (Person person : batch.getContent()) {
                String placeholder = EmailUtil.placeholderFor(person.getRegistrationNo());
                if (placeholder == null) {
                    continue;
                }
                if (!dryRun) {
                    person.setEmail(placeholder);
                    updated.add(person);
                }
                filled++;
            }
            if (!updated.isEmpty()) {
                personRepository.saveAll(updated);
                personRepository.flush();
            }
            page++;
            if (dryRun && !batch.hasNext()) {
                break;
            }
        }

        log.info("Placeholder email backfill finished: dryRun={}, candidates={}, filled={}",
                dryRun, candidates, filled);
        return new Summary(dryRun, candidates, filled);
    }
}
