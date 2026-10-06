CREATE TABLE team_invitation (
    invitation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES team (team_id) ON DELETE CASCADE,
    inviter_participant_id UUID NOT NULL REFERENCES participant (participant_id),
    invitee_participant_id UUID NOT NULL REFERENCES participant (participant_id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    CONSTRAINT uk_team_invitation_team_invitee UNIQUE (team_id, invitee_participant_id),
    CONSTRAINT ck_team_invitation_not_self CHECK (inviter_participant_id <> invitee_participant_id)
);

CREATE INDEX idx_team_invitation_inbox
    ON team_invitation (invitee_participant_id, status, created_at DESC);
CREATE INDEX idx_team_invitation_outbox
    ON team_invitation (inviter_participant_id, created_at DESC);
