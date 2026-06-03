package org.example.backend.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.example.backend.entity.Role;
import org.example.backend.entity.User;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtFilter extends OncePerRequestFilter {

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
                Long userId = claims.get("userId", Number.class).longValue();
                String roleName = claims.get("role", String.class);

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

                System.out.println("Xác thực thành công. Quyền trong Context: " + authentication.getAuthorities());
            }
        } catch (Exception ex) {
            System.out.println("Không thể thiết lập xác thực người dùng trong Security Context: " + ex.getMessage());
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