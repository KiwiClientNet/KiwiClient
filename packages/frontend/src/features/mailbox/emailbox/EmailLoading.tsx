/**
 * @brief Skeleton placeholder shown while a single email is being fetched.
 *
 * The shapes roughly mirror the final layout so the transition to real
 * content does not visibly shift the page when the request resolves.
 */

export function EmailLoading() {
    return (
        <div className="h-full w-full bg-kiwi-light-grey p-2">
            <div className="max-w-3xl space-y-6">
                <div className="space-y-3">
                    <div className="h-4 w-1/3 animate-pulse rounded bg-kiwi-white" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-kiwi-white" />
                    <div className="h-3 w-1/4 animate-pulse rounded bg-kiwi-white" />
                </div>
                <div className="space-y-3 pt-4">
                    <div className="h-3 w-full animate-pulse rounded bg-kiwi-white" />
                    <div className="h-3 w-11/12 animate-pulse rounded bg-kiwi-white" />
                    <div className="h-3 w-10/12 animate-pulse rounded bg-kiwi-white" />
                    <div className="h-3 w-full animate-pulse rounded bg-kiwi-white" />
                    <div className="h-3 w-8/12 animate-pulse rounded bg-kiwi-white" />
                </div>
                <div className="space-y-3 pt-4">
                    <div className="h-3 w-1/4 animate-pulse rounded bg-kiwi-white" />
                    <div className="h-3 w-1/5 animate-pulse rounded bg-kiwi-white" />
                </div>
            </div>
        </div>
    );
}
