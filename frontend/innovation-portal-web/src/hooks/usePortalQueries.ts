import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../app/providers/AuthProvider';
import * as portal from '../services/portalService';
import type { Participant, PublishedProblem, Submission } from '../types/dto';

/** Query keys are centralized so invalidation stays consistent. */
export const portalKeys = {
  me: ['portal', 'me'] as const,
  problems: ['portal', 'problems'] as const,
  problem: (id: string) => ['portal', 'problems', id] as const,
  mySubmissions: ['portal', 'submissions'] as const,
  submission: (id: string) => ['portal', 'submissions', id] as const,
};

/** Current participant profile; `enabled` guards non-authenticated calls. */
export function useMe(enabled: boolean) {
  return useQuery<Participant>({
    queryKey: portalKeys.me,
    queryFn: portal.me,
    enabled,
    retry: false,
  });
}

export function useProblems(enabled: boolean) {
  return useQuery<PublishedProblem[]>({
    queryKey: portalKeys.problems,
    queryFn: portal.getProblems,
    enabled,
  });
}

export function useProblem(problemId: string | undefined, enabled: boolean) {
  return useQuery<PublishedProblem>({
    queryKey: portalKeys.problem(problemId ?? '_'),
    queryFn: () => portal.getProblem(problemId!),
    enabled: enabled && !!problemId,
  });
}

export function useMySubmissions(enabled: boolean) {
  return useQuery<Submission[]>({
    queryKey: portalKeys.mySubmissions,
    queryFn: portal.getMySubmissions,
    enabled,
  });
}

export function useSubmission(submissionId: string | undefined, enabled: boolean) {
  return useQuery<Submission>({
    queryKey: portalKeys.submission(submissionId ?? '_'),
    queryFn: () => portal.getSubmission(submissionId!),
    enabled: enabled && !!submissionId,
  });
}

export function useAuthedQueryEnabled(): boolean {
  const { authed } = useAuth();
  return authed;
}
