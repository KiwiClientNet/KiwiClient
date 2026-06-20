import { useEffect } from "react";

const SITE_ORIGIN = "https://kiwiclient.net";

interface SeoOptions {
    title: string;
    description?: string;
    canonicalPath?: string;
    noindex?: boolean;
}

function upsertMeta(name: string, content: string) {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!element) {
        element = document.createElement("meta");
        element.setAttribute("name", name);
        document.head.appendChild(element);
    }
    element.setAttribute("content", content);
}

function upsertCanonical(href: string) {
    let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!element) {
        element = document.createElement("link");
        element.setAttribute("rel", "canonical");
        document.head.appendChild(element);
    }
    element.setAttribute("href", href);
}

export function useSeo({ title, description, canonicalPath, noindex }: SeoOptions) {
    useEffect(() => {
        document.title = title;

        if (description) {
            upsertMeta("description", description);
        }

        upsertMeta("robots", noindex ? "noindex, nofollow" : "index, follow");

        upsertCanonical(`${SITE_ORIGIN}${canonicalPath ?? window.location.pathname}`);
    }, [title, description, canonicalPath, noindex]);
}
