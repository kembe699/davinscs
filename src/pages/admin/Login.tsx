import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useLayout } from "@/contexts/LayoutContext";

const Login = () => {
  const { login } = useAuth();
  const { logo, companyName } = useLayout();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotError, setForgotError] = useState("");

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotMsg("");
    setForgotLoading(true);
    try {
      const { message } = await api.auth.forgotPassword(forgotEmail);
      setForgotMsg(message);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await api.auth.login(email, password);
      login(token, user);
      navigate("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          {logo
            ? <img src={logo} alt={companyName || "Logo"} className="h-28 mx-auto mb-4 object-contain" />
            : <p className="text-3xl font-black text-foreground tracking-widest uppercase mb-4">{companyName}</p>
          }
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase">CMS Admin Portal</p>
        </div>

        {showForgot ? (
          <div className="border border-border-subtle p-8 space-y-5 bg-chassis">
            <h1 className="text-lg font-bold text-foreground tracking-tight">Reset Password</h1>
            <p className="text-xs text-muted-foreground">Enter your email and we'll send a reset link.</p>

            {forgotError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech">
                {forgotError}
              </div>
            )}
            {forgotMsg && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-4 py-3 font-mono-tech">
                {forgotMsg}
              </div>
            )}

            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="admin@flippedpos.com"
                  className="w-full h-11 bg-background border border-border-subtle px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full h-12 bg-primary text-background font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {forgotLoading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>

            <button
              onClick={() => { setShowForgot(false); setForgotMsg(""); setForgotError(""); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              ← Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="border border-border-subtle p-8 space-y-5 bg-chassis">
            <h1 className="text-lg font-bold text-foreground tracking-tight">Sign In</h1>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech">
                {error}
              </div>
            )}

            <div>
              <label className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest block mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@flippedpos.com"
                className="w-full h-11 bg-background border border-border-subtle px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="font-mono-tech text-[10px] text-primary hover:text-primary/80 uppercase tracking-widest transition-colors"
                >
                  Forgot?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 bg-background border border-border-subtle px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-background font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
