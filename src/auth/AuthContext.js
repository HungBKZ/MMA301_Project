import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

// Lightweight AuthContext that restores a persisted session from SecureStore.
// This lets legacy components that call `useAuth()` keep working while
// the app transitions to passing userId via navigation or a central auth flow.

const AuthContext = createContext({ user: null, loading: true, login: async () => {}, logout: async () => {} });

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync('currentUser');
        if (raw) setUser(JSON.parse(raw));
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (u) => {
    try {
      setUser(u);
      await SecureStore.setItemAsync('currentUser', JSON.stringify(u));
    } catch (e) {
      console.warn('AuthProvider: failed to persist user', e);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      await SecureStore.deleteItemAsync('currentUser');
    } catch (e) {
      console.warn('AuthProvider: failed to clear user', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
