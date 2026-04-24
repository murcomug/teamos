import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { MemberSessionProvider, useMemberSession } from '@/lib/MemberSessionContext';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import AgentChat from './pages/AgentChat';
import Tasks from './pages/Tasks';
import SupportTickets from './pages/SupportTickets';
import Team from './pages/Team';
import Departments from './pages/Departments';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import CompletedItems from './pages/CompletedItems';
import ActivityLog from './pages/ActivityLog';
import MemberLogin from './pages/MemberLogin';
import SalesERP from './pages/SalesERP';
import AgentManagement from './pages/AgentManagement';
import Approvals from './pages/Approvals';

const AdminApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const { memberSession } = useMemberSession();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // If an operator is logged in via member session, show the app
      if (memberSession) {
        return (
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chat" element={<AgentChat />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/support-tickets" element={<SupportTickets />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/completed-items" element={<CompletedItems />} />
              <Route path="/sales-erp" element={<SalesERP />} />
              <Route path="/approvals" element={<Approvals />} />
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        );
      }
      // No session at all — redirect to unified login
      return <Navigate to="/member-login" replace />;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chat" element={<AgentChat />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/support-tickets" element={<SupportTickets />} />
        <Route path="/team" element={<Team />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/completed-items" element={<CompletedItems />} />
        <Route path="/activity-log" element={<ActivityLog />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/sales-erp" element={<SalesERP />} />
        <Route path="/agent-management" element={<AgentManagement />} />
        <Route path="/approvals" element={<Approvals />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <MemberSessionProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <Routes>
              {/* Operator login — stays as dedicated entry point */}
              <Route path="/member-login" element={<MemberLogin />} />

              {/* Legacy member-* redirects → unified routes */}
              <Route path="/member-portal" element={<Navigate to="/" replace />} />
              <Route path="/member-tasks" element={<Navigate to="/tasks" replace />} />
              <Route path="/member-chat" element={<Navigate to="/chat" replace />} />
              <Route path="/member-support-tickets" element={<Navigate to="/support-tickets" replace />} />
              <Route path="/member-notifications" element={<Navigate to="/notifications" replace />} />
              <Route path="/member-reports" element={<Navigate to="/reports" replace />} />
              <Route path="/member-completed" element={<Navigate to="/completed-items" replace />} />
              <Route path="/member-departments" element={<Navigate to="/departments" replace />} />
              <Route path="/member-team" element={<Navigate to="/team" replace />} />
              <Route path="/member-erp" element={<Navigate to="/sales-erp" replace />} />

              {/* All authenticated routes — handled by AdminApp which checks both auth systems */}
              <Route path="*" element={<AdminApp />} />
            </Routes>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </MemberSessionProvider>
    </AuthProvider>
  )
}

export default App