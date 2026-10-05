import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useState, useEffect } from "react";
import { Icon } from "@/components/Icon";
import { getCurrentUser } from "@/api/auth";

const TITLE = "Account - MindVault AI";
const DESCRIPTION = "Manage your account settings and preferences.";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
    ],
  }),
  component: Account,
});

function Account() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ full_name: string; email: string; profile_image?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    window.location.href = "/login";
  };

  return (
    <AppLayout activeRoute="Account">
      <div className="flex-1 overflow-y-auto w-full p-4 sm:p-xl">
        <header className="mb-8 max-w-4xl mx-auto">
          <h1 className="text-headline-md sm:text-headline-lg text-on-surface">Account Settings</h1>
          <p className="text-body-md text-on-surface-variant mt-2 max-w-2xl">
            Manage your personal information, security, and account preferences.
          </p>
        </header>

        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          {/* Profile Section */}
          <section className="bg-surface border border-outline-variant/30 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-outline-variant/30 bg-surface-container-lowest">
              <h2 className="text-title-lg font-bold text-on-surface">Profile Information</h2>
              <p className="text-body-sm text-on-surface-variant mt-1">Your basic account details.</p>
            </div>
            
            <div className="p-6">
              {isLoading ? (
                <div className="animate-pulse flex flex-col gap-4">
                  <div className="h-10 bg-surface-container-high rounded w-full max-w-md"></div>
                  <div className="h-10 bg-surface-container-high rounded w-full max-w-md"></div>
                </div>
              ) : user ? (
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold shrink-0 border border-primary/20">
                    {user.profile_image ? (
                      <img src={user.profile_image} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      user.full_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-4 w-full">
                    <div>
                      <label className="text-label-md font-semibold text-on-surface-variant block mb-1">Full Name</label>
                      <div className="text-body-lg text-on-surface bg-surface-container-lowest px-4 py-2 rounded-lg border border-outline-variant/30">{user.full_name}</div>
                    </div>
                    <div>
                      <label className="text-label-md font-semibold text-on-surface-variant block mb-1">Email Address</label>
                      <div className="text-body-lg text-on-surface bg-surface-container-lowest px-4 py-2 rounded-lg border border-outline-variant/30">{user.email}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-error">Failed to load user profile.</p>
              )}
            </div>
          </section>

          {/* Security Section */}
          <section className="bg-surface border border-outline-variant/30 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-outline-variant/30 bg-surface-container-lowest">
              <h2 className="text-title-lg font-bold text-on-surface">Security</h2>
              <p className="text-body-sm text-on-surface-variant mt-1">Manage your password and authentication methods.</p>
            </div>
            <div className="p-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div>
                <h3 className="text-body-lg font-semibold text-on-surface">Password</h3>
                <p className="text-body-sm text-on-surface-variant">Update your password to keep your account secure.</p>
              </div>
              <button 
                onClick={() => alert("Password reset functionality coming soon.")}
                className="px-4 py-2 bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors rounded-lg font-medium border border-outline-variant/30 shrink-0"
              >
                Change Password
              </button>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-error/5 border border-error/20 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-error/10 bg-error/10">
              <h2 className="text-title-lg font-bold text-error">Danger Zone</h2>
              <p className="text-body-sm text-error/80 mt-1">Irreversible account actions.</p>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pb-6 border-b border-error/10">
                <div>
                  <h3 className="text-body-lg font-semibold text-on-surface">Log Out</h3>
                  <p className="text-body-sm text-on-surface-variant">Sign out of your account on this device.</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors rounded-lg font-medium border border-outline-variant/30 shrink-0 flex items-center gap-2"
                >
                  <Icon name="logout" className="text-[18px]" />
                  Log Out
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div>
                  <h3 className="text-body-lg font-semibold text-error">Delete Account</h3>
                  <p className="text-body-sm text-error/80">Permanently delete your account and all associated mind maps.</p>
                </div>
                <button 
                  onClick={() => {
                    if (window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) {
                      alert("Account deletion is disabled in this demo environment.");
                    }
                  }}
                  className="px-4 py-2 bg-error text-on-error hover:bg-error/90 transition-colors rounded-lg font-medium shrink-0 flex items-center gap-2"
                >
                  <Icon name="delete_forever" className="text-[18px]" />
                  Delete Account
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
