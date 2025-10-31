import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import Layout from "~/components/Layout";
import { useEffect } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  // Server-side check using backend session cookie
  const cookie = request.headers.get("cookie") || "";
  try {
    const res = await fetch("http://server:8080/api/auth-status", { headers: { cookie } });
    const data = await res.json();
    if (data.isAuthenticated) return redirect("/explore");
  } catch {}
  return null;
}

export default function Landing() {
  // Client-side safety: if already authenticated, push to /explore
  useEffect(() => {
    fetch("/api/auth-status", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.isAuthenticated) {
          window.location.replace("/explore");
        }
      })
      .catch(() => {});
  }, []);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Movie Recommender</h1>
        <p className="text-gray-300 mb-8 max-w-xl">
          Discover movies, read reviews, and share your thoughts. Please sign in to continue.
        </p>
        <div className="flex space-x-4">
          <a
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
            href="/api/auth/login"
          >
            Sign in
          </a>
          <a
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600"
            href="/api/auth/login?signup=1"
          >
            Sign up
          </a>
        </div>
      </div>
    </Layout>
  );
}
