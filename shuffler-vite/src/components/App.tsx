import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './Dashboard';
import Player from './Player';
import { AuthProvider } from '../context/AuthContext';
import { PlayerProvider } from '../context/PlayerContext';
import Login from './Login';
import Callback from './Callback';
import PlaylistDetail from './PlaylistDetail';


import '../styles/global.css';

const App: React.FC = () => {
    return (
        <AuthProvider>
            <PlayerProvider>
                <Router>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/player" element={<Player />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/callback" element={<Callback />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/playlist/:id" element={<PlaylistDetail />} />
                    </Routes>
                </Router>
            </PlayerProvider>
        </AuthProvider>
    );
};

export default App;