"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { Spinner } from "@/components/UIComponents";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Wraps any page that requires authentication.
 * If no token is found, redirects to /login immediately.
 * Shows a spinner while checking auth state (prevents flash).
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto mb-4 h-8 w-8" />
          <p className="text-sm text-[#555]">Verifying session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
