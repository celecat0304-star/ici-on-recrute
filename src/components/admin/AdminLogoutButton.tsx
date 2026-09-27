"use client";

export default function AdminLogoutButton() {
  const deconnexion = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <button onClick={deconnexion} className="text-sm underline opacity-70">
      Se déconnecter
    </button>
  );
}
