# Music Shuffler

## Overview
Music Shuffler is a web application designed to enhance the music listening experience by intelligently grouping songs in a playlist based on various metadata attributes such as genre, beat, tempo, artist, and language. The application utilizes the Spotify API to fetch playlists and song data, allowing users to maintain a consistent "vibe" while listening to their favorite tracks.

## Project Structure
The project is divided into two main parts: the frontend (shuffler-ui) and the backend (shuffler-backend).

### Frontend (shuffler-ui)
- **Technology**: React with TypeScript
- **Features**:
  - Displays playlists and songs in a user-friendly dashboard.
  - Implements smart grouping functionality to categorize songs based on metadata.
  - Provides a music player for seamless playback of tracks.

### Backend (shuffler-backend)
- **Technology**: Express with TypeScript and MongoDB
- **Features**:
  - Handles user authentication and playlist management.
  - Interacts with the Spotify API to fetch and manage song data.
  - Provides endpoints for the frontend to access playlist and track information.

## Getting Started

### Prerequisites
- Node.js and npm installed on your machine.
- MongoDB instance running (local or cloud).

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd music-shuffler
   ```

2. Install dependencies for the frontend:
   ```
   cd shuffler-ui
   npm install
   ```

3. Install dependencies for the backend:
   ```
   cd ../shuffler-backend
   npm install
   ```

### Running the Application

1. Start the backend server:
   ```
   cd shuffler-backend
   npm start
   ```

2. Start the frontend application:
   ```
   cd ../shuffler-ui
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000` to access the application.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.