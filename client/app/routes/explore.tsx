import { useEffect, useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import Layout from "~/components/Layout";
import { checkAuth, fetchExplore, submitReview } from "~/utils/api";

export async function loader({ request }: LoaderFunctionArgs) {
  const cookie = request.headers.get("cookie") || "";
  try {
    const res = await fetch("http://server:8080/api/auth-status", { headers: { cookie } });
    const data = await res.json();
    if (!data.isAuthenticated) return redirect("/");
  } catch {}
  return null;
}

interface Movie {
  id: number;
  title: string;
  tagline: string;
  poster_path: string;
  wiki_link: string;
  overview?: string;
  reviews: { username: string; display_name?: string; rating: number; comment: string }[];
}

export default function ExplorePage() {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<{ username: string; display_name?: string; rating: number; comment: string }[]>([]);
  const [comment, setComment] = useState<string>("");
  const [rating, setRating] = useState<number | null>(null);
  const [myDisplayName, setMyDisplayName] = useState<string>("");

  useEffect(() => {
    // Load current user's friendly display name (like Navbar)
    checkAuth().then((a) => {
      if (a?.isAuthenticated) setMyDisplayName(a.display_name || "");
    });
    fetchExplore()
      .then((data) => {
        if (!data) return;
        setMovie(data);
        setReviews(data.reviews || []);
      })
      .catch(console.error);
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movie) return;

    const response = await submitReview(movie.id, rating, comment);
    if (response) {
      setReviews([
        ...reviews,
        {
          username: myDisplayName || "You",
          display_name: myDisplayName || "You",
          rating: rating || 0,
          comment,
        },
      ]);
      setComment("");
      setRating(null);
    }
  };

  if (!movie) return <p className="text-center text-white">Loading movie...</p>;

  return (
    <Layout>
      <div className="flex flex-col items-center py-8">
        <h1 className="text-4xl font-bold mb-4">Explore a random pick</h1>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-lg text-center">
          <h1 className="text-3xl font-bold text-yellow-400">{movie.title}</h1>
          <p className="italic text-gray-400">{movie.tagline}</p>
          <img className="rounded-lg mt-4" src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt={movie.title} />

          <div className="mt-6">
            <h2 className="text-xl font-bold text-yellow-400">Reviews</h2>
            {reviews.length > 0 ? (
              <ul className="mt-2 text-left">
                {reviews.map((review, index) => (
                  <li key={index} className="bg-gray-700 p-3 rounded-lg mb-2">
                    <p className="font-bold">{review.display_name || review.username}:</p>
                    {review.rating && <p>⭐ {review.rating}/10</p>}
                    {review.comment && <p>&quot;{review.comment}&quot;</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No reviews yet. Be the first to review!</p>
            )}
          </div>

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
  );
}