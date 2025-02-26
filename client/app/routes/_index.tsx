import { useEffect, useState } from "react";
import { fetchMovie, checkAuth } from "~/utils/api";
import { redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useNavigate } from "@remix-run/react";

// export const loader = async () => {
//   const isAuthenticated = await checkAuth();
//   if (!isAuthenticated) {
//     console.log("User is not authenticated. Redirecting to login page.");
//     throw redirect("/login");
//   }
//   return null;
// };

export default function Index() {
  const [movie, setMovie] = useState<any>(null);
  const [username, setUsername] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMovie().then(setMovie).catch(console.error);
  }, []);

  useEffect(() => {
    console.log("Checking for authentication");
    const user = localStorage.getItem("username")
    if (!user) {
      console.log("User is not authenticated. Redirecting to login page.");
      navigate("/login");
    }

    setUsername(user);
  }, []);

  if (!movie) return <p className="text-center text-white">Loading movie...</p>;

  return (
    <div className="flex flex-col items-center py-8">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-lg text-center">
        <h1 className="text-3xl font-bold">{movie.title}</h1>
        <img className="rounded-lg mt-4" src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt={movie.title} />
      </div>
    </div>
  );
}
