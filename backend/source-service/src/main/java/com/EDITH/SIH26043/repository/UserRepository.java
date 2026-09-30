package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByPhone(String phone);

    boolean existsByPhone(String phone);

    Page<User> findAllByOrderByCreatedAtDesc(Pageable pageable);
}