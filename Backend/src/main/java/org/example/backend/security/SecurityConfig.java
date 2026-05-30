package org.example.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter; // Bổ sung: Cần import lớp này

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // Bổ sung: Khai báo và tiêm (Inject) JwtAuthenticationFilter
    private final JwtFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. Tắt CSRF vì hệ thống sử dụng JWT (Stateless)
                .csrf(csrf -> csrf.disable())

                // (Tuỳ chọn) Tắt CORS nếu bạn bị lỗi gọi từ trình duyệt React
                // .cors(cors -> cors.disable())

                // 2. Cấu hình phân quyền các endpoint
                .authorizeHttpRequests(auth -> auth
                        // Cho phép tất cả mọi người truy cập vào các API thuộc nhóm auth (Login, Register, OTP...)
                        .requestMatchers("/api/auth/**").permitAll()

                        // Các endpoint liên quan đến VNPAY callback cũng phải là PUBLIC
                        .requestMatchers("/api/payments/vnpay/return", "/api/payments/vnpay/ipn").permitAll()

                        // Bổ sung: Chỉ định rõ API duyệt tài khoản yêu cầu quyền ADMIN
                        .requestMatchers("/api/users/*/approve").hasRole("ADMIN")

                        // Tất cả các request khác (quản lý user, hộ dân, khoản thu...) đều bắt buộc phải đăng nhập
                        .anyRequest().authenticated()
                )

                // 3. Đặt session management thành Stateless (Không lưu trạng thái session trên server)
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        // Bổ sung QUAN TRỌNG NHẤT: Đặt "người gác cổng" của chúng ta lên trước bộ lọc đăng nhập mặc định của Spring Security
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}