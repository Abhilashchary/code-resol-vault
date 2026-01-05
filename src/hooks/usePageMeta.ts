import { useEffect } from "react";

interface PageMetaOptions {
  title: string;
  description: string;
  canonicalPath?: string;
}

export const usePageMeta = ({ title, description, canonicalPath }: PageMetaOptions) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    // Meta description
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    const prevDescription = meta.content;
    meta.content = description;

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    const prevCanonical = canonical.href;
    const nextHref = new URL(
      canonicalPath ?? window.location.pathname + window.location.search,
      window.location.origin
    ).toString();
    canonical.href = nextHref;

    return () => {
      document.title = prevTitle;
      meta!.content = prevDescription;
      canonical!.href = prevCanonical;
    };
  }, [title, description, canonicalPath]);
};
