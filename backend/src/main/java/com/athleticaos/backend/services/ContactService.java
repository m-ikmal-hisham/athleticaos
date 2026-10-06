package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.contact.ContactRequest;

public interface ContactService {

    /**
     * Processes a contact form submission:
     * - Drops request silently without storing or emailing if honeypot is non-empty.
     * - Otherwise persists to database.
     * - If email is enabled and recipient is configured, dispatches an email notification.
     */
    void processContactMessage(ContactRequest request);
}
