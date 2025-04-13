# Music Shuffler UI

Welcome to the Music Shuffler UI project! This React application is designed to provide a re-imagined smart functionality for music players, allowing users to group songs in a given playlist into subsets based on track metadata such as genre, beat, or tempo, as well as additional factors like artist or language. The goal is to maintain the "vibe" of the music experience.

## Features

- **Smart Grouping**: Automatically groups songs based on various metadata attributes to enhance the listening experience.
- **User Authentication**: Secure login and authentication using Spotify API.
- **Dynamic Playlist Management**: View and manage playlists seamlessly.
- **Responsive Design**: A user-friendly interface that works on various devices.

## Project Structure

The project is organized as follows:

```
shuffler-ui/
├── public/
│   ├── index.html          # Main HTML file for the React application
│   ├── favicon.ico         # Favicon for the application
│   └── manifest.json       # Metadata about the web application
├── src/
│   ├── api/                # API interaction logic
│   ├── components/         # React components for the UI
│   ├── context/            # Context providers for state management
│   ├── hooks/              # Custom hooks for reusable logic
│   ├── types/              # TypeScript types for the application
│   ├── utils/              # Utility functions for various tasks
│   ├── index.tsx           # Entry point for the React application
│   └── styles.css          # CSS styles for the application
├── package.json             # Dependencies and scripts for the React application
└── tsconfig.json            # TypeScript configuration file
```

## Getting Started

To get started with the Music Shuffler UI, follow these steps:

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd music-shuffler/shuffler-ui
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Run the application**:
   ```
   npm start
   ```

4. **Open your browser** and navigate to `http://localhost:3000` to view the application.

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.