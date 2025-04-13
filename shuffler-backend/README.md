# Music Shuffler Backend

Welcome to the Music Shuffler backend! This project serves as the backend server for the Music Shuffler application, providing APIs to manage user authentication, playlists, and interactions with the Spotify API.

## Table of Contents

- [Technologies Used](#technologies-used)
- [Setup](#setup)
- [API Endpoints](#api-endpoints)
- [Database](#database)
- [Contributing](#contributing)
- [License](#license)

## Technologies Used

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose

## Setup

To get started with the backend, follow these steps:

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/music-shuffler.git
   ```

2. Navigate to the backend directory:
   ```
   cd music-shuffler/shuffler-backend
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Set up your MongoDB database. Update the database connection string in `src/config/db.ts`.

5. Start the server:
   ```
   npm run start
   ```

The server will run on `http://localhost:5000` by default.

## API Endpoints

### Authentication
- `POST /auth/login`: Log in a user.
- `POST /auth/register`: Register a new user.

### Playlists
- `GET /playlists`: Retrieve all playlists for the authenticated user.
- `POST /playlists`: Create a new playlist.
- `GET /playlists/:id`: Retrieve a specific playlist by ID.
- `PUT /playlists/:id`: Update a specific playlist by ID.
- `DELETE /playlists/:id`: Delete a specific playlist by ID.

### Spotify Integration
- `GET /spotify/playlists`: Fetch playlists from Spotify.
- `GET /spotify/tracks`: Fetch tracks from a specific Spotify playlist.

## Database

This application uses MongoDB to store user and playlist data. Ensure that your MongoDB instance is running and accessible.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or features.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.