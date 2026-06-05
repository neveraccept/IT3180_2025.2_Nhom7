package org.example.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    // Bổ sung: Khai báo và tiêm (Inject) JwtAuthenticationFilter
    private final JwtFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtFilter jwtAuthenticationFilter) {

        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. Tắt CSRF vì hệ thống sử dụng JWT (stateless, không dùng cookie session)
                .csrf(AbstractHttpConfigurer::disable)

                // Bật CORS cho trình duyệt React 18 gọi API.
                // Sử dụng CorsConfigurationSource bean (xem config/CorsConfig) thay vì cors.configure(http).
                .cors(org.springframework.security.config.Customizer.withDefaults())

                // 2. Cấu hình session thành Stateless
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 3. Cấu hình phân quyền các endpoint
                .authorizeHttpRequests(auth -> auth

                        // NHÓM PUBLIC: Các API không cần token
                        .requestMatchers(
                                "/api/auth/**",
                                "/api/payments/vnpay/return",
                                "/api/payments/vnpay/ipn"
                        ).permitAll()

                        // NHÓM CÁ NHÂN: Yêu cầu đăng nhập (dành cho cả ADMIN và RESIDENT tự thao tác)
                        .requestMatchers(
                                "/api/me/**",
                                "/api/payments/my-household",
                                "/api/utility-bills/my-household",
                                "/api/payments/vnpay/create",
                                "/api/payments/vnpay/my-history"
                        ).authenticated()

                        // NHÓM ADMIN: Yêu cầu quyền quản trị viên
                        .requestMatchers(
                                "/api/users/**",            // Quản lý tài khoản
                                "/api/apartments/**",       // Quản lý căn hộ
                                "/api/households/**",       // Quản lý hộ dân
                                "/api/residents/**",        // Quản lý nhân khẩu
                                "/api/fees/**",             // Quản lý danh mục khoản thu
                                "/api/fee-periods/**",      // Quản lý đợt thu
                                "/api/admin/**"             // Các API tra cứu / audit riêng cho admin
                        ).hasRole("ADMIN")

                        // Bắt buộc xác thực với mọi request khác (nếu có) mà chưa được liệt kê ở trên
                        .anyRequest().authenticated()
                );

        // Bổ sung QUAN TRỌNG NHẤT: Đặt "người gác cổng" của chúng ta lên trước bộ lọc đăng nhập mặc định của Spring Security
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}