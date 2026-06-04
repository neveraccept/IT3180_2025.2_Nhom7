package org.example.backend.repository.projection;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Projection cho truy vấn các dòng đóng góp (F10.2).
 */
public interface DonationContributionProjection {
    String getHouseholdCode();
    String getHeadName();
    String getApartmentCode();
    BigDecimal getAmount();
    LocalDate getPaidDate();
}
