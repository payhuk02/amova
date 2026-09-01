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
import PremiumCallback from "./pages/PremiumCallback.tsx";
import AdminRoute from "@/components/AdminRoute";
import AdminDashboard from "./pages/admin/Dashboard.tsx";
import AdminUsers from "./pages/admin/Users.tsx";
import AdminReports from "./pages/admin/Reports.tsx";
import AdminVerifications from "./pages/admin/Verifications.tsx";
import AdminSubscriptions from "./pages/admin/Subscriptions.tsx";
import AdminPayments from "./pages/admin/Payments.tsx";
import AdminModeration from "./pages/admin/Moderation.tsx";
import AdminEvents from "./pages/admin/Events.tsx";
import AdminNotifications from "./pages/admin/Notifications.tsx";
import AdminAI from "./pages/admin/AI.tsx";
import AdminAdmins from "./pages/admin/Admins.tsx";
import PrivacyPage from "./pages/legal/PrivacyPage.tsx";
import TermsPage from "./pages/legal/TermsPage.tsx";
import FAQPage from "./pages/legal/FAQPage.tsx";
import ContactPage from "./pages/legal/ContactPage.tsx";
import CookieConsent from "@/components/CookieConsent";

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
            <Route path="/confidentialite" element={<PrivacyPage />} />
            <Route path="/conditions" element={<TermsPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile-setup" element={<ProtectedRoute requireProfile={false}><ProfileSetup /></ProtectedRoute>} />
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
            <Route path="/premium/callback" element={<ProtectedRoute><PremiumCallback /></ProtectedRoute>} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/admin/admins" element={<AdminRoute><AdminAdmins /></AdminRoute>} />
            <Route path="/admin/verifications" element={<AdminRoute><AdminVerifications /></AdminRoute>} />
            <Route path="/admin/subscriptions" element={<AdminRoute><AdminSubscriptions /></AdminRoute>} />
            <Route path="/admin/payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
            <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
            <Route path="/admin/moderation" element={<AdminRoute><AdminModeration /></AdminRoute>} />
            <Route path="/admin/events" element={<AdminRoute><AdminEvents /></AdminRoute>} />
            <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
            <Route path="/admin/ai" element={<AdminRoute><AdminAI /></AdminRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieConsent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
