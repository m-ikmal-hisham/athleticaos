export interface AuditLogEntry {
    id: string;
    timestamp: string;
    actorUserId: string;
    actorEmail: string;
    actorRole: string;
    organisationId: string;
    organisationName: string;
    actionType: string;
    entityType: string;
    entityId: string;
    entitySummary: string;
    detailsJson: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface AuditLogResponse {
    content: AuditLogEntry[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}

export interface AuditLogFilter {
    page?: number;
    size?: number;
    orgId?: string;
    userId?: string;
    entityType?: string;
    entityId?: string;
}
