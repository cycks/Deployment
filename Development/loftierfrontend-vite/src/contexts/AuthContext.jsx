// src/contexts/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../libs/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // --------------------------------------------------------
  // INITIAL STATE
  // --------------------------------------------------------
  const savedToken = localStorage.getItem("jwt_token");
  const savedUser = localStorage.getItem("user");

  const [token, setToken] = useState(savedToken || null);
  const [user, setUser] = useState(savedUser ? JSON.parse(savedUser) : null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!savedToken);
  const [isLoading, setIsLoading] = useState(true);

  // Apply token immediately on first load to the axios instance
  if (savedToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
  }

  // --------------------------------------------------------
  // LOGOUT
  // --------------------------------------------------------
  const logout = useCallback((reason = null) => {
    console.log("🔄 LOGGING OUT:", reason);

    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user");

    delete api.defaults.headers.common["Authorization"];

    setToken(null);
    setUser(null);
    setIsAuthenticated(false);

    if (reason === "expired") {
      sessionStorage.setItem(
        "auth_message",
        "Your session expired. Please log in again."
      );
    }

    // Hard redirect to clear all stale application state
    window.location.replace("/login");
  }, []);

  // --------------------------------------------------------
  // GOOGLE LOGOUT
  // --------------------------------------------------------
  const logoutGoogle = useCallback(async () => {
    try {
      const jwt = localStorage.getItem("jwt_token");
      if (jwt) {
        await api.post("/auth/google_logout", {}, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
      }
    } catch (err) {
      console.warn("⚠️ Google logout failed:", err);
    } finally {
      logout();
    }
  }, [logout]);

  // --------------------------------------------------------
  // APPLY TOKEN (localStorage + Axios)
  // --------------------------------------------------------
  const applyToken = useCallback((jwtToken) => {
    if (!jwtToken) return;

    localStorage.setItem("jwt_token", jwtToken);
    setToken(jwtToken);

    api.defaults.headers.common["Authorization"] = `Bearer ${jwtToken}`;
  }, []);

  // --------------------------------------------------------
  // APPLY USER
  // --------------------------------------------------------
  const applyUser = useCallback((userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  // --------------------------------------------------------
  // LOGIN (manual email/password)
  // --------------------------------------------------------
  const login = useCallback(
    (jwtToken, userData) => {
      applyToken(jwtToken);
      applyUser(userData);
    },
    [applyToken, applyUser]
  );

  // --------------------------------------------------------
  // FETCH USER PROFILE
  // --------------------------------------------------------
  const fetchUser = useCallback(
    async (jwtToken = null) => {
      try {
        if (jwtToken) {
          applyToken(jwtToken);
        }

        const res = await api.get("/auth/user/me");
        applyUser(res.data);
        return res.data;
      } catch (err) {
        console.error("❌ Failed to fetch user:", err);

        const skipOnce = sessionStorage.getItem("skipLogoutOnce");
        if (skipOnce) {
          sessionStorage.removeItem("skipLogoutOnce");
          return null;
        }

        // MODIFIED: Only logout automatically on 401 (Session Expired)
        // We do NOT logout on 403 here because the user might just lack 
        // specific permissions for this endpoint but still have a valid session.
        if (err.response && err.response.status === 401) {
          logout("expired");
        }

        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [applyToken, applyUser, logout]
  );

  // --------------------------------------------------------
  // RESTORE SESSION ON APP LOAD
  // --------------------------------------------------------
  useEffect(() => {
    const restoreSession = async () => {
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        await fetchUser(savedToken);
      } catch {
        // Error handling logic is inside fetchUser
      }
    };

    restoreSession();

    return () => {
      delete api.defaults.headers.common["Authorization"];
    };
  }, [savedToken, fetchUser]);

  // --------------------------------------------------------
  // GLOBAL RESPONSE INTERCEPTOR
  // --------------------------------------------------------
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (res) => res,
      (error) => {
        const status = error?.response?.status;

        const skipOnce = sessionStorage.getItem("skipLogoutOnce");
        if (skipOnce) {
          sessionStorage.removeItem("skipLogoutOnce");
          return Promise.reject(error);
        }

        // FIX: Distinguish between 401 and 403
        // 401 (Unauthorized) = Token expired/invalid -> Needs Logout
        // 403 (Forbidden)    = Valid token but no permission -> Keep Session
        if (status === 401) {
          if (isAuthenticated) {
            logout("expired");
          }
        }

        // If status is 403, we do nothing here, 
        // allowing the component (e.g., EditBlogPost) to catch the error and show a toast.
        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptor);
  }, [isAuthenticated, logout]);

  // --------------------------------------------------------
  // CONTEXT VALUE
  // --------------------------------------------------------
  const value = {
    token,
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    logoutGoogle,
    fetchUser,
    applyToken,
    applyUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {isLoading ? (
        <div className="d-flex justify-content-center align-items-center vh-100">
           {/* You can replace this with a proper Spinner component */}
           <p>Loading authentication...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);