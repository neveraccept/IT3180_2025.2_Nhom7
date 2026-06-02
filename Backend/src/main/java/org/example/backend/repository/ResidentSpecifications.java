package org.example.backend.repository;

import org.example.backend.dto.request.ResidentSearchCriteria;
import org.example.backend.entity.Resident;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public final class ResidentSpecifications {

    private ResidentSpecifications() {}

    public static Specification<Resident> build(ResidentSearchCriteria c) {
        Specification<Resident> spec = Specification.where((root, query, cb) -> cb.conjunction());

        if (StringUtils.hasText(c.name())) {
            String nameStr = c.name().trim().toLowerCase();
            spec = spec.and((root, q, cb) -> {
                var fullName = cb.lower(root.get("fullName"));
                return cb.or(
                        cb.equal(fullName, nameStr),                 // Trường hợp tên chỉ có đúng 1 chữ "an"
                        cb.like(fullName, nameStr + " %"),           // Bắt đầu bằng "an " (vd: "An Nguyễn")
                        cb.like(fullName, "% " + nameStr + " %"),    // Có chữ " an " ở giữa (vd: "Nguyễn An Ninh")
                        cb.like(fullName, "% " + nameStr)            // Kết thúc bằng " an" (vd: "Nguyễn Văn An")
                );
            });
        }

        if (StringUtils.hasText(c.idCard())) {
            String like = "%" + c.idCard().trim() + "%";
            spec = spec.and((root, q, cb) -> cb.like(root.get("idCard"), like));
        }

        if (c.residencyStatus() != null) {
            spec = spec.and((root, q, cb) ->
                    cb.equal(root.get("residencyStatus"), c.residencyStatus()));
        }

        if (c.householdId() != null) {
            spec = spec.and((root, q, cb) ->
                    cb.equal(root.get("household").get("id"), c.householdId()));
        }

        if (c.status() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("status"), c.status()));
        }

        return spec;
    }
}