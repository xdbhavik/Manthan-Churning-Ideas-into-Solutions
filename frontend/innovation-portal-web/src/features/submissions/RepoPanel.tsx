import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../app/providers/ToastProvider';
import { getErrorMessage } from '../../services/apiClient';
import * as portal from '../../services/portalService';
import type { Submission, SubmissionLink } from '../../types/dto';

const COMMIT_RE = /^[A-Za-z0-9._-]{7,64}$/;

export function RepoPanel({
  submission,
  editable,
}: {
  submission: Submission;
  editable: boolean;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(submission.title ?? '');
  const [summary, setSummary] = useState(submission.summary ?? '');
  const [githubUrl, setGithubUrl] = useState(submission.githubUrl ?? '');
  const [branch, setBranch] = useState(submission.branch ?? '');
  const [commitSha, setCommitSha] = useState(submission.commitSha ?? '');
  const [links, setLinks] = useState<SubmissionLink[]>(submission.links ?? []);

  const update = useMutation({
    mutationFn: () =>
      portal.updateSubmissionMeta(submission.submissionId, {
        title: title.trim() || undefined,
        summary: summary.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
        branch: branch.trim() || undefined,
        commitSha: commitSha.trim() || undefined,
        links,
      }),
    onSuccess: () => {
      toast.notify('Submission updated', 'success');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['portal', 'submissions', submission.submissionId] });
      queryClient.invalidateQueries({ queryKey: ['portal', 'submissions'] });
    },
    onError: (e) => toast.notify(getErrorMessage(e), 'error'),
  });

  const commitValid = commitSha === '' || COMMIT_RE.test(commitSha);

  const save = () => {
    if (!commitValid) {
      toast.notify('Commit SHA looks invalid (7–64 of [A-Za-z0-9._-])', 'error');
      return;
    }
    update.mutate();
  };

  if (editing && editable) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3">
          <div>
            <label className="block text-xs font-semibold text-body mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-hairline bg-card text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-body mb-1">Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-hairline bg-card text-sm"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-body mb-1">GitHub URL</label>
            <input
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              className="w-full px-3 py-2 rounded-lg border border-hairline bg-card text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-body mb-1">Branch</label>
            <input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full px-3 py-2 rounded-lg border border-hairline bg-card text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-body mb-1">
              Pinned commit SHA <span className="text-muted font-normal">(required to submit)</span>
            </label>
            <input
              value={commitSha}
              onChange={(e) => setCommitSha(e.target.value)}
              placeholder="e.g. 4f1a9c2"
              className="w-full px-3 py-2 rounded-lg border border-hairline bg-card text-sm font-code"
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-body mb-1">Additional links</div>
          <div className="space-y-2">
            {links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={l.label}
                  onChange={(e) => {
                    const next = [...links];
                    next[i] = { ...l, label: e.target.value };
                    setLinks(next);
                  }}
                  placeholder="Label"
                  className="w-40 px-3 py-2 rounded-lg border border-hairline bg-card text-sm"
                />
                <input
                  value={l.url}
                  onChange={(e) => {
                    const next = [...links];
                    next[i] = { ...l, url: e.target.value };
                    setLinks(next);
                  }}
                  placeholder="https://…"
                  className="flex-1 px-3 py-2 rounded-lg border border-hairline bg-card text-sm"
                />
                <button
                  onClick={() => setLinks(links.filter((_, idx) => idx !== i))}
                  className="text-returned-text text-sm font-semibold"
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => setLinks([...links, { label: '', url: '' }])}
              className="text-navy-700 hover:text-navy-900 text-sm font-semibold"
              type="button"
            >
              + Add link
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={save} disabled={update.isPending} className="btn-sheen rounded-lg bg-navy-900 text-white text-sm font-bold px-4 py-2 disabled:opacity-60">
            {update.isPending ? 'Saving…' : 'Save changes'}
          </button>
          <button onClick={() => setEditing(false)} className="rounded-lg border border-hairline text-sm font-semibold px-4 py-2">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-headline font-semibold text-navy-900 text-sm">Repository & metadata</h3>
        {editable && (
          <button onClick={() => setEditing(true)} className="text-navy-700 hover:text-navy-900 text-xs font-semibold">
            Edit
          </button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-muted">Title</div>
          <div className="text-body font-semibold">{submission.title || '—'}</div>
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs text-muted">Summary</div>
          <div className="text-body">{submission.summary || '—'}</div>
        </div>
        <div>
          <div className="text-xs text-muted">GitHub</div>
          <div className="font-code text-body break-all">{submission.githubUrl || '—'}</div>
        </div>
        <div>
          <div className="text-xs text-muted">Branch</div>
          <div className="font-code text-body">{submission.branch || '—'}</div>
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs text-muted">Pinned commit</div>
          <div className="font-code text-body">{submission.commitSha || '—'}</div>
        </div>
        {(submission.links ?? []).length > 0 && (
          <div className="sm:col-span-2">
            <div className="text-xs text-muted">Links</div>
            <div className="space-y-1">
              {submission.links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noreferrer" className="text-submitted-text hover:underline block">
                  {l.label || l.url}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
