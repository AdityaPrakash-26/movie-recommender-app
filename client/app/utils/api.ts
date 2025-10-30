// Use a relative API base so the app works behind a reverse proxy (nginx)
const API_URL = "/api";

export async function checkAuth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/auth-status`, { credentials: "include" });
    const data = await response.json();

    // check if localStorage has username
    console.log("Checking for authentication");
    if (localStorage.getItem("username")) {
      console.log("User is authenticated");
      return true;
    }
    return data.isAuthenticated; // Returns true if user is logged in
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
}

export async function fetchMovie() {
  try {
    const response = await fetch(`${API_URL}/movie`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching movie:", error);
    return null;
  }
}

export async function submitReview(movieId: number, rating: number | null, comment: string, username: string) {
  try {
    const response = await fetch(`${API_URL}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movie_id: movieId, rating, comment, username }),
      credentials: "include",
      mode: "cors",
    });

    return await response.json();
  } catch (error) {
    console.error("Error submitting review:", error);
    return null;
  }
}

export async function loginUser(username: string) {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
      credentials: "include",
    });

    return await response.json();
  } catch (error) {
    console.error("Login error:", error);
    return { error: "Login failed. Please try again." };
  }
}

export async function registerUser(username: string) {
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    return await response.json();
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Registration failed. Please try again." };
  }
}

export async function logoutUser() {
  try {
    const response = await fetch(`${API_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });

    return await response.json();
  } catch (error) {
    console.error("Logout error:", error);
    return { error: "Logout failed. Please try again." };
  }
}

export async function fetchUserReviews(username: string) {
  try {
    const response = await fetch(`${API_URL}/my-reviews?username=${encodeURIComponent(username)}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    return [];
  }
}

export async function deleteReview(reviewId: number) {
  try {
    const response = await fetch(`${API_URL}/delete-review/${reviewId}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

  } catch (error) {
    console.error("Error deleting review:", error);
  }
}


export async function updateReview(updates: { id: number; rating: number; comment: string }[]) {
  try {
    // console.log("Updating reviews:", updates);
    const response = await fetch(`${API_URL}/update-reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ updates }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error updating reviews:", error);
  }
}

export async function searchMovies(query: string) {
  try {
    const response = await fetch(`${API_URL}/search?query=${encodeURIComponent(query)}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error searching movies:", error);
    return [];
  }
}

export async function fetchMovieDetails(movieId: number) {
  try {
    const response = await fetch(`${API_URL}/movie/${movieId}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching movie details:", error);
    return null;
  }
}