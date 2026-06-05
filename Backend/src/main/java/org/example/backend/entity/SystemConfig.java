package org.example.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Cấu hình đơn giá gốc dùng chung cho toàn hệ thống (bảng `system_configs`).
 * Mỗi bản ghi là một cặp key -> giá trị, ví dụ:
 *  - ELECTRICITY_UNIT_PRICE: đơn giá 1 số điện
 *  - WATER_UNIT_PRICE: đơn giá 1 khối nước
 *  - INTERNET_PRICE: giá 1 gói internet/tháng
 * Hoá đơn điện/nước/internet đọc đơn giá ở đây để tự tính số tiền.
 */
@Entity
@Table(name = "system_configs",
        uniqueConstraints = @UniqueConstraint(name = "uk_system_config_key", columnNames = "config_key"))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SystemConfig {

    /** Đơn giá 1 số điện (đ/kWh). */
    public static final String ELECTRICITY_UNIT_PRICE = "ELECTRICITY_UNIT_PRICE";
    /** Đơn giá 1 khối nước (đ/m³). */
    public static final String WATER_UNIT_PRICE = "WATER_UNIT_PRICE";
    /** Giá 1 gói internet/tháng (đ). */
    public static final String INTERNET_PRICE = "INTERNET_PRICE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "config_key", nullable = false, length = 50)
    private String configKey;

    @Column(name = "config_value", nullable = false, precision = 15, scale = 2)
    private BigDecimal configValue;

    @Column(name = "description", length = 255)
    private String description;
}
