import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "@remix-run/react";
import { searchMovies } from "~/utils/api";

export default function Navbar() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [status, setStatus] = useState<string | null>(null); // "searching" or null
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("username");
        navigate("/login");
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = e.target.value;
        setQuery(newQuery);

        // If user is typing something, show "searching" and clear old results
        if (newQuery.trim() !== "") {
            setStatus("searching");
            setResults([]);
        } else {
            setStatus(null);
            setResults([]);
        }

        // Clear any existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // If there's a query, set a new 2-second timer to actually perform the search
        if (newQuery.trim() !== "") {
            typingTimeoutRef.current = setTimeout(() => {
                doSearch(newQuery);
            }, 500);
        }
    };

    const handleSearchClick = () => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        doSearch(query);
    };

    // Actual search function
    const doSearch = async (searchQuery: string) => {
        if (!searchQuery) {
            setStatus(null);
            setResults([]);
            return;
        }

        try {
            const data = await searchMovies(searchQuery);
            // const limitedResults = data.slice(0, 5);
            setResults(data);
            setStatus(null);
        } catch (error) {
            console.error(error);
            setStatus(null);
        }
    };

    // Navigate to movie detail page on result click
    const handleResultClick = (movieId: number) => {
        navigate(`/movie/${movieId}`);
        setQuery("");
        setResults([]);
        setStatus(null);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setResults([]);
                setStatus(null);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setResults([]);
                setStatus(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    return (
        <header ref={containerRef} className="bg-gray-900 p-4 flex items-center justify-center relative">
            <div className="absolute left-4 text-white">Welcome, {localStorage.getItem("username")}</div>
            <div className="flex items-center max-w-xl w-full">
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    placeholder="Search movies..."
                    className="flex-grow p-2 rounded-l border-none outline-none"
                />
                <button type="button" onClick={handleSearchClick} className="bg-blue-500 text-white p-2 rounded-r">
                    Search
                </button>
            </div>
            <div className="absolute right-4 flex space-x-2">
                <button onClick={() => navigate("/my-reviews")} className="bg-blue-500 text-white px-4 py-2 rounded">
                    My Reviews
                </button>
                <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">
                    Logout
                </button>
            </div>

            {(status === "searching" || results.length > 0) && query.trim() !== "" && (
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white rounded shadow-lg mt-2 max-w-xl w-full p-2 max-h-48 overflow-y-auto border border-gray-700">
                    {status === "searching" && (
                        <div className="p-2 text-gray-300">Searching...</div>
                    )}
                    {status !== "searching" && results.length > 0 && (
                        <ul>
                            {results.map((movie: any) => (
                                <li
                                    key={movie.id}
                                    className="p-2 hover:bg-gray-700 cursor-pointer"
                                    onClick={() => handleResultClick(movie.id)}
                                >
                                    {movie.title}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </header>
    );
}