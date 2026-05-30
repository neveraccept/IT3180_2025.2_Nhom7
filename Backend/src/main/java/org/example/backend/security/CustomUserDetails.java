package org.example.backend.security;

import org.example.backend.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

/**
 * Lớp ánh xạ Entity User của hệ thống sang chuẩn UserDetails của Spring Security.
 */
public class CustomUserDetails implements UserDetails {

    private final User user;

    public CustomUserDetails(User user) {
        this.user = user;
    }

    // Cung cấp getter để lấy entity User gốc khi cần thiết
    public User getUser() {
        return user;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Lấy tên Role từ Entity (ví dụ: "ADMIN" hoặc "RESIDENT")
        // Spring Security thường khuyến nghị dùng tiền tố "ROLE_" để phân quyền dễ dàng hơn
        return Collections.singleton(new SimpleGrantedAuthority("ROLE_" + user.getRole().getName()));
    }

    @Override
    public String getPassword() {
        // Ánh xạ trường passwordHash từ Entity User
        return user.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return user.getUsername();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true; // Không sử dụng logic hết hạn tài khoản trong dự án này
    }

    @Override
    public boolean isAccountNonLocked() {
        return true; // Logic khoá tài khoản được quản lý chung bởi cờ active
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true; // Không sử dụng logic hết hạn mật khẩu
    }

    @Override
    public boolean isEnabled() {
        // Ánh xạ cờ active = TRUE (tài khoản đã duyệt/không bị khóa)
        return user.isActive();
    }
}