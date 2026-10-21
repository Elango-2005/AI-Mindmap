import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Icon } from "@/components/Icon";
import { toast } from "sonner";
import {
  getCoggleStatus,
  getCoggleAuthUrl,
  disconnectCoggle,
  getCoggleDiagrams,
  importCoggleDiagram,
  exportCoggleDiagram,
  CoggleStatus,
  CoggleDiagram,
} from "@/api/integrations";

interface CoggleModalProps {
  isOpen: boolean;
  onClose: () => void;
  mindMapId: string;
  mindMapTitle: string;
  onImportComplete?: () => void;
}

export function CoggleModal({
  isOpen,
  onClose,
  mindMapId,
  mindMapTitle,
  onImportComplete,
}: CoggleModalProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<CoggleStatus | null>(null);
  const [diagrams, setDiagrams] = useState<CoggleDiagram[]>([]);
  const [loadingDiagrams, setLoadingDiagrams] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "import" | "export">("overview");
  const [importingId, setImportingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCoggleStatus();
      setStatus(data);
      if (data.connected) {
        fetchDiagrams();
      }
    } catch (err: any) {
      console.error("Failed to fetch Coggle status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDiagrams = async () => {
    try {
      setLoadingDiagrams(true);
      const res = await getCoggleDiagrams();
      setDiagrams(res.diagrams || []);
    } catch (err: any) {
      console.error("Failed to fetch Coggle diagrams:", err);
      toast.error(err.response?.data?.detail || "Could not load Coggle diagrams");
    } finally {
      setLoadingDiagrams(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setExportedUrl(null);
    }
  }, [isOpen, fetchStatus]);

  // Listen for popup auth completion message
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "COGGLE_CONNECTED") {
        toast.success("Coggle account connected!");
        fetchStatus();
      }
    };
    window.addEventListener("message", handleAuthMessage);
    return () => window.removeEventListener("message", handleAuthMessage);
  }, [fetchStatus]);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const { auth_url } = await getCoggleAuthUrl();
      const popup = window.open(
        auth_url,
        "CoggleOAuth",
        "width=640,height=720,status=no,toolbar=no,menubar=no,scrollbars=yes"
      );
      if (!popup) {
        // Fallback to direct redirect if popup blocked
        window.location.href = auth_url;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to initiate Coggle authorization");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await disconnectCoggle();
      setStatus((prev) => (prev ? { ...prev, connected: false, account_name: null, account_email: null } : null));
      setDiagrams([]);
      toast.success("Coggle disconnected");
    } catch (err: any) {
      toast.error("Failed to disconnect Coggle");
    } finally {
      setLoading(false);
    }
  };

  const handleImportDiagram = async (diag: CoggleDiagram) => {
    if (!window.confirm(`Import '${diag.title}' into this mind map? Existing layout will be updated with the imported hierarchy.`)) {
      return;
    }
    setImportingId(diag.id);
    const toastId = toast.loading(`Importing "${diag.title}" from Coggle...`);
    try {
      await importCoggleDiagram(mindMapId, diag.id);
      toast.success(`Successfully imported "${diag.title}"!`, { id: toastId });
      onImportComplete?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Import from Coggle failed", { id: toastId });
    } finally {
      setImportingId(null);
    }
  };

  const handleExportDiagram = async () => {
    setExporting(true);
    const toastId = toast.loading(`Exporting "${mindMapTitle}" to Coggle...`);
    try {
      const res = await exportCoggleDiagram(mindMapId);
      setExportedUrl(res.web_url);
      toast.success("Export to Coggle completed!", {
        id: toastId,
        action: {
          label: "View Diagram",
          onClick: () => window.open(res.web_url, "_blank"),
        },
      });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Export to Coggle failed", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[38rem] bg-surface border border-outline-variant/30 text-on-surface shadow-level-3 p-6 rounded-2xl">
        <DialogHeader className="mb-3">
          <div className="flex items-center gap-2.5 text-primary mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
              <Icon name="share" className="text-[20px]" />
            </div>
            <div>
              <DialogTitle className="text-headline-sm font-bold text-on-surface">
                Coggle Cloud Integration
              </DialogTitle>
              <DialogDescription className="text-body-sm text-on-surface-variant">
                Sync and interchange mind maps directly with your Coggle account.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Navigation Tabs */}
        <div className="flex border-b border-outline-variant/30 mb-4 gap-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-2 text-label-md font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Icon name="account_circle" className="text-[16px]" />
            Account Status
          </button>
          <button
            onClick={() => {
              setActiveTab("import");
              if (status?.connected && diagrams.length === 0) fetchDiagrams();
            }}
            disabled={!status?.connected}
            className={`px-3 py-2 text-label-md font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "import"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            <Icon name="download" className="text-[16px]" />
            Import from Cloud
          </button>
          <button
            onClick={() => setActiveTab("export")}
            disabled={!status?.connected}
            className={`px-3 py-2 text-label-md font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "export"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            <Icon name="upload" className="text-[16px]" />
            Export to Cloud
          </button>
        </div>

        {/* Tab 1: Overview & Authentication */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Unconfigured Alert */}
            {status && !status.configured && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-body-sm space-y-2">
                <div className="flex items-center gap-2 font-bold text-label-md">
                  <Icon name="warning" className="text-[20px] text-amber-500" />
                  OAuth Application Not Configured
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Coggle direct cloud integration requires OAuth application credentials in your environment.
                  Set the following in <code className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-xs">backend/.env</code>:
                </p>
                <div className="bg-surface-container-high/60 p-2.5 rounded-lg font-mono text-xs text-on-surface-variant space-y-0.5 overflow-x-auto select-all">
                  <div>COGGLE_CLIENT_ID=&lt;your_client_id&gt;</div>
                  <div>COGGLE_CLIENT_SECRET=&lt;your_client_secret&gt;</div>
                  <div>COGGLE_REDIRECT_URI=http://127.0.0.1:8000/api/v1/integrations/coggle/callback</div>
                </div>
                <p className="text-xs text-outline">
                  💡 Note: Local FreeMind (.mm), OPML, Markdown, and XMind file interchange work offline without credentials.
                </p>
              </div>
            )}

            {/* Connection Status Card */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    status?.connected
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-surface-container-high text-outline"
                  }`}
                >
                  <Icon name={status?.connected ? "check_circle" : "link_off"} className="text-[20px]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-body-md text-on-surface">
                      {status?.connected ? "Coggle Connected" : "Coggle Disconnected"}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        status?.connected
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-outline-variant/30 text-outline"
                      }`}
                    >
                      {status?.connected ? "Active" : "Not Linked"}
                    </span>
                  </div>
                  {status?.connected ? (
                    <div className="text-body-xs text-on-surface-variant mt-0.5">
                      Linked Account: <span className="font-medium text-on-surface">{status.account_name || status.account_email || "Coggle User"}</span>
                      {status.account_email && status.account_name && (
                        <span className="text-outline"> ({status.account_email})</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-body-xs text-outline mt-0.5">
                      Connect your Coggle account to sync diagrams directly without manual export files.
                    </p>
                  )}
                </div>
              </div>

              {status?.connected ? (
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="px-3 py-1.5 text-label-sm font-semibold text-error hover:bg-error/10 border border-error/20 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={loading || !status?.configured}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-label-sm font-semibold transition-colors shadow-sm"
                >
                  <Icon name="link" className="text-[16px]" />
                  Connect Coggle
                </button>
              )}
            </div>

            {/* Quick Actions if connected */}
            {status?.connected && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    setActiveTab("import");
                    fetchDiagrams();
                  }}
                  className="p-3.5 rounded-xl border border-outline-variant/30 bg-surface hover:bg-surface-container transition-all text-left flex items-start gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon name="download" className="text-[16px]" />
                  </div>
                  <div>
                    <div className="font-semibold text-label-md text-on-surface">Import a Diagram</div>
                    <div className="text-body-xs text-outline mt-0.5">Choose from your Coggle diagrams</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("export")}
                  className="p-3.5 rounded-xl border border-outline-variant/30 bg-surface hover:bg-surface-container transition-all text-left flex items-start gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon name="upload" className="text-[16px]" />
                  </div>
                  <div>
                    <div className="font-semibold text-label-md text-on-surface">Export This Map</div>
                    <div className="text-body-xs text-outline mt-0.5">Send current mind map directly to Coggle</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Import from Coggle */}
        {activeTab === "import" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-bold text-outline uppercase tracking-wider">
                Your Coggle Diagrams ({diagrams.length})
              </span>
              <button
                onClick={fetchDiagrams}
                disabled={loadingDiagrams}
                className="text-primary hover:underline text-xs flex items-center gap-1 font-semibold"
              >
                <Icon name="refresh" className={`text-[14px] ${loadingDiagrams ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {loadingDiagrams ? (
              <div className="py-12 text-center text-outline text-body-sm flex flex-col items-center gap-2">
                <Icon name="progress_activity" className="text-[24px] animate-spin text-primary" />
                Loading your diagrams from Coggle...
              </div>
            ) : diagrams.length === 0 ? (
              <div className="py-8 text-center text-outline text-body-sm bg-surface-container rounded-xl p-4">
                <Icon name="folder_open" className="text-[32px] mb-2 opacity-50" />
                <p>No diagrams found in your connected Coggle account.</p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {diagrams.map((diag) => (
                  <div
                    key={diag.id}
                    className="p-3 rounded-xl border border-outline-variant/30 bg-surface hover:bg-surface-container/60 transition-colors flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-body-sm text-on-surface truncate">
                        {diag.title}
                      </div>
                      <div className="flex items-center gap-2 text-body-xs text-outline mt-0.5">
                        <span>ID: {diag.id}</span>
                        {diag.web_url && (
                          <a
                            href={diag.web_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-0.5"
                          >
                            Open <Icon name="open_in_new" className="text-[12px]" />
                          </a>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleImportDiagram(diag)}
                      disabled={importingId === diag.id}
                      className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-label-sm font-semibold transition-colors shrink-0 flex items-center gap-1"
                    >
                      {importingId === diag.id ? (
                        <>
                          <Icon name="progress_activity" className="text-[14px] animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Icon name="download" className="text-[14px]" />
                          Import
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Export to Coggle */}
        {activeTab === "export" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <Icon name="cloud_upload" className="text-[20px]" />
                </div>
                <div>
                  <h4 className="font-bold text-body-md text-on-surface">Export to Coggle</h4>
                  <p className="text-body-xs text-outline">
                    Converts current map "{mindMapTitle}" into a Coggle native diagram with full hierarchy.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleExportDiagram}
                  disabled={exporting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-label-md transition-colors shadow-sm disabled:opacity-50"
                >
                  {exporting ? (
                    <>
                      <Icon name="progress_activity" className="text-[16px] animate-spin" />
                      Uploading diagram to Coggle...
                    </>
                  ) : (
                    <>
                      <Icon name="cloud_upload" className="text-[16px]" />
                      Export Current Map Now
                    </>
                  )}
                </button>
              </div>
            </div>

            {exportedUrl && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2 text-body-sm font-semibold">
                  <Icon name="check_circle" className="text-[20px] text-emerald-500" />
                  Diagram created successfully on Coggle!
                </div>
                <a
                  href={exportedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-emerald-600 text-white text-label-sm font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1 shadow-sm"
                >
                  View on Coggle <Icon name="open_in_new" className="text-[14px]" />
                </a>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
