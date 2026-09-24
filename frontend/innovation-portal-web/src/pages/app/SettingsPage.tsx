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
          Manage your personal information, notification preferences, and account security.
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

        {/* Preferences Section (UI Only) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="default" className="p-space-xl">
            <div className="mb-space-lg">
              <h2 className="font-headline-md text-headline-md text-on-surface">Preferences</h2>
              <p className="font-body-md text-body-md text-on-surface-variant-weak mt-1">
                Customize your portal experience.
              </p>
            </div>
            
            <div className="space-y-space-lg max-w-xl">
              <div className="flex items-center justify-between py-space-sm">
                <div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">Email Notifications</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant-weak">Receive updates about your submissions via email.</p>
                </div>
                <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow-sm"></div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="default" className="p-space-xl border-error border-opacity-30 bg-state-returned-bg">
            <div className="mb-space-lg">
              <h2 className="font-headline-md text-headline-md text-state-returned-text">Danger Zone</h2>
              <p className="font-body-md text-body-md text-state-returned-text/80 mt-1">
                Irreversible actions for your account.
              </p>
            </div>
            
            <div className="flex items-center justify-between border-t border-error/20 pt-space-md">
              <div>
                <h4 className="font-headline-sm text-headline-sm text-state-returned-text">Delete Account</h4>
                <p className="font-body-sm text-body-sm text-state-returned-text/80 max-w-sm">
                  Permanently remove your account and all associated data from the portal. This action cannot be undone.
                </p>
              </div>
              <Button variant="outline" className="text-error border-error hover:bg-error hover:text-white">
                Delete Account
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
