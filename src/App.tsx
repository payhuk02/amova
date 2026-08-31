import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import ProfileSetup from "./pages/ProfileSetup.tsx";
import EditProfile from "./pages/EditProfile.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Discover from "./pages/Discover.tsx";
import Messages from "./pages/Messages.tsx";
import Notifications from "./pages/Notifications.tsx";
import Stories from "./pages/Stories.tsx";
import NotFound from "./pages/NotFound.tsx";
import Events from "./pages/Events.tsx";
import DatingCoach from "./pages/DatingCoach.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import SpeedDating from "./pages/SpeedDating.tsx";
import LikedMe from "./pages/LikedMe.tsx";
import Settings from "./pages/Settings.tsx";
import NearbyMap from "./pages/NearbyMap.tsx";
import Premium from "./pages/Premium.tsx";
import AdminRoute from "@/components/AdminRoute";
import AdminDashboard from "./pages/admin/Dashboard.tsx";
import AdminUsers from "./pages/admin/Users.tsx";
import AdminReports from "./pages/admin/Reports.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/stories" element={<ProtectedRoute><Stories /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
            <Route path="/coach" element={<ProtectedRoute><DatingCoach /></ProtectedRoute>} />
            <Route path="/profile/:userId" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/speed-dating" element={<ProtectedRoute><SpeedDating /></ProtectedRoute>} />
            <Route path="/liked-me" element={<ProtectedRoute><LikedMe /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/nearby" element={<ProtectedRoute><NearbyMap /></ProtectedRoute>} />
            <Route path="/premium" element={<ProtectedRoute><Premium /></ProtectedRoute>} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
