import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "@remix-run/react";
import Layout from "~/components/Layout";
import { fetchMovieDetails, submitReview } from "~/utils/api";

interface Movie {
    id: number;
    title: string;
    tagline?: string;
    poster_path: string;
    overview?: string;
    genres?: Array<{ name: string }>;
    reviews: Array<{ username: string; rating: number; comment: string }>;
}

export default function MovieDetails() {
    const { movieId } = useParams();
    const [movie, setMovie] = useState<Movie | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [reviews, setReviews] = useState<{ username: string; rating: number; comment: string }[]>([]);
    const [comment, setComment] = useState<string>("");
    const [rating, setRating] = useState<number | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const user = localStorage.getItem("username");
        if (!user) {
            console.log("User is not authenticated. Redirecting to login page.");
            navigate("/login");
        }
        setUsername(user);
    }, []);

    useEffect(() => {
        fetchMovieDetails(Number(movieId))
            .then((data) => {
                console.log(data);
                setMovie(data);
                setReviews(data.reviews);
            })
            .catch(console.error);
    }, [movieId]);

    if (!movie) {
        return (
            <div className="min-h-screen bg-gray-800 text-white flex items-center justify-center p-4">
                Loading movie details...
            </div>
        );
    }

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!movie) return;

        const response = await submitReview(movie.id, rating, comment, username!);
        if (response) {
            setReviews([...reviews, { username, rating, comment }]);
            setComment("");
            setRating(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-800 text-white">
            <Layout>
                <div className="max-w-4xl mx-auto p-6">
                    <button
                        onClick={() => navigate("/")}
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
                                        {movie.genres.map((genre, idx) => (
                                            <li key={idx}>{genre}</li>
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
