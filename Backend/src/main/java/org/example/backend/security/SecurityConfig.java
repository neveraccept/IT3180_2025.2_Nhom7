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
                // 1. Tắt CSRF vì hệ thống sử dụng JWT
                .csrf(AbstractHttpConfigurer::disable)
                .csrf(csrf -> csrf.disable())

                // Bật CORS cho trình duyệt React 18 gọi API
                .cors(cors -> cors.configure(http))

                // 2. Cấu hình session thành Stateless
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 3. Cấu hình phân quyền các endpoint
                .authorizeHttpRequests(auth -> auth

                        // NHÓM PUBLIC: Các API không cần token
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/register",
                                "/api/auth/register/send-otp",
                                "/api/auth/register/verify-otp",
                                "/api/auth/forgot-password/**",
                                "/api/auth/reset-password",
                                "/api/payments/vnpay/return",
                                "/api/payments/vnpay/ipn"
                        ).permitAll()

                        // NHÓM CÁ NHÂN: Yêu cầu đăng nhập (dành cho cả ADMIN và RESIDENT tự thao tác)
                        .requestMatchers(
                                "/api/payments/my-household",
                                "/api/utility-bills/my-household",
                                "/api/payments/vnpay/create",
                                "/api/payments/vnpay/my-history",
                                "/api/auth/me/password",
                                "/api/auth/me/profile"
                        ).authenticated()

                        // NHÓM ADMIN: Yêu cầu quyền quản trị viên
                        .requestMatchers(
                                "/api/auth/createAccount",  // tạo tài khoản nội bộ
                                "/api/auth/*/approve",      // duyệt tài khoản (approve/reject)
                                "/api/apartments/**",       // Quản lý căn hộ
                                "/api/households/**",       // Quản lý hộ dân
                                "/api/residents/**",        // Quản lý nhân khẩu
                                "/api/fees/**",             // Quản lý danh mục khoản thu
                                "/api/fee-periods/**",      // Quản lý đợt thu
                                "/api/admin/**"             // Các API tra cứu / audit riêng cho admin
                        ).hasAuthority("ADMIN")

                        // Bắt buộc xác thực với mọi request khác (nếu có) mà chưa được liệt kê ở trên
                        .anyRequest().authenticated()
                )

                // 3. Đặt session management thành Stateless (Không lưu trạng thái session trên server)
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        // Bổ sung QUAN TRỌNG NHẤT: Đặt "người gác cổng" của chúng ta lên trước bộ lọc đăng nhập mặc định của Spring Security
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}