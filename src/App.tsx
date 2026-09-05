import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import CookieConsent from "@/components/CookieConsent";
import AiChatbot from "@/components/AiChatbot";
import RouteSeo from "@/components/RouteSeo";

/** Landing + auth stay eager for first paint / login funnel. */
import Index from "./pages/Index.tsx";
import AuthPage from "./pages/AuthPage.tsx";

const ProfileSetup = lazy(() => import("./pages/ProfileSetup.tsx"));
const EditProfile = lazy(() => import("./pages/EditProfile.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Discover = lazy(() => import("./pages/Discover.tsx"));
const Messages = lazy(() => import("./pages/Messages.tsx"));
const Notifications = lazy(() => import("./pages/Notifications.tsx"));
const Stories = lazy(() => import("./pages/Stories.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Events = lazy(() => import("./pages/Events.tsx"));
const DatingCoach = lazy(() => import("./pages/DatingCoach.tsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.tsx"));
const SpeedDating = lazy(() => import("./pages/SpeedDating.tsx"));
const LikedMe = lazy(() => import("./pages/LikedMe.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const NearbyMap = lazy(() => import("./pages/NearbyMap.tsx"));
const Premium = lazy(() => import("./pages/Premium.tsx"));
const PremiumCallback = lazy(() => import("./pages/PremiumCallback.tsx"));
const VerificationPage = lazy(() => import("./pages/Verification.tsx"));
const PrivacyPage = lazy(() => import("./pages/legal/PrivacyPage.tsx"));
const TermsPage = lazy(() => import("./pages/legal/TermsPage.tsx"));
const FAQPage = lazy(() => import("./pages/legal/FAQPage.tsx"));
const ContactPage = lazy(() => import("./pages/legal/ContactPage.tsx"));

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard.tsx"));
const AdminUsers = lazy(() => import("./pages/admin/Users.tsx"));
const AdminReports = lazy(() => import("./pages/admin/Reports.tsx"));
const AdminVerifications = lazy(() => import("./pages/admin/Verifications.tsx"));
const AdminSubscriptions = lazy(() => import("./pages/admin/Subscriptions.tsx"));
const AdminPayments = lazy(() => import("./pages/admin/Payments.tsx"));
const AdminModeration = lazy(() => import("./pages/admin/Moderation.tsx"));
const AdminEvents = lazy(() => import("./pages/admin/Events.tsx"));
const AdminNotifications = lazy(() => import("./pages/admin/Notifications.tsx"));
const AdminAI = lazy(() => import("./pages/admin/AI.tsx"));
const AdminAdmins = lazy(() => import("./pages/admin/Admins.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RouteSeo />
          <Suspense fallback={<RouteFallback />}>
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
              <Route path="/verification" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />

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
          </Suspense>
          <AiChatbot />
          <CookieConsent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
