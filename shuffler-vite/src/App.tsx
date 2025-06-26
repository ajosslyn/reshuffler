import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Callback from './components/Callback';
import Dashboard from './components/Dashboard';
import PlaylistDetail from './components/Playlist/PlaylistDetail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Add the new playlist detail route */}
        <Route path="/playlist/:id" element={<PlaylistDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
