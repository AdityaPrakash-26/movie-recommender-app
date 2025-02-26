const API_URL = "http://127.0.0.1:7890/api"; // Adjust this if deployed

// ✅ Check if user is authenticated
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

// ✅ Login a user
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

// ✅ Register a new user
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

// ✅ Logout user
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

// ✅ Submit a review
// export async function submitReview(movieId: number, rating: number, comment: string) {
//   try {
//     const response = await fetch(`${API_URL}/review`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ movie_id: movieId, rating, comment }),
//       credentials: "include",
//     });

//     return await response.json();
//   } catch (error) {
//     console.error("Review submission error:", error);
//     return { error: "Review submission failed. Please try again." };
//   }
// }
