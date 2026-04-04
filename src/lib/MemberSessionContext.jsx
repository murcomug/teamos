import React, { createContext, useContext, useState, useEffect } from 'react';

const MemberSessionContext = createContext();

export const MemberSessionProvider = ({ children }) => {
  const [memberSession, setMemberSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("memberSession");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.id && parsed.email && parsed.name) {
          setMemberSession(parsed);
        } else {
          localStorage.removeItem("memberSession");
        }
      } catch {
        localStorage.removeItem("memberSession");
      }
    }
    setLoading(false);
  }, []);

  const login = (member) => {
    localStorage.setItem("memberSession", JSON.stringify(member));
    setMemberSession(member);
  };

  const logout = () => {
    localStorage.removeItem("memberSession");
    setMemberSession(null);
  };

  return (
    <MemberSessionContext.Provider value={{ memberSession, login, logout, loading }}>
      {children}
    </MemberSessionContext.Provider>
  );
};

export const useMemberSession = () => {
  const context = useContext(MemberSessionContext);
  if (!context) {
    throw new Error('useMemberSession must be used within MemberSessionProvider');
  }
  return context;
};