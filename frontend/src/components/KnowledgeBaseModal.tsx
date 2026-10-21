import React, { useState, useRef } from "react";
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
  uploadProjectDocument,
  deleteProjectDocument,
  searchProjectKnowledge,
  type ProjectDocument,
  type DocumentSearchResult,
} from "@/api/documents";

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  documents: ProjectDocument[];
  onDocumentsChange: () => Promise<void>;
}

export function KnowledgeBaseModal({
  isOpen,
  onClose,
  projectId,
  documents,
  onDocumentsChange,
}: KnowledgeBaseModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"documents" | "test_search">("documents");

  // Semantic search test states
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DocumentSearchResult[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    const allowedExts = [".pdf", ".txt", ".md"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExts.includes(ext)) {
      toast.error("Unsupported file type. Please upload .pdf, .txt, or .md files.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      setIsUploading(true);
      toast.info(`Indexing "${file.name}"... Generating vector embeddings`);
      await uploadProjectDocument(projectId, file);
      toast.success(`"${file.name}" successfully indexed into Knowledge Base!`);
      await onDocumentsChange();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || "Failed to upload and index document.";
      toast.error(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (docId: string, filename: string) => {
    if (!projectId) return;
    try {
      setDeletingId(docId);
      await deleteProjectDocument(projectId, docId);
      toast.success(`Removed "${filename}" from Knowledge Base.`);
      await onDocumentsChange();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleTestSearch = async () => {
    if (!projectId || !searchQuery.trim()) return;
    try {
      setIsSearching(true);
      const res = await searchProjectKnowledge(projectId, searchQuery.trim(), 4);
      setSearchResults(res.results);
    } catch (error) {
      console.error(error);
      toast.error("Semantic search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[38rem] max-h-[85vh] flex flex-col bg-surface border border-outline-variant/30 text-on-surface shadow-level-3 p-6 rounded-2xl overflow-hidden">
        <DialogHeader className="shrink-0 mb-3">
          <div className="flex items-center gap-2.5 text-primary mb-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Icon name="menu_book" className="text-[20px]" />
            </div>
            <div>
              <DialogTitle className="text-headline-sm font-bold text-on-surface">
                Domain Knowledge Base (RAG)
              </DialogTitle>
              <DialogDescription className="text-body-sm text-on-surface-variant">
                Ground AI mind map generation and Copilot answers in your project's custom documents.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab switch */}
        <div className="flex items-center gap-1 border-b border-outline-variant/20 mb-4 pb-1">
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "documents"
                ? "bg-primary/10 text-primary font-semibold"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <Icon name="description" className="text-[16px]" />
            Documents ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab("test_search")}
            className={`px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "test_search"
                ? "bg-primary/10 text-primary font-semibold"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <Icon name="manage_search" className="text-[16px]" />
            Semantic Retrieval Test
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === "documents" ? (
            <>
              {/* Upload Zone */}
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isUploading
                    ? "border-primary bg-primary/5 cursor-wait"
                    : "border-outline-variant/50 hover:border-primary hover:bg-surface-container-low"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="p-2.5 rounded-full bg-surface-container text-primary">
                    <Icon
                      name={isUploading ? "sync" : "cloud_upload"}
                      className={`text-[24px] ${isUploading ? "animate-spin" : ""}`}
                    />
                  </div>
                  {isUploading ? (
                    <div>
                      <p className="text-body-sm font-semibold text-primary">
                        Extracting & Embedding Document...
                      </p>
                      <p className="text-label-sm text-on-surface-variant">
                        Generating vector embeddings with gemini-embedding-001
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-body-sm font-medium text-on-surface">
                        <span className="text-primary font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-label-sm text-outline mt-0.5">
                        PDF, Markdown (.md), or Plain Text (.txt) up to 15MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status summary */}
              <div className="flex items-center justify-between text-label-sm text-on-surface-variant px-1">
                <span>Indexed Documents: <strong>{documents.length}</strong></span>
                <span>Total Vector Chunks: <strong>{totalChunks}</strong></span>
              </div>

              {/* Document List */}
              <div className="space-y-2">
                {documents.length === 0 ? (
                  <div className="text-center py-8 px-4 rounded-xl bg-surface-container-low border border-outline-variant/20">
                    <Icon name="auto_stories" className="text-[32px] text-outline mb-2 mx-auto" />
                    <p className="text-body-sm font-medium text-on-surface">No documents uploaded yet</p>
                    <p className="text-label-sm text-outline mt-1 max-w-sm mx-auto">
                      Without documents, Gemini uses its broad general knowledge. Upload niche guides or notes to ground mind maps in your facts.
                    </p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/25 hover:border-outline-variant/50 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-surface text-primary shrink-0">
                          <Icon
                            name={
                              doc.file_type === "pdf"
                                ? "picture_as_pdf"
                                : doc.file_type === "md"
                                ? "markdown"
                                : "text_snippet"
                            }
                            className="text-[20px]"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-body-sm font-medium text-on-surface truncate" title={doc.filename}>
                            {doc.filename}
                          </p>
                          <div className="flex items-center gap-2 text-label-xs text-outline mt-0.5">
                            <span className="uppercase font-semibold px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant text-xs">
                              {doc.file_type}
                            </span>
                            <span>{formatFileSize(doc.file_size_bytes)}</span>
                            <span>•</span>
                            <span className="text-primary font-medium">{doc.chunk_count} chunks</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        disabled={deletingId === doc.id}
                        className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors shrink-0 disabled:opacity-50"
                        title="Delete document and remove embeddings"
                      >
                        <Icon
                          name={deletingId === doc.id ? "sync" : "delete"}
                          className={`text-[16px] ${deletingId === doc.id ? "animate-spin" : ""}`}
                        />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            /* Semantic Retrieval Test Tab */
            <div className="space-y-3">
              <p className="text-label-sm text-on-surface-variant">
                Test how the cosine similarity engine retrieves relevant chunks for a prompt or question:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTestSearch()}
                  placeholder="e.g. key performance indicators, risk factors, methodology..."
                  className="flex-1 px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={handleTestSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2 bg-primary text-on-primary rounded-xl text-label-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Icon name={isSearching ? "sync" : "search"} className={`text-[16px] ${isSearching ? "animate-spin" : ""}`} />
                  Search
                </button>
              </div>

              {searchResults && (
                <div className="space-y-2 mt-3">
                  <p className="text-label-xs font-semibold uppercase tracking-wider text-outline">
                    Found {searchResults.length} Relevant Chunk(s)
                  </p>
                  {searchResults.length === 0 ? (
                    <p className="text-body-sm text-outline py-4 text-center">
                      No matching chunks found above relevance threshold.
                    </p>
                  ) : (
                    searchResults.map((res, idx) => (
                      <div
                        key={res.chunk_id || idx}
                        className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/25 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-label-xs text-on-surface-variant">
                          <span className="font-semibold text-primary truncate max-w-[240px]">
                            {res.filename} {res.page_number ? `(Page ${res.page_number})` : ""}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-medium">
                            {(res.score * 100).toFixed(1)}% match
                          </span>
                        </div>
                        <p className="text-body-xs text-on-surface font-mono bg-surface p-2 rounded-lg border border-outline-variant/15 whitespace-pre-wrap line-clamp-4">
                          {res.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between gap-4 text-xs text-outline shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
            <Icon name="verified_user" className="text-[14px] text-primary shrink-0" />
            <span className="text-xs">Strict Project Isolation: Chunks are scoped exclusively to this project.</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-outline-variant/40 hover:bg-surface-container text-xs font-medium text-on-surface transition-colors shrink-0"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
