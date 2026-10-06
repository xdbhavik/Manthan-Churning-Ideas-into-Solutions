package com.EDITH.SIH26043.web.dto;

import java.util.UUID;

/** Accepted student solution shown only to the submitter who filed its problem statement. */
public record SourceAcceptedSolutionView(
        UUID problemId,
        String problemTitle,
        String problemDescription,
        String expectedOutcome,
        SubmissionView submission
) { }
