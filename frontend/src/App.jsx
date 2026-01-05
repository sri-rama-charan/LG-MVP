import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register'; // We need to create this
import Dashboard from './pages/Dashboard'; // Need to create
import Groups from './pages/Groups'; // Need to create
import Campaigns from './pages/Campaigns'; // Need to create
import CampaignDetails from './pages/CampaignDetails';
import Wallet from './pages/Wallet'; // Need to create
import Marketplace from './pages/Marketplace';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="groups" element={<Groups />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="campaigns/:id" element={<CampaignDetails />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="wallet" element={<Wallet />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
