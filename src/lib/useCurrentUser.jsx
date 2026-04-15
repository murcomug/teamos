/**
 * useCurrentUser — unified auth hook.
 *
 * Resolves both Base44 native auth (admins) and TeamMember session
 * (operators stored in localStorage by teamMemberAuth) into a single
 * normalised user shape:
 *   { id, name, email, role, department, permissions[], avatar_color }
 *
 * Permission flags exposed:
 *   isAdmin              – role === "admin"
 *   isOperator           – role === "operator"
 *   canViewAllTasks      – isAdmin
 *   canManageTeam        – isAdmin
 *   canViewReports       – isAdmin || permissions includes "view_reports"
 *   canViewCompanyReports– isAdmin || permissions includes "company_wide_reports"
 *   canAccessSalesERP    – isAdmin || department === "Sales" || permissions includes "sales_erp"
 */

import { useAuth } from "./AuthContext";
import { useMemberSession } from "./MemberSessionContext";

export function useCurrentUser() {
  const { user: adminUser, isAuthenticated, isLoadingAuth, logout: adminLogout } = useAuth();
  const { memberSession, loading: memberLoading, logout: memberLogout } = useMemberSession();

  const loading = isLoadingAuth || memberLoading;

  // Determine the active session.
  // Operator session (localStorage) takes precedence when present on the
  // /member-login path or when no admin token exists.
  let currentUser = null;
  let source = null; // "admin" | "operator"

  if (memberSession && memberSession.id) {
    // Operator logged in via teamMemberAuth
    currentUser = {
      id: memberSession.id,
      name: memberSession.name,
      email: memberSession.email,
      role: memberSession.role === "admin" ? "admin" : "operator",
      department: memberSession.department || null,
      permissions: memberSession.permissions || [],
      avatar_color: memberSession.avatar_color || null,
      whatsapp: memberSession.whatsapp || null,
    };
    source = "operator";
  } else if (isAuthenticated && adminUser) {
    // Admin logged in via Base44 native auth
    currentUser = {
      id: adminUser.id,
      name: adminUser.full_name || adminUser.email,
      email: adminUser.email,
      role: "admin",
      department: adminUser.department || null,
      permissions: [],
      avatar_color: null,
      whatsapp: null,
    };
    source = "admin";
  }

  // Derived permission flags
  const isAdmin = currentUser?.role === "admin";
  const isOperator = currentUser?.role === "operator";
  const hasPermission = (perm) => isAdmin || (currentUser?.permissions || []).includes(perm);

  const flags = {
    isAdmin,
    isOperator,
    canViewAllTasks: isAdmin,
    canManageTeam: isAdmin,
    canViewReports: isAdmin || hasPermission("view_reports"),
    canViewCompanyReports: isAdmin || hasPermission("company_wide_reports"),
    canAccessSalesERP: isAdmin || currentUser?.department === "Sales" || hasPermission("sales_erp"),
    canManageSettings: isAdmin,
    canManageAgents: isAdmin,
    hasPermission,
  };

  const logout = () => {
    if (source === "operator") {
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