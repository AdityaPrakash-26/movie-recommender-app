import React, { useState } from "react";
import { useNavigate, useLoaderData } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect, json } from "@remix-run/node";
import Layout from "~/components/Layout";
import { submitReview } from "~/utils/api";

interface Movie {
    id: number;
    title: string;
    tagline?: string;
    poster_path: string;
    overview?: string;
    genres?: Array<{ id?: number; name: string }>;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
    const cookie = request.headers.get("cookie") || "";
    try {
        const res = await fetch("http://server:8080/api/auth-status", { headers: { cookie } });
        const data = await res.json();
        if (!data.isAuthenticated) return redirect("/");
    } catch {}
    const movieId = params.movieId;
    if (!movieId) return redirect("/explore");

    // Prefer fetching details directly from TMDB API
    // Use either a TMDB v4 bearer token (TMDB_BEARER) or an API key (TMDB_API_KEY/API_KEY)
    const tmdbBearer = process.env.TMDB_BEARER;
    const tmdbKey = process.env.TMDB_API_KEY || process.env.API_KEY;

    let details: any = null;
    try {
        const baseUrl = `https://api.themoviedb.org/3/movie/${encodeURIComponent(movieId)}?language=en-US`;
        const url = tmdbBearer || !tmdbKey ? baseUrl : `${baseUrl}&api_key=${encodeURIComponent(tmdbKey)}`;
        const headers: Record<string, string> = {};
        if (tmdbBearer) headers["Authorization"] = `Bearer ${tmdbBearer}`;
        const resp = await fetch(url, { headers });
        if (!resp.ok) throw new Error(`TMDB error ${resp.status}`);
        details = await resp.json();
    } catch (e) {
        // If TMDB fetch fails (e.g., missing key), fall back to server endpoint to avoid a broken page
        try {
            const r = await fetch(`http://server:8080/api/movie/${encodeURIComponent(movieId)}`, { headers: { cookie } });
            if (r.ok) {
                details = await r.json();
            }
        } catch {}
    }

    // Fetch reviews from our server so we can keep using the existing review system
    let reviews: Array<{ username: string; rating: number; comment: string }> = [];
    try {
        const r = await fetch(`http://server:8080/api/movie/${encodeURIComponent(movieId)}`, { headers: { cookie } });
        if (r.ok) {
            const data = await r.json();
            reviews = Array.isArray(data?.reviews) ? data.reviews : [];
        }
    } catch {}

    if (!details) {
        throw new Response("Movie not found", { status: 404 });
    }

    // Normalize minimal shape the UI needs
    const movie: Movie = {
        id: Number(details.id),
        title: details.title,
        tagline: details.tagline || undefined,
        poster_path: details.poster_path,
        overview: details.overview || undefined,
        genres: Array.isArray(details.genres)
            ? details.genres.map((g: any) => (typeof g === "string" ? { name: g } : { id: g.id, name: g.name }))
            : undefined,
    };

    return json({ movie, reviews });
}

export default function MovieDetails() {
    const { movie, reviews: initialReviews } = useLoaderData<typeof loader>();
    const [reviews, setReviews] = useState<{ username: string; rating: number; comment: string }[]>(initialReviews || []);
    const [comment, setComment] = useState<string>("");
    const [rating, setRating] = useState<number | null>(null);
    const navigate = useNavigate();

    // Authentication and data loading handled by loader

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();

        const response = await submitReview(movie.id, rating, comment);
        if (response) {
            setReviews([...reviews, { username: "You", rating: rating || 0, comment }]);
            setComment("");
            setRating(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-800 text-white">
            <Layout>
                <div className="max-w-4xl mx-auto p-6">
                    <button
                        onClick={() => navigate("/explore")}
                        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
                    >
                        Back
                    </button>
                    <div className="flex flex-col md:flex-row">
                        <img
                            className="w-full md:w-1/3 rounded-lg"
                            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                            alt={movie.title}
                        />
                        <div className="md:ml-6 mt-4 md:mt-0">
                            <h1 className="text-4xl font-bold">{movie.title}</h1>
                            {movie.tagline && (
                                <p className="italic text-gray-400 mt-2">{movie.tagline}</p>
                            )}
                            {movie.overview && (
                                <p className="mt-4 text-gray-200">{movie.overview}</p>
                            )}
                            {movie.genres && (
                                <div className="mt-4">
                                    <h2 className="text-xl font-semibold">Genres:</h2>
                                    <ul className="list-disc list-inside">
                                        {/* genre is an array */}
                                        {movie.genres.map((genre: { id?: number; name: string }) => (
                                            <li key={`${genre.id ?? genre.name}`}>{genre.name}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-8">
                        <h2 className="text-2xl font-bold">User Reviews</h2>
                        <div className="mt-6">
                            <h2 className="text-xl font-bold text-yellow-400">Reviews</h2>
                            {reviews.length > 0 ? (
                                <ul className="mt-2 text-left">
                                    {reviews.map((review, index) => (
                                        <li key={index} className="bg-gray-700 p-3 rounded-lg mb-2">
                                            <p className="font-bold">{review.username}:</p>
                                            {review.rating && <p>⭐ {review.rating}/10</p>}
                                            {review.comment && <p>&quot;{review.comment}&quot;</p>}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-400">No reviews yet. Be the first to review!</p>
                            )}
                        </div>

                        {/* Submit Review Form */}
                        <form onSubmit={handleSubmitReview} className="mt-4 flex flex-col">
                            <input
                                type="number"
                                placeholder="Rating (1-10)"
                                value={rating || ""}
                                onChange={(e) => setRating(Number(e.target.value))}
                                min="1"
                                max="10"
                                className="p-2 mb-2 text-white rounded"
                            />
                            <textarea
                                placeholder="Write a comment..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="p-2 mb-2 text-white rounded"
                            />
                            <button type="submit" className="bg-green-500 text-white p-2 rounded hover:bg-green-600">
                                Submit Review
                            </button>
                        </form>
                    </div>
                </div>
            </Layout>
        </div>
    );
}
