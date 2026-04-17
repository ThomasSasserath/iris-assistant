"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import ChatInterface from "@/components/ChatInterface";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("iris_current_user");
    if (stored === "thomas" || stored === "beate") {
      setUser(stored as User);
    } else {
      router.replace("/");
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("iris_current_user");
    router.push("/");
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-iris-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return <ChatInterface user={user} onLogout={handleLogout} />;
}
