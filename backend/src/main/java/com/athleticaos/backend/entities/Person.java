package com.athleticaos.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "persons")
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(nullable = false)
    private String gender; // ENUM as String

    @Column(nullable = false)
    private LocalDate dob;

    @Column(name = "ic_or_passport", nullable = false)
    private String icOrPassport; // Encrypted

    @Column(name = "identification_type")
    private String identificationType; // IC, PASSPORT, OTHER

    @Column(name = "identification_value")
    private String identificationValue;

    @Column(nullable = false)
    private String nationality;

    private String email;

    private String phone;

    private String address;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
