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
  getMindMeisterStatus,
  getMindMeisterAuthUrl,
  disconnectMindMeister,
  getMindMeisterMaps,
  importMindMeisterMap,
  exportMindMeisterMap,
  MindMeisterStatus,
  MindMeisterMap,
} from "@/api/integrations";

interface MindMeisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  mindMapId: string;
  mindMapTitle: string;
  onImportComplete?: () => void;
}

export function MindMeisterModal({
  isOpen,
  onClose,
  mindMapId,
  mindMapTitle,
  onImportComplete,
}: MindMeisterModalProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<MindMeisterStatus | null>(null);
  const [maps, setMaps] = useState<MindMeisterMap[]>([]);
  const [loadingMaps, setLoadingMaps] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "import" | "export">("overview");
  const [importingId, setImportingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMindMeisterStatus();
      setStatus(data);
      if (data.connected) {
        fetchMaps();
      }
    } catch (err: any) {
      console.error("Failed to fetch MindMeister status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMaps = async () => {
    try {
      setLoadingMaps(true);
      const res = await getMindMeisterMaps();
      setMaps(res.maps || []);
    } catch (err: any) {
      console.error("Failed to fetch MindMeister maps:", err);
      toast.error(err.response?.data?.detail || "Could not load MindMeister maps");
    } finally {
      setLoadingMaps(false);
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
      if (event.data?.type === "MINDMEISTER_CONNECTED") {
        toast.success("MindMeister account connected!");
        fetchStatus();
      }
    };
    window.addEventListener("message", handleAuthMessage);
    return () => window.removeEventListener("message", handleAuthMessage);
  }, [fetchStatus]);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const { auth_url } = await getMindMeisterAuthUrl();
      const popup = window.open(
        auth_url,
        "MindMeisterOAuth",
        "width=640,height=720,status=no,toolbar=no,menubar=no,scrollbars=yes"
      );
      if (!popup) {
        // Fallback to direct redirect if popup blocked
        window.location.href = auth_url;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to initiate MindMeister authorization");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await disconnectMindMeister();
      setStatus((prev) => (prev ? { ...prev, connected: false, account_name: null, account_email: null } : null));
      setMaps([]);
      toast.success("MindMeister disconnected");
    } catch (err: any) {
      toast.error("Failed to disconnect MindMeister");
    } finally {
      setLoading(false);
    }
  };

  const handleImportMap = async (mmMap: MindMeisterMap) => {
    if (!window.confirm(`Import '${mmMap.title}' into this mind map? Existing layout will be updated with the imported hierarchy.`)) {
      return;
    }
    setImportingId(mmMap.id);
    const toastId = toast.loading(`Importing "${mmMap.title}" from MindMeister...`);
    try {
      await importMindMeisterMap(mindMapId, mmMap.id);
      toast.success(`Successfully imported "${mmMap.title}"!`, { id: toastId });
      onImportComplete?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Import from MindMeister failed", { id: toastId });
    } finally {
      setImportingId(null);
    }
  };

  const handleExportMap = async () => {
    setExporting(true);
    const toastId = toast.loading(`Exporting "${mindMapTitle}" to MindMeister...`);
    try {
      const res = await exportMindMeisterMap(mindMapId);
      setExportedUrl(res.web_url);
      toast.success("Export to MindMeister completed!", {
        id: toastId,
        action: {
          label: "View Map",
          onClick: () => window.open(res.web_url, "_blank"),
        },
      });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Export to MindMeister failed", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[38rem] bg-surface border border-outline-variant/30 text-on-surface shadow-level-3 p-6 rounded-2xl">
        <DialogHeader className="mb-3">
          <div className="flex items-center gap-2.5 text-primary mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
              <Icon name="cloud_sync" className="text-[20px]" />
            </div>
            <div>
              <DialogTitle className="text-headline-sm font-bold text-on-surface">
                MindMeister Cloud Integration
              </DialogTitle>
              <DialogDescription className="text-body-sm text-on-surface-variant">
                Sync and interchange mind maps directly with your MindMeister account.
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
            <Icon name="account_circle" className="text-[18px]" />
            Account Status
          </button>
          <button
            onClick={() => {
              setActiveTab("import");
              if (status?.connected && maps.length === 0) fetchMaps();
            }}
            disabled={!status?.connected}
            className={`px-3 py-2 text-label-md font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "import"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            <Icon name="download" className="text-[18px]" />
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
            <Icon name="upload" className="text-[18px]" />
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
                  MindMeister direct cloud integration requires OAuth application credentials in your environment.
                  Set the following in <code className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[11px]">backend/.env</code>:
                </p>
                <div className="bg-surface-container-high/60 p-2.5 rounded-lg font-mono text-[11px] text-on-surface-variant space-y-0.5 overflow-x-auto select-all">
                  <div>MINDMEISTER_CLIENT_ID=&lt;your_client_id&gt;</div>
                  <div>MINDMEISTER_CLIENT_SECRET=&lt;your_client_secret&gt;</div>
                  <div>MINDMEISTER_REDIRECT_URI=http://127.0.0.1:8000/api/v1/integrations/mindmeister/callback</div>
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
                  <Icon name={status?.connected ? "check_circle" : "link_off"} className="text-[22px]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-body-md text-on-surface">
                      {status?.connected ? "MindMeister Connected" : "MindMeister Disconnected"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
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
                      Linked Account: <span className="font-medium text-on-surface">{status.account_name || status.account_email || "MindMeister User"}</span>
                      {status.account_email && status.account_name && (
                        <span className="text-outline"> ({status.account_email})</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-body-xs text-outline mt-0.5">
                      Connect your MindMeister account to sync maps directly without manual export files.
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
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg text-label-sm font-semibold transition-colors shadow-sm"
                >
                  <Icon name="link" className="text-[16px]" />
                  Connect MindMeister
                </button>
              )}
            </div>

            {/* Quick Actions if connected */}
            {status?.connected && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    setActiveTab("import");
                    fetchMaps();
                  }}
                  className="p-3.5 rounded-xl border border-outline-variant/30 bg-surface hover:bg-surface-container transition-all text-left flex items-start gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon name="download" className="text-[18px]" />
                  </div>
                  <div>
                    <div className="font-semibold text-label-md text-on-surface">Import a Map</div>
                    <div className="text-body-xs text-outline mt-0.5">Choose from your MindMeister cloud maps</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("export")}
                  className="p-3.5 rounded-xl border border-outline-variant/30 bg-surface hover:bg-surface-container transition-all text-left flex items-start gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon name="upload" className="text-[18px]" />
                  </div>
                  <div>
                    <div className="font-semibold text-label-md text-on-surface">Export This Map</div>
                    <div className="text-body-xs text-outline mt-0.5">Send current mind map directly to MindMeister</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Import from MindMeister */}
        {activeTab === "import" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-bold text-outline uppercase tracking-wider">
                Your MindMeister Maps ({maps.length})
              </span>
              <button
                onClick={fetchMaps}
                disabled={loadingMaps}
                className="text-primary hover:underline text-xs flex items-center gap-1 font-semibold"
              >
                <Icon name="refresh" className={`text-[14px] ${loadingMaps ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {loadingMaps ? (
              <div className="py-12 text-center text-outline text-body-sm flex flex-col items-center gap-2">
                <Icon name="progress_activity" className="text-[28px] animate-spin text-primary" />
                Loading your maps from MindMeister...
              </div>
            ) : maps.length === 0 ? (
              <div className="py-8 text-center text-outline text-body-sm bg-surface-container rounded-xl p-4">
                <Icon name="folder_open" className="text-[32px] mb-2 opacity-50" />
                <p>No mind maps found in your connected MindMeister account.</p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {maps.map((map) => (
                  <div
                    key={map.id}
                    className="p-3 rounded-xl border border-outline-variant/30 bg-surface hover:bg-surface-container/60 transition-colors flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-body-sm text-on-surface truncate">
                        {map.title}
                      </div>
                      <div className="flex items-center gap-2 text-body-xs text-outline mt-0.5">
                        <span>ID: {map.id}</span>
                        {map.web_url && (
                          <a
                            href={map.web_url}
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
                      onClick={() => handleImportMap(map)}
                      disabled={importingId === map.id}
                      className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-label-sm font-semibold transition-colors shrink-0 flex items-center gap-1"
                    >
                      {importingId === map.id ? (
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

        {/* Tab 3: Export to MindMeister */}
        {activeTab === "export" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Icon name="cloud_upload" className="text-[22px]" />
                </div>
                <div>
                  <h4 className="font-bold text-body-md text-on-surface">Export to MindMeister</h4>
                  <p className="text-body-xs text-outline">
                    Converts current map "{mindMapTitle}" into a MindMeister native map with full hierarchy.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleExportMap}
                  disabled={exporting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-label-md transition-colors shadow-sm disabled:opacity-50"
                >
                  {exporting ? (
                    <>
                      <Icon name="progress_activity" className="text-[18px] animate-spin" />
                      Uploading map to MindMeister...
                    </>
                  ) : (
                    <>
                      <Icon name="cloud_upload" className="text-[18px]" />
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
                  Map created successfully on MindMeister!
                </div>
                <a
                  href={exportedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-emerald-600 text-white text-label-sm font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1 shadow-sm"
                >
                  View on MindMeister <Icon name="open_in_new" className="text-[14px]" />
                </a>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
