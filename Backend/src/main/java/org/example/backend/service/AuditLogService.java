package org.example.backend.service;

public interface AuditLogService {

    /**
     * @param action     mã hành động (vd: "APARTMENT_UPDATE", "HOUSEHOLD_ASSIGN",
     *                   "HOUSEHOLD_MOVE_OUT", "HOUSEHOLD_UPDATE").
     * @param entityType "APARTMENT" hoặc "HOUSEHOLD".
     * @param entityId   id của bản ghi bị tác động.
     * @param description mô tả thao tác để đối soát về sau.
     */
    void log(String action, String entityType, Long entityId, String description);
}


