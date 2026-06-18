import ReactMarkdown from "react-markdown";
import { useSeo } from "../../hooks/useSeo";

interface FormattedMarkdownProps {
    rawMarkdown: string;
    title: string;
    description: string;
}

export function FormattedMarkdown({ rawMarkdown, title, description }: FormattedMarkdownProps) {
    useSeo({ title, description });

    return (
        <article className="prose prose-invert prose-stone mx-auto max-w-2xl py-12 px-4">
            <ReactMarkdown>{rawMarkdown}</ReactMarkdown>
        </article>
    );
}
