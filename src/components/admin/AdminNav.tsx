import Link from "next/link";
import AdminLogoutButton from "./AdminLogoutButton";

export default function AdminNav() {
  return (
    <div className="flex items-center gap-4 flex-wrap text-sm">
      <Link href="/admin" className="underline">
        À valider
      </Link>
      <Link href="/admin/publiees" className="underline">
        Offres publiées
      </Link>
      <Link href="/admin/statistiques" className="underline">
        Statistiques
      </Link>
      <Link href="/admin/villes" className="underline">
        Villes et bornes
      </Link>
      <AdminLogoutButton />
    </div>
  );
}
