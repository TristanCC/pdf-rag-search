"use client";

import { useState } from "react";

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch("http://localhost:4000/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queryText: query }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Unknown error");

      setResults(data.results);
    } catch (err: any) {
      setError(err.message || "Failed to search");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-10 row-start-2 items-center sm:items-start w-full max-w-2xl">

        {/* PDF Upload */}
        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <form action="http://localhost:4000/uploadPDF" method="post" encType="multipart/form-data">
            <div className="flex gap-4">
              <input
                type="file"
                accept=".pdf"
                name="uploadedPDF"
                className="border-2 border-gray-500 cursor-pointer bg-white hover:bg-gray-100 text-black"
              />
              <button type="submit" className="p-4 bg-gray-500 hover:bg-gray-600 cursor-pointer">
                Upload PDF
              </button>
            </div>
          </form>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full">
          <input
            type="text"
            placeholder="Search uploaded PDFs..."
            className="border border-gray-400 rounded p-2 w-full text-black"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-500"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {/* Error Message */}
        {error && <p className="text-red-500">{error}</p>}

        {/* Results */}
        {results.length > 0 && (
          <div className="w-full border-t border-gray-400 pt-4">
            <h2 className="text-lg font-semibold mb-2">Results</h2>
            <ul className="flex flex-col gap-4">
              {results.map((res, idx) => (
                <li key={idx} className="border p-3 rounded bg-gray-100 text-black">
                  <p className="font-medium text-blue-700">Rank #{idx + 1}</p>
                  <pre className="whitespace-pre-wrap text-sm">{res.chunktext}</pre>
                  <p className="text-xs mt-2 text-gray-600">Distance: {res.distance.toFixed(4)}</p>
                  {res.metadata && (
                    <p className="text-xs text-gray-500">
                      Page: {res.metadata.pageNumber} • Chunk: {res.metadata.chunkIndex}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
