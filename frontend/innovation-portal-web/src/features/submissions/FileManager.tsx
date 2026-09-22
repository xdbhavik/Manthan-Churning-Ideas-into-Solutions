import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../app/providers/ToastProvider';
import { getErrorMessage } from '../../services/apiClient';
import * as portal from '../../services/portalService';
import type { FileItem } from '../../types/dto';

export function FileManager({
  submissionId,
  files,
  editable,
}: {
  submissionId: string;
  files: FileItem[];
  editable: boolean;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['portal', 'submissions', submissionId] });
    queryClient.invalidateQueries({ queryKey: ['portal', 'submissions'] });
  };

  const upload = useMutation({
    mutationFn: (file: File) => portal.uploadFile(submissionId, file),
    onSuccess: () => {
      toast.notify('File uploaded', 'success');
      invalidate();
    },
    onError: (e) => toast.notify(getErrorMessage(e), 'error'),
  });

  const del = useMutation({
    mutationFn: (fileId: string) => portal.deleteFile(submissionId, fileId),
    onSuccess: () => {
      toast.notify('File removed', 'success');
      invalidate();
    },
    onError: (e) => toast.notify(getErrorMessage(e), 'error'),
  });

  const download = (f: FileItem) => {
    portal
      .downloadFile(f.fileId, f.originalName)
      .catch((e) => toast.notify(getErrorMessage(e), 'error'));
  };

  const onPick = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    upload.mutate(list[0]);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      {editable && (
        <div>
          <input
            ref={inputRef}
            type="file"
            onChange={(e) => onPick(e.target.files)}
            className="hidden"
            id={`file-input-${submissionId}`}
          />
          <label
            htmlFor={`file-input-${submissionId}`}
            className="inline-flex items-center gap-1 rounded-lg bg-navy-900 text-white text-sm font-bold px-4 py-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span> Upload file
          </label>
        </div>
      )}

      {files.length === 0 ? (
        <div className="text-sm text-muted">No files attached yet.</div>
      ) : (
        <ul className="divide-y divide-hairline rounded-xl border border-hairline bg-card">
          {files.map((f) => (
            <li key={f.fileId} className="flex items-center gap-3 px-4 py-3">
              <span className="material-symbols-outlined text-navy-900 text-[20px]">description</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-body truncate">{f.originalName}</div>
                <div className="text-xs text-muted">
                  {Math.max(0.1, f.sizeBytes / 1024).toFixed(1)} KB · {(f.contentType ?? 'file')}
                </div>
              </div>
              <button onClick={() => download(f)} className="text-navy-700 hover:text-navy-900 text-xs font-semibold">
                Download
              </button>
              {editable && (
                <button
                  onClick={() => del.mutate(f.fileId)}
                  className="text-returned-text hover:text-returned-text/80 text-xs font-semibold"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
