import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { MessageSquare } from 'lucide-react';

// Pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import VerificationPending from './pages/auth/VerificationPending';
import Dashboard from './pages/dashboard/Dashboard';
import LandingPage from './pages/LandingPage';
import CommunityFeed from './pages/feed/CommunityFeed';
import Profile from './pages/profile/Profile';
import Network from './pages/network/Network';
import Mentorship from './pages/mentorship/Mentorship';
import Projects from './pages/projects/Projects';
import ProjectDetails from './pages/projects/ProjectDetails';
import ChatLayout from './pages/chat/ChatLayout';
import ChatView from './pages/chat/ChatView';

import Resources from './pages/resources/Resources';
import Opportunities from './pages/opportunities/Opportunities';
import OpportunityDetails from './pages/opportunities/OpportunityDetails';
import Events from './pages/events/Events';
import EventDetails from './pages/events/EventDetails';
import ResumeChecker from './pages/ats/ResumeChecker';

// Admin imports
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminContent from './pages/admin/AdminContent';
import AdminReports from './pages/admin/AdminReports';
import AdminEvents from './pages/admin/AdminEvents';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return null; // Or a loading spinner
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function VerifiedRoute({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user) return <Navigate to="/login" replace />;
  
  // Disable verification gate for now - allow everyone
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-center" />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            
            <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verification-pending" element={
                <ProtectedRoute>
                  <VerificationPending />
                </ProtectedRoute>
              } />
            </Route>

            {/* Protected Routes */}
            <Route element={<VerifiedRoute><DashboardLayout /></VerifiedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/feed" element={<CommunityFeed />} />
              <Route path="/profile/:userId" element={<Profile />} />
              
              <Route path="/network" element={<Network />} />
              <Route path="/mentorship" element={<Mentorship />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:projectId" element={<ProjectDetails />} />
              
              <Route path="/messages" element={<ChatLayout />}>
                <Route index element={
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-20 h-20 bg-yellow-500/10 dark:bg-yellow-400/10 rounded-full flex items-center justify-center mb-6">
                      <MessageSquare className="w-10 h-10 text-yellow-600 dark:text-yellow-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Your Messages</h2>
                    <p className="text-[var(--text-secondary)] max-w-md">
                      Select a conversation from the sidebar to continue chatting, or head to the Network page to connect with new people.
                    </p>
                  </div>
                } />
                <Route path=":chatId" element={<ChatView />} />
              </Route>
              
              <Route path="/resources" element={<Resources />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/opportunities/:id" element={<OpportunityDetails />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetails />} />
              <Route path="/ats-resume" element={<ResumeChecker />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="events" element={<AdminEvents />} />
              <Route path="content" element={<AdminContent />} />
              <Route path="reports" element={<AdminReports />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

