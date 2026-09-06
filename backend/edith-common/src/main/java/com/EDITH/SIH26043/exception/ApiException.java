package com.EDITH.SIH26043.exception;

import org.springframework.http.HttpStatus;

/**
 * Domain exception carrying an HTTP status for the API layer.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}