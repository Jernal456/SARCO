import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // { id, username, role, nama_lengkap }
  const [loading, setLoading] = useState(true); // true selama session ATAU profile masih dimuat

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('users_app')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error) setProfile(data);
    else console.error('[SARCO][Auth] loadProfile error:', error);
    setLoading(false); // baru selesai loading setelah profile juga didapat
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id); // loading akan di-set false di dalam loadProfile
      } else {
        setLoading(false); // tidak ada session -> langsung selesai loading
      }
    }).catch((err) => {
      console.error('[SARCO][Auth] getSession() EXCEPTION:', err);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Login memakai "username" -> dikonversi ke email dummy internal
  // agar tetap bisa memakai Supabase Auth (email+password) tapi user
  // hanya perlu mengetik username.
  async function loginWithUsername(username, password) {
    const email = `${username.trim().toLowerCase()}@sarcovac.local`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, loginWithUsername, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
