import React, { useState, useEffect } from "react";
import { checkAuth } from "~/utils/api";

export default function Navbar() {
    const [displayName, setDisplayName] = useState<string>("");
    const [isAuthed, setIsAuthed] = useState<boolean>(false);
    const [query, setQuery] = useState<string>("");

    useEffect(() => {
        checkAuth().then((a) => {
            if (a.isAuthenticated) {
                setIsAuthed(true);
                // Show only the friendly 'name' claim provided by the server
                setDisplayName(a.display_name || "");
            } else {
                setIsAuthed(false);
                setDisplayName("");
            }
        });
    }, []);

    function handleLogout() {
        // Navigate to GET /api/auth/logout so the server can clear cookies
        // and redirect to Cognito's Hosted UI logout (ending the AWS session)
        window.location.href = "/api/auth/logout";
    }

    return (
        <header className="bg-gray-900 p-4">
            <div className="max-w-7xl mx-auto grid grid-cols-3 items-center">
                {/* Left: Brand */}
                <div className="text-white font-semibold justify-self-start">Movie Recommender</div>

                {/* Center: Search (only when authed) */}
                <div className="justify-self-center w-full flex justify-center">
                    {isAuthed && (
                        <form action="/search" method="get" className="flex items-center space-x-2 w-full max-w-md">
                            {React.createElement('input', {
                                type: 'text',
                                name: 'q',
                                value: query,
                                onChange: (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value),
                                placeholder: 'Search movies...',
                                className: 'flex-1 px-3 py-1 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                            })}
                            <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                                Search
                            </button>
                        </form>
                    )}
                </div>

                {/* Right: Welcome + Logout */}
                <div className="justify-self-end flex items-center space-x-3">
                    <div className="text-white">{displayName ? `Welcome, ${displayName}` : ""}</div>
                    {isAuthed && (
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        >
                            Logout
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}