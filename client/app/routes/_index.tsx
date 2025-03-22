import { useEffect, useState } from "react";
import { fetchMovie, submitReview } from "~/utils/api";
import Layout from "~/components/Layout";
import { useNavigate } from "@remix-run/react";

export default function Index() {
  interface Movie {
    id: number;
    title: string;
    tagline: string;
    poster_path: string;
    wiki_link: string;
    reviews: { username: string; rating: number; comment: string }[];
  }

  const [movie, setMovie] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<{ username: string; rating: number; comment: string }[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [comment, setComment] = useState<string>("");
  const [rating, setRating] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMovie()
      .then((data) => {
        setMovie(data);
        setReviews(data.reviews);
      })
      .catch(console.error);
    console.log(reviews);
  }, []);

  // Authentication check
  useEffect(() => {
    const user = localStorage.getItem("username");
    if (!user) {
      console.log("User is not authenticated. Redirecting to login page.");
      navigate("/login");
    }
    setUsername(user);
  }, []);

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

  if (!movie) return <p className="text-center text-white">Loading movie...</p>;

  return (
    <Layout>
      <div className="flex flex-col items-center py-8">
        {/* checkout random movie title */}
        <h1 className="text-4xl font-bold mb-4">Confused? How about you watch this?</h1>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-lg text-center">
          <h1 className="text-3xl font-bold text-yellow-400">{movie.title}</h1>
          <p className="italic text-gray-400">{movie.tagline}</p>
          <img className="rounded-lg mt-4" src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt={movie.title} />

          {/* Wikipedia Link */}
          <a
            href={movie.wiki_link}
            target="_blank"
            className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition" rel="noreferrer"
          >
            More Info on Wikipedia
          </a>

          {/* Review Section */}
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
  );
}
