import { motion } from 'framer-motion';
import { useAuth } from '../../app/providers/AuthProvider';
import { useMySubmissions } from '../../hooks/usePortalQueries';
import { Card, Button } from '../../components/ui';

export default function TeamsPage() {
  const { authed } = useAuth();
  const { data: submissions, isLoading } = useMySubmissions(authed);

  const teamSubmissions = submissions?.filter(s => s.team != null) ?? [];

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-xl max-w-[1600px] mx-auto w-full">
      <motion.div
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="space-y-space-xs">
          <h1 className="font-display-lg text-display-lg text-on-surface">My Teams</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Manage your hackathon teams, view active members, and track your collaborative submissions.
          </p>
        </div>
        <Button variant="primary" className="h-10 px-space-md font-headline-sm text-headline-sm shadow-sm">
          Join a Team
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
          <div className="h-48 rounded-xl skeleton-shimmer" />
          <div className="h-48 rounded-xl skeleton-shimmer" />
        </div>
      ) : teamSubmissions.length === 0 ? (
        <motion.div
          className="py-20 text-center bg-surface-card rounded-xl border border-border-subtle"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="animate-float w-16 h-16 rounded-2xl bg-surface-card border border-border-subtle inline-flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-primary text-3xl">groups</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface mt-4">No active teams</h3>
          <p className="font-body-md text-body-md text-on-surface-variant-weak max-w-md mx-auto mt-1">
            You haven't joined or created any teams yet. Teams are created automatically when you draft a new team submission.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-lg">
          {teamSubmissions.map((sub, idx) => (
            <motion.div
              key={sub.team?.teamId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card variant="default" className="p-space-lg flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-space-md">
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface">{sub.team?.name}</h3>
                    <div className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak mt-1">
                      Problem Linked
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-primary-container text-primary text-[10px] font-bold tracking-wider">
                    {sub.status}
                  </span>
                </div>
                
                <div className="flex-1">
                  <h4 className="font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak mb-space-sm uppercase tracking-wider">
                    Members ({sub.team?.members.length})
                  </h4>
                  <ul className="space-y-space-sm">
                    {sub.team?.members.map(member => (
                      <li key={member.participantId} className="flex items-center gap-space-sm">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary font-headline-sm">
                          {member.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface truncate">
                          {member.fullName}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-space-lg pt-space-md border-t border-border-subtle flex justify-end gap-space-sm">
                  <Button variant="secondary" size="sm" className="h-8 px-space-md">Manage</Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
