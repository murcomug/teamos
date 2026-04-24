/**
 * useCurrentUser — unified auth hook.
 *
 * Resolves both Base44 native auth (admins via Google/email) and TeamMember
 * session (operators/admins stored in localStorage by teamMemberAuth) into
 * a single normalised user shape.
 *
 * Role is exactly 'admin' | 'operator'. All permission flags derive from role.
 */

import { useAuth } from "./AuthContext";
import { useMemberSession } from "./MemberSessionContext";

export function useCurrentUser() {
  const { user: adminUser, isAuthenticated, isLoadingAuth, logout: adminLogout } = useAuth();
  const { memberSession, loading: memberLoading, logout: memberLogout } = useMemberSession();

  const loading = isLoadingAuth || memberLoading;

  let currentUser = null;
  let source = null; // "member" | "base44"

  if (memberSession && memberSession.id) {
    // Member logged in via teamMemberAuth (email+password)
    const role = memberSession.role === "admin" ? "admin" : "operator";
    currentUser = {
      id: memberSession.id,
      name: memberSession.name,
      email: memberSession.email,
      role,
      department: memberSession.department || null,
      avatar_color: memberSession.avatar_color || null,
      whatsapp: memberSession.whatsapp || null,
    };
    source = "member";
  } else if (isAuthenticated && adminUser) {
    // User authenticated via Base44 native auth (Google / magic link)
    // Base44-authenticated users always get admin role in TeamOS
    currentUser = {
      id: adminUser.id,
      name: adminUser.full_name || adminUser.email,
      email: adminUser.email,
      role: "admin",
      department: adminUser.department || null,
      avatar_color: null,
      whatsapp: null,
    };
    source = "base44";
  }

  // All permission flags derived purely from role
  const isAdmin = currentUser?.role === "admin";
  const isOperator = currentUser?.role === "operator";

  const flags = {
    isAdmin,
    isOperator,
    canViewAllTasks: true,             // both roles can view tasks
    canManageTeam: isAdmin,            // read-only for operators
    canManageDepartments: isAdmin,     // read-only for operators
    canViewReports: true,              // both roles
    canAccessSalesERP: true,           // both roles
    canViewAuditLog: isAdmin,
    canViewApprovals: isAdmin,
    canInitiateApprovals: isAdmin,
    canManageSettings: isAdmin,
    canManageAgents: isAdmin,
  };

  const logout = () => {
    if (source === "member") {
      memberLogout();
    } else {
      adminLogout();
    }
  };

  return {
    currentUser,
    loading,
    isAuthenticated: !!currentUser,
    source,
    logout,
    ...flags,
  };
}