package org.example.backend.security;

import org.example.backend.entity.User;
import org.example.backend.exception.NotFoundException;
import org.example.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Lấy User đang đăng nhập từ SecurityContext (đã được JWT filter set sẵn).
 * Dùng chung cho mọi Service cần biết "ai đang gọi API".
 */
@Component
public class CurrentUserService {

    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new NotFoundException("USER_NOT_FOUND", "Không xác định được người dùng hiện tại");
        }
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new NotFoundException(
                        "USER_NOT_FOUND", "Không tìm thấy người dùng: " + auth.getName()));
    }

    /** Kiểm tra user hiện tại có phải Admin không (dựa trên authority ROLE_ADMIN). */
    public boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }
}