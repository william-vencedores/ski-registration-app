import { create } from "zustand";
import axios from "axios";

interface AdminUser {
  username: string;
  role: string;
}

interface AdminStore {
  token: string | null;
  user: AdminUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  token: localStorage.getItem("vencedores_admin_token"),
  user: (() => {
    try {
      const u = localStorage.getItem("vencedores_admin_user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })(),

  login: async (username, password) => {
    const { data } = await axios.post("/api/auth/login", {
      username,
      password,
    });
    localStorage.setItem("vencedores_admin_token", data.token);
    localStorage.setItem(
      "vencedores_admin_user",
      JSON.stringify({ username: data.username, role: "admin" }),
    );
    axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    set({
      token: data.token,
      user: { username: data.username, role: "admin" },
    });
  },

  logout: () => {
    localStorage.removeItem("vencedores_admin_token");
    localStorage.removeItem("vencedores_admin_user");
    delete axios.defaults.headers.common["Authorization"];
    set({ token: null, user: null });
  },

  isAuthenticated: () => {
    const token = get().token;
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp * 1000 < Date.now()) {
        get().logout();
        return false;
      }
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      return true;
    } catch {
      return false;
    }
  },
}));
