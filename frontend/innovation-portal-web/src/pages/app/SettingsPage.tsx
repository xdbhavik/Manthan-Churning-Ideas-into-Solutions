import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../app/providers/AuthProvider';
import { useMe, portalKeys } from '../../hooks/usePortalQueries';
import { updateMe } from '../../services/portalService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Input, Button } from '../../components/ui';

export default function SettingsPage() {
  const { authed } = useAuth();
  const { data: me, isLoading } = useMe(authed);
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (me) {
      setFullName(me.fullName || '');
      setEmail(me.email || '');
      setPhone(me.phone || '');
    }
  }, [me]);

  const mutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (updatedParticipant) => {
      queryClient.setQueryData(portalKeys.me, updatedParticipant);
    }
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ fullName, email, phone });
  };

  if (isLoading) {
    return (
      <div className="p-space-lg lg:p-space-xl max-w-4xl mx-auto w-full">
        <div className="h-48 rounded-xl skeleton-shimmer" />
      </div>
    );
  }

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-xl max-w-4xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="font-display-lg text-display-lg text-on-surface mb-space-xs">Settings</h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Update the contact details saved on your participant profile.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-space-lg">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="default" className="p-space-xl">
            <div className="mb-space-lg">
              <h2 className="font-headline-md text-headline-md text-on-surface">Profile Information</h2>
              <p className="font-body-md text-body-md text-on-surface-variant-weak mt-1">
                Update your contact details and how you appear on the portal.
              </p>
            </div>
            
            <form onSubmit={handleSaveProfile} className="space-y-space-lg max-w-xl">
              <div className="space-y-space-sm">
                <label className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Full Name</label>
                <Input 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-space-sm">
                <label className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Email Address</label>
                <Input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-space-sm">
                <label className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Phone Number</label>
                <Input 
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                />
              </div>

              <div className="pt-space-md border-t border-border-subtle flex items-center gap-space-md">
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="px-space-xl"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                {mutation.isSuccess && (
                  <span className="text-state-accepted-text font-body-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Saved successfully
                  </span>
                )}
                {mutation.isError && (
                  <span className="text-state-returned-text font-body-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    Failed to save
                  </span>
                )}
              </div>
            </form>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
