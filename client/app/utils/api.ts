// Use a relative API base so the app works behind a reverse proxy (nginx)
const API_URL = "/api";

export async function checkAuth(): Promise<{ isAuthenticated: boolean; username?: string; email?: string; display_name?: string }>{
  try {
    const response = await fetch(`${API_URL}/auth-status`, { credentials: "include" });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return { isAuthenticated: false };
  }
}

export async function fetchExplore() {
  try {
    const response = await fetch(`${API_URL}/explore`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching explore movie:", error);
    return null;
  }
}

export async function submitReview(movieId: number, rating: number | null, comment: string) {
  try {
    const response = await fetch(`${API_URL}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movie_id: movieId, rating, comment }),
      credentials: "include",
      mode: "cors",
    });

    return await response.json();
  } catch (error) {
    console.error("Error submitting review:", error);
    return null;
  }
}

// Login and register are handled via Cognito Hosted UI now

// Registration happens in Hosted UI

export async function logoutUser() {
  try {
    // Redirect to server GET endpoint that clears cookie and signs out of Cognito
    window.location.href = `${API_URL}/auth/logout`;
    return { ok: true } as any;
  } catch (error) {
    console.error("Logout error:", error);
    return { error: "Logout failed. Please try again." };
  }
}

export async function fetchUserReviews() {
  try {
    const response = await fetch(`${API_URL}/my-reviews`, {
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