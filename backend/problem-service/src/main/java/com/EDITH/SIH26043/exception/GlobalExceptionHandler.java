package com.EDITH.SIH26043.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Maps domain and validation failures to RFC 7807 problem details.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ProblemDetail handleApi(ApiException ex) {
        return toProblem(ex.getStatus(), ex.getMessage());
    }

    /** @PreAuthorize denials must surface as 403, not 500. */
    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        return toProblem(HttpStatus.FORBIDDEN, "Insufficient role for this operation");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(fe -> errors.putIfAbsent(fe.getField(), fe.getDefaultMessage()));
        ProblemDetail pd = toProblem(HttpStatus.BAD_REQUEST, "Validation failed");
        pd.setProperty("fieldErrors", errors);
        return pd;
    }

    /**
     * Unparsable body: unknown enum constant, malformed UUID, broken JSON.
     * That is caller error, so 400 — the catch-all would report it as 500.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail handleUnreadableBody(HttpMessageNotReadableException ex) {
        return toProblem(HttpStatus.BAD_REQUEST, "Malformed or invalid request body");
    }

    /** Path or query value that cannot be converted, e.g. a non-UUID id. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return toProblem(HttpStatus.BAD_REQUEST,
                "Invalid value for parameter '" + ex.getName() + "'");
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneric(Exception ex) {
        if (ex instanceof ErrorResponse er) {
            HttpStatus status = HttpStatus.resolve(er.getStatusCode().value());
            if (status != null && status != HttpStatus.INTERNAL_SERVER_ERROR) {
                return toProblem(status, er.getBody().getDetail() != null
                        ? er.getBody().getDetail()
                        : status.getReasonPhrase());
            }
        }
        log.error("Unhandled exception reached the API boundary", ex);
        return toProblem(HttpStatus.INTERNAL_SERVER_ERROR,
                "Unexpected error: " + ex.getClass().getSimpleName());
    }

    private ProblemDetail toProblem(HttpStatus status, String detail) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setType(URI.create("about:blank"));
        return pd;
    }
}
