import ReactMarkdown from "react-markdown";

interface FormattedMarkdownProps {
    rawMarkdown: string;
}

export function FormattedMarkdown({ rawMarkdown }: FormattedMarkdownProps) {
    return (
        <article className="prose prose-invert prose-stone mx-auto max-w-2xl py-12 px-4">
            <ReactMarkdown>{rawMarkdown}</ReactMarkdown>
        </article>
    );
}
