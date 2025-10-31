import { useEffect, useState } from "react";
import { fetchUserReviews, deleteReview, updateReview } from "~/utils/api";
import { useNavigate } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
    const cookie = request.headers.get("cookie") || "";
    try {
        const res = await fetch("http://server:8080/api/auth-status", { headers: { cookie } });
        const data = await res.json();
        if (!data.isAuthenticated) return redirect("/");
    } catch {}
    return null;
}

export default function MyReviews() {
    interface Review {
        id: number;
        movie_title: string;
        rating: number;
        comment: string;
    }

    const [reviews, setReviews] = useState<Review[]>([]);
    const [editedReviews, setEditedReviews] = useState<{ [id: number]: { rating: number, comment: string } }>({});
    const [loading, setLoading] = useState<boolean>(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchUserReviews()
            .then(setReviews)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: number) => {
        await deleteReview(id);
        setReviews(reviews.filter((review) => review.id !== id));
    };

    const handleEdit = (id: number, field: "rating" | "comment", value: number | string) => {
        setEditedReviews((prev) => ({
            ...prev,
            [id]: {
                ...prev[id], // Preserve other values
                [field]: value, // Update only the specific field
            },
        }));
    };



    const handleSave = async () => {
        const updates = Object.entries(editedReviews).map(([id, { rating, comment }]) => ({
            id: Number(id),
            rating,
            comment,
        }));

        if (updates.length > 0) {
            setLoading(true);
            await updateReview(updates);
            setEditedReviews({});
            fetchUserReviews().then(setReviews).finally(() => setLoading(false)); // Refresh list
        }
    };

    return (
        <div className="flex flex-col items-center py-8">
            {/* Home Button */}
            <button
                onClick={() => navigate("/movie")}
                className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition mb-2"
            >
                Home
            </button>

            <h1 className="text-3xl font-bold text-yellow-400">My Reviews</h1>

            {loading ? (
                <p className="text-gray-400">Loading...</p>
            ) : reviews.length === 0 ? (
                <p className="text-gray-400">You have not reviewed any movies yet.</p>
            ) : (
                <div className="mt-6 bg-gray-800 p-6 rounded-lg shadow-lg max-w-lg w-full">
                    {reviews.map((review) => (
                        <div key={review.id} className="bg-gray-700 p-3 rounded-lg mb-2">
                            <p className="font-bold">{review.movie_title}</p>

                            {/* Editable Rating */}
                            <div className="flex items-center mt-2">
                                <label className="mr-2" htmlFor={`rating-${review.id}`}>Rating:</label>
                                <input
                                    id={`rating-${review.id}`}
                                    type="number"
                                    value={editedReviews[review.id]?.rating ?? review.rating}
                                    min="1"
                                    max="10"
                                    className="p-1 text-white rounded w-16 mr-2"
                                    onChange={(e) => handleEdit(review.id, "rating", Number(e.target.value))}
                                />
                                {/* <input
                                    type="number"
                                    value={editedReviews[review.id]?.rating ?? review.rating}
                                    min="1"
                                    max="10"
                                    className="p-1 text-white rounded w-16 mr-2"
                                    onChange={(e) => handleEdit(review.id, "rating", Number(e.target.value))}
                                /> */}
                            </div>
                            <textarea
                                className="w-full mt-2 p-2 text-white rounded"
                                value={editedReviews[review.id]?.comment ?? review.comment}
                                onChange={(e) => handleEdit(review.id, "comment", e.target.value)}
                            />
                            <div className="flex justify-between mt-2">
                                <button
                                    onClick={() => handleDelete(review.id)}
                                    className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={handleSave}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 mt-4 w-full"
                    >
                        Save Changes
                    </button>
                </div>
            )}
        </div>
    );
}
