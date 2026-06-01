package org.example.backend.service;

import org.example.backend.dto.request.UpdateProfileRequest;
import org.example.backend.dto.UserProfileDTO;
import org.example.backend.entity.User;
import org.example.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

    private final UserRepository userRepo;

    public ProfileService(UserRepository userRepo) {
        this.userRepo = userRepo;
    }

    public UserProfileDTO getUserProfile(Long userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + userId));

        return UserProfileDTO.fromEntity(user);
    }

    @Transactional
    public UserProfileDTO updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + userId));

        user.setUsername(request.getUsername());
        user.setPhone(request.getPhone());

        user = userRepo.save(user);

        return UserProfileDTO.fromEntity(user);
    }
}