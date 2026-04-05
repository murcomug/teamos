import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { MemberSessionProvider } from '@/lib/MemberSessionContext';
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
import MemberPortal from './pages/MemberPortal';
import MemberDashboard from './pages/MemberDashboard';
import MemberTasks from './pages/MemberTasks';
import MemberSupportTickets from './pages/MemberSupportTickets';
import MemberCompletedItems from './pages/MemberCompletedItems';
import MemberNotifications from './pages/MemberNotifications';
import MemberChatContent from './pages/MemberChat';
import MemberTeamContent from './pages/MemberTeam';
import MemberDepartmentsContent from './pages/MemberDepartments';
import MemberReportsContent from './pages/MemberReports';
import MemberERP from './pages/MemberERP';
import SalesERP from './pages/SalesERP';
import AgentManagement from './pages/AgentManagement';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
      navigateToLogin();
      return null;
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
              <Route path="/member-login" element={<MemberLogin />} />
              <Route element={<MemberPortal />}>
                <Route path="/member-portal" element={<MemberDashboard />} />
                <Route path="/member-tasks" element={<MemberTasks />} />
                <Route path="/member-support-tickets" element={<MemberSupportTickets />} />
                <Route path="/member-completed" element={<MemberCompletedItems />} />
                <Route path="/member-notifications" element={<MemberNotifications />} />
                <Route path="/member-chat" element={<MemberChatContent />} />
                <Route path="/member-team" element={<MemberTeamContent />} />
                <Route path="/member-departments" element={<MemberDepartmentsContent />} />
                <Route path="/member-reports" element={<MemberReportsContent />} />
                <Route path="/member-erp" element={<MemberERP />} />
              </Route>
              <Route path="*" element={<AuthenticatedApp />} />
            </Routes>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </MemberSessionProvider>
    </AuthProvider>
  )
}

export default App