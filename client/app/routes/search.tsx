import React, { useEffect, useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useSearchParams, Link } from "@remix-run/react";
import Layout from "~/components/Layout";
import { searchMovies } from "~/utils/api";

export async function loader({ request }: LoaderFunctionArgs) {
  const cookie = request.headers.get("cookie") || "";
  try {
    const res = await fetch("http://server:8080/api/auth-status", { headers: { cookie } });
    const data = await res.json();
    if (!data.isAuthenticated) return redirect("/");
  } catch {}
  return null;
}

interface SearchResult {
  id: number;
  title: string;
  poster_path?: string;
  overview?: string;
}

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!q) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await searchMovies(q);
        if (!cancelled) setResults(data || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [q]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">Search results {q ? `for "${q}"` : ""}</h1>
        {loading && <div className="text-gray-300">Searching…</div>}
        {!loading && results.length === 0 && q && (
          <div className="text-gray-400">No results found.</div>
        )}
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((m) => (
            <li key={m.id} className="bg-gray-800 rounded p-4 flex flex-col">
              {m.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w300${m.poster_path}`}
                  alt={m.title}
                  className="rounded mb-3"
                />
              )}
              <h2 className="text-lg font-semibold mb-2">{m.title}</h2>
              <div className="mt-auto">
                <Link
                  to={`/movie/${m.id}`}
                  className="inline-block bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  View Details
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}
