'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <h2 className="text-2xl font-bold text-red-600">Something went wrong!</h2>
            <div className="p-4 bg-red-50 text-red-800 rounded-lg max-w-2xl overflow-auto">
                <p className="font-mono text-sm">{error.message}</p>
                {error.digest && <p className="text-xs text-gray-500 mt-2">Digest: {error.digest}</p>}
            </div>
            <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
            >
                Try again
            </button>
        </div>
    );
}
