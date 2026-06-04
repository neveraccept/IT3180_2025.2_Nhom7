package org.example.backend.repository.projection;

import java.math.BigDecimal;

/**
 * Projection cho truy vấn gộp theo hộ gia đình (F10.3).
 */
public interface HouseholdPaymentProjection {
    Long getHouseholdId();
    String getHouseholdCode();
    String getHeadName();
    String getApartmentCode();
    BigDecimal getTotalDue();
    BigDecimal getTotalPaid();
    Long getUnpaidCount();
    Long getPaymentCount();
}
