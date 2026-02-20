"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";

const REMEMBER_KEY = "vh_remember_email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (remember) {
      localStorage.setItem(REMEMBER_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-12 text-center">
            <div className="flex justify-center mb-6">
              <Logo className="w-80 h-auto" color="white" />
            </div>
            <div className="h-px w-16 mx-auto bg-white/30 mb-4" />
            <p className="text-xs tracking-[0.25em] uppercase text-neutral-400">
              Vehicle Handover System
            </p>
          </div>

          {/* Login card */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8">
            <h2 className="mb-6 text-base font-medium text-white">
              Sign in to your account
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-950 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-neutral-300">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500 focus-visible:ring-white/40 focus-visible:border-neutral-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-neutral-300">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500 focus-visible:ring-white/40 focus-visible:border-neutral-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-white focus:ring-white/30 accent-white"
                />
                <label
                  htmlFor="remember"
                  className="cursor-pointer select-none text-sm text-neutral-400"
                >
                  Remember me
                </label>
              </div>

              <Button
                type="submit"
                className="w-full bg-white text-black font-semibold hover:bg-neutral-200 focus-visible:ring-white/30"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-10 text-center space-y-1.5">
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Hamilton Court, Carthouse Lane, Horsell, GU21 4XS
            </p>
            <p className="text-[11px] text-neutral-500">
              Tel: 01276 473359
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
