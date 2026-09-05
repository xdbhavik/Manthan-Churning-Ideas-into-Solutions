package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.service.AuthService;
import com.EDITH.SIH26043.web.dto.OtpRequest;
import com.EDITH.SIH26043.web.dto.OtpResponse;
import com.EDITH.SIH26043.web.dto.RefreshRequest;
import com.EDITH.SIH26043.web.dto.VerifyOtpRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public OtpResponse register(@Valid @RequestBody OtpRequest req) {
        return authService.register(req);
    }

    @PostMapping("/login")
    public OtpResponse login(@Valid @RequestBody OtpRequest req) {
        return authService.login(req);
    }

    @PostMapping("/verify-otp")
    public VerifyOtpRequest.VerifyOtpResponse verifyOtp(@Valid @RequestBody VerifyOtpRequest req) {
        return authService.verifyOtp(req);
    }

    @PostMapping("/refresh")
    public RefreshRequest.RefreshResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return authService.refresh(req);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody RefreshRequest req) {
        authService.logout(req);
    }
}