export function SiteFooter({ compact = false }: { compact?: boolean }) {
  const links = ["Privacy Policy", "Terms of Service", "API Docs", "Contact Support"];
  return (
    <footer
      className={
        compact
          ? "mt-auto border-t border-outline-variant/30 py-xl px-lg flex flex-col md:flex-row justify-between items-center gap-lg text-label-sm text-on-surface-variant bg-surface/30"
          : "bg-surface-container-lowest border-t border-outline-variant/30 w-full mt-xxl py-xl px-margin flex flex-col md:flex-row justify-between items-center gap-lg relative z-20"
      }
    >
      {compact ? (
        <p>© 2024 MindVault AI. Intelligent Thought Mapping.</p>
      ) : (
        <div className="flex flex-col items-center md:items-start gap-sm">
          <span className="text-headline-sm font-bold text-primary">MindVault AI</span>
          <p className="text-label-md text-on-surface-variant">
            © 2024 MindVault AI. Intelligent Thought Mapping.
          </p>
        </div>
      )}
      <nav className="flex flex-wrap justify-center gap-md md:gap-lg">
        {links.map((l) => (
          <a
            key={l}
            href="#legal"
            className="text-label-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            {l}
          </a>
        ))}
      </nav>
    </footer>
  );
}
