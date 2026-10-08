package com.athleticaos.backend.entities;

import com.athleticaos.backend.enums.ContactSubject;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "contact_messages", indexes = {
    @Index(name = "idx_contact_messages_created_at", columnList = "created_at")
})
public class ContactMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", length = 120, nullable = false)
    private String name;

    @Column(name = "email", length = 254, nullable = false)
    private String email;

    @Column(name = "organisation", length = 160)
    private String organisation;

    @Enumerated(EnumType.STRING)
    @Column(name = "subject", length = 40, nullable = false)
    private ContactSubject subject;

    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "status", length = 20, nullable = false)
    @Builder.Default
    private String status = "NEW";

    @Column(name = "mail_sent", nullable = false)
    @Builder.Default
    private Boolean mailSent = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
