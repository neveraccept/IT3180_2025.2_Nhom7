package org.example.backend.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.example.backend.entity.Role;
import org.example.backend.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtFilter.class);

    private final JwtUtil tokenProvider;

    public JwtFilter(JwtUtil tokenProvider) {
        this.tokenProvider = tokenProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            // 1. Lấy token từ request
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                // 2.  Trích xuất toàn bộ thông tin từ token
                Claims claims = tokenProvider.getClaimsFromJWT(jwt);
                String username = claims.getSubject();
                // JJWT có thể parse số thành Integer hoặc Long, dùng Number.class để an toàn ép kiểu
                Number userIdClaim = claims.get("userId", Number.class);
                String roleName = claims.get("role", String.class);

                // Token thiếu claim bắt buộc → coi như không hợp lệ, bỏ qua xác thực
                if (userIdClaim == null || roleName == null) {
                    log.warn("JWT thiếu claim userId/role, bỏ qua thiết lập xác thực");
                    filterChain.doFilter(request, response);
                    return;
                }
                Long userId = userIdClaim.longValue();

                // 2. Tạo đối tượng User "ảo" chỉ chứa các thông tin định danh
                Role role = new Role(roleName);
                User user = new User();
                user.setId(userId);
                user.setUsername(username);
                user.setRole(role);
                user.setActive(true); // Token hợp lệ đồng nghĩa với tài khoản đang active

                // 3. Đóng gói vào CustomUserDetails
                CustomUserDetails userDetails = new CustomUserDetails(user);

                // 4. Set vào SecurityContext
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);

                if (log.isDebugEnabled()) {
                    log.debug("Xác thực thành công cho user '{}' với quyền {}",
                            username, authentication.getAuthorities());
                }
            }
        } catch (Exception ex) {
            // Không lộ chi tiết token/stacktrace; chỉ ghi log ở mức debug để phục vụ chẩn đoán
            log.debug("Không thể thiết lập xác thực người dùng trong Security Context: {}", ex.getMessage());
        }

        // Chuyển request đi tiếp
        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        // Kiểm tra xem header Authorization có chứa thông tin jwt không
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7); // Cắt bỏ chữ "Bearer " (7 ký tự) để lấy chuỗi JWT
        }
        return null;
    }
}