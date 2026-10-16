package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.OrganisationPerson;
import com.athleticaos.backend.entities.Person;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@ActiveProfiles("test")
public class OrganisationPersonRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private OrganisationPersonRepository organisationPersonRepository;

    private Organisation org1;
    private Organisation org2;
    private Organisation org3;

    private Person person1;
    private Person person2;
    private Person person3;
    private Person person4;

    @BeforeEach
    void setUp() {
        org1 = Organisation.builder().name("Org One").slug("org-one").orgType("CLUB").build();
        org2 = Organisation.builder().name("Org Two").slug("org-two").orgType("CLUB").build();
        org3 = Organisation.builder().name("Org Three").slug("org-three").orgType("CLUB").build();

        entityManager.persist(org1);
        entityManager.persist(org2);
        entityManager.persist(org3);

        // person1: linked to org1 AND org2 (multi-org)
        person1 = Person.builder()
                .firstName("Alice")
                .lastName("Zeta")
                .dob(LocalDate.of(1995, 1, 1))
                .gender("FEMALE")
                .nationality("MALAYSIAN")
                .recordVerificationStatus("UNVERIFIED")
                .email("alice@example.com")
                .build();
        entityManager.persist(person1);

        // person2: linked only to org1, missing email (null)
        person2 = Person.builder()
                .firstName("Bob")
                .lastName("Alpha")
                .dob(LocalDate.of(1994, 2, 2))
                .gender("MALE")
                .nationality("MALAYSIAN")
                .recordVerificationStatus("UNVERIFIED")
                .email(null)
                .build();
        entityManager.persist(person2);

        // person3: linked only to org2, missing email (placeholder)
        person3 = Person.builder()
                .firstName("Charlie")
                .lastName("Beta")
                .dob(LocalDate.of(1993, 3, 3))
                .gender("MALE")
                .nationality("MALAYSIAN")
                .recordVerificationStatus("UNVERIFIED")
                .email("user123@placeholder.invalid")
                .build();
        entityManager.persist(person3);

        // person4: linked only to org3 (out of scope)
        person4 = Person.builder()
                .firstName("David")
                .lastName("Delta")
                .dob(LocalDate.of(1992, 4, 4))
                .gender("MALE")
                .nationality("MALAYSIAN")
                .recordVerificationStatus("UNVERIFIED")
                .email("david@example.com")
                .build();
        entityManager.persist(person4);

        // Flush so IDs exist
        entityManager.flush();

        // Update registration_no via native query since insertable=false on Person entity
        entityManager.getEntityManager().createNativeQuery("UPDATE persons SET registration_no = 'AOS-000001' WHERE id = :id")
                .setParameter("id", person1.getId()).executeUpdate();
        entityManager.getEntityManager().createNativeQuery("UPDATE persons SET registration_no = 'AOS-000002' WHERE id = :id")
                .setParameter("id", person2.getId()).executeUpdate();
        entityManager.getEntityManager().createNativeQuery("UPDATE persons SET registration_no = 'AOS-000003' WHERE id = :id")
                .setParameter("id", person3.getId()).executeUpdate();
        entityManager.getEntityManager().createNativeQuery("UPDATE persons SET registration_no = 'AOS-000004' WHERE id = :id")
                .setParameter("id", person4.getId()).executeUpdate();

        // OrganisationPerson links
        // person1 linked to BOTH org1 and org2
        entityManager.persist(OrganisationPerson.builder().organisation(org1).person(person1).build());
        entityManager.persist(OrganisationPerson.builder().organisation(org2).person(person1).build());

        // person2 linked to org1
        entityManager.persist(OrganisationPerson.builder().organisation(org1).person(person2).build());

        // person3 linked to org2
        entityManager.persist(OrganisationPerson.builder().organisation(org2).person(person3).build());

        // person4 linked to org3
        entityManager.persist(OrganisationPerson.builder().organisation(org3).person(person4).build());

        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("findUniquePersonsByOrganisationIds - sorted by firstName and counts distinct persons once")
    void findUniquePersonsByOrganisationIds_sortedByFirstName() {
        List<UUID> orgIds = List.of(org1.getId(), org2.getId());
        PageRequest pageRequest = PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "firstName"));

        Page<Person> page = organisationPersonRepository.findUniquePersonsByOrganisationIds(orgIds, pageRequest);

        // Even though person1 is linked to two orgs, totalElements must be 3 (Alice, Bob, Charlie)
        assertThat(page.getTotalElements()).isEqualTo(3);
        assertThat(page.getContent()).hasSize(3);

        // Sorted by firstName ASC: Alice, Bob, Charlie
        assertThat(page.getContent().get(0).getFirstName()).isEqualTo("Alice");
        assertThat(page.getContent().get(1).getFirstName()).isEqualTo("Bob");
        assertThat(page.getContent().get(2).getFirstName()).isEqualTo("Charlie");

        // David (from org3) must not be included
        assertThat(page.getContent()).extracting(Person::getFirstName).doesNotContain("David");
    }

    @Test
    @DisplayName("findUniquePersonsByOrganisationIds - sorted by lastName")
    void findUniquePersonsByOrganisationIds_sortedByLastName() {
        List<UUID> orgIds = List.of(org1.getId(), org2.getId());
        PageRequest pageRequest = PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "lastName"));

        Page<Person> page = organisationPersonRepository.findUniquePersonsByOrganisationIds(orgIds, pageRequest);

        assertThat(page.getTotalElements()).isEqualTo(3);
        // Sorted by lastName ASC: Alpha (Bob), Beta (Charlie), Zeta (Alice)
        assertThat(page.getContent().get(0).getLastName()).isEqualTo("Alpha");
        assertThat(page.getContent().get(1).getLastName()).isEqualTo("Beta");
        assertThat(page.getContent().get(2).getLastName()).isEqualTo("Zeta");
    }

    @Test
    @DisplayName("searchPersonsByOrganisationIds - matches by name, email, registrationNo and counts multi-org once")
    void searchPersonsByOrganisationIds_matchesFilters() {
        List<UUID> orgIds = List.of(org1.getId(), org2.getId());

        // Search by firstName for multi-org person
        Page<Person> alicePage = organisationPersonRepository.searchPersonsByOrganisationIds(
                orgIds, "Alice", PageRequest.of(0, 10, Sort.by("firstName")));
        assertThat(alicePage.getTotalElements()).isEqualTo(1);
        assertThat(alicePage.getContent().get(0).getFirstName()).isEqualTo("Alice");

        // Search by email
        Page<Person> emailPage = organisationPersonRepository.searchPersonsByOrganisationIds(
                orgIds, "alice@example.com", PageRequest.of(0, 10, Sort.by("firstName")));
        assertThat(emailPage.getTotalElements()).isEqualTo(1);
        assertThat(emailPage.getContent().get(0).getFirstName()).isEqualTo("Alice");

        // Search by registration number prefix
        Page<Person> regPage = organisationPersonRepository.searchPersonsByOrganisationIds(
                orgIds, "AOS-000002", PageRequest.of(0, 10, Sort.by("firstName")));
        assertThat(regPage.getTotalElements()).isEqualTo(1);
        assertThat(regPage.getContent().get(0).getFirstName()).isEqualTo("Bob");

        // Search out-of-scope person (David in org3)
        Page<Person> davidPage = organisationPersonRepository.searchPersonsByOrganisationIds(
                orgIds, "David", PageRequest.of(0, 10, Sort.by("firstName")));
        assertThat(davidPage.getTotalElements()).isEqualTo(0);
        assertThat(davidPage.getContent()).isEmpty();
    }

    @Test
    @DisplayName("findUniquePersonsWithMissingEmailByOrganisationIds - returns null and placeholder emails only")
    void findUniquePersonsWithMissingEmailByOrganisationIds_returnsMissingOnly() {
        List<UUID> orgIds = List.of(org1.getId(), org2.getId());
        PageRequest pageRequest = PageRequest.of(0, 10, Sort.by("firstName"));

        Page<Person> page = organisationPersonRepository.findUniquePersonsWithMissingEmailByOrganisationIds(orgIds, pageRequest);

        // Bob (null email) and Charlie (placeholder email)
        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent()).extracting(Person::getFirstName).containsExactly("Bob", "Charlie");
        // Alice has real email -> excluded
        assertThat(page.getContent()).extracting(Person::getFirstName).doesNotContain("Alice");
    }

    @Test
    @DisplayName("searchPersonsWithMissingEmailByOrganisationIds - combines search with missing email")
    void searchPersonsWithMissingEmailByOrganisationIds_combinesSearchAndMissingEmail() {
        List<UUID> orgIds = List.of(org1.getId(), org2.getId());

        Page<Person> charliePage = organisationPersonRepository.searchPersonsWithMissingEmailByOrganisationIds(
                orgIds, "Charlie", PageRequest.of(0, 10, Sort.by("firstName")));
        assertThat(charliePage.getTotalElements()).isEqualTo(1);
        assertThat(charliePage.getContent().get(0).getFirstName()).isEqualTo("Charlie");

        // Alice matches search but has a real email, so she must NOT appear
        Page<Person> alicePage = organisationPersonRepository.searchPersonsWithMissingEmailByOrganisationIds(
                orgIds, "Alice", PageRequest.of(0, 10, Sort.by("firstName")));
        assertThat(alicePage.getTotalElements()).isEqualTo(0);
        assertThat(alicePage.getContent()).isEmpty();
    }
}
