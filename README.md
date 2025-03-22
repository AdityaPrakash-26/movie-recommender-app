# Movie Explorer

View deployment [here](https://movie-recommender-app-gyxv.onrender.com/)!

Movie Explorer is a full‐stack web application built with Flask (Python) on the backend and Remix (React‐based) on the frontend, using PostgreSQL. It fetches random movie details from The Movie Database (TMDb) and links to Wikipedia for expanded film information.

Originally developed as part of CS540: Software Engineering at Emory University under Professor John Martin, this project has evolved with enhanced features as my personal project. It incorporates user authentication, movie reviews, and is slated for deployment on Google Cloud. By combining a modern JavaScript frontend with a robust Python backend, Movie Explorer demonstrates best practices in web development, API integration, and database management.

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/cs540-s25/milestone3-aprak39
   cd milestone3-aprak39
   ```

2. Create a .env file in the project root and add your [TMDb API key](https://developer.themoviedb.org/docs/getting-started):
```API_KEY=your_tmdb_api_key_here```. You also need to create a `SECRET_KEY` for flask login. Example: `SECRET_KEY=HelloWorld`

3. Download and configure [PostgreSQL](https://www.postgresql.org/), and add its URL to .env as `DATABASE_URL`. Example: `DATABASE_URL=postgresql://<username>:<password>@localhost:5432/<db_name>`

4. Start the Flask server:

    4.1 First navigate to the server directory
        ```bash
        cd server
        ```

    4.2 Create a virtual environment (optional but recommended):
        ```bash
        python -m venv venv
        source venv/bin/activate  # macOS/Linux
        venv\Scripts\activate  # Windows
        ```

    4.3 Install dependencies
        ```bash
        pip install -r requirements.txt
        ```

    4.4 Start the server
        ```bash
        python main.py
        ```


5. Start the Remix server:

    5.1 First navigate to the client directory (assuming you are still in server)
        ```bash
        cd ../client
        ```
    
    5.2 Install dependencies
        ```bash
        npm install
        ```

    5.3. Start the server
        ```bash
        npm run dev
        ```

6. Open `http://localhost:5173/` in your browser to view the app.

## Acknowledgements
- tMDB - The Movie Database for providing the API to look up movies
- Wikipedia API for movie-related links.
- Google Cloud Platform for providing free hosting
- Black Python Formatter - I am using Black v24.8.0
- ESLint - AirBnB Configuration
