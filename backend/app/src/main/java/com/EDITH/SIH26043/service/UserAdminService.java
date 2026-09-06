package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Admin-only user management (doc 05 sec 9 roles).
 */
@Service
public class UserAdminService {

    private final UserRepository userRepository;

    public UserAdminService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public User get(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    @Transactional
    public User changeRole(UUID id, UserRole role) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        u.setRole(role);
        return userRepository.save(u);
    }
}