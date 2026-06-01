package org.example.backend.service;

import org.springframework.stereotype.Service;

@Service
public class AuditLogServiceStubImpl implements AuditLogService {

    @Override
    public void log(String action, String entityType, Long entityId, String description) {

        System.out.printf("AUDIT LOG - Action: %s, EntityType: %s, EntityId: %d, Description: %s%n",
                action, entityType, entityId, description);
    }
}