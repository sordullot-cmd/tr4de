import { redirect } from "next/navigation";

// Server-side redirect : la racine n'a pas à exécuter du JS pour rediriger.
// /login se chargera de renvoyer vers /dashboard si l'utilisateur est déjà
// authentifié (auth check côté client là-bas).
export default function Page() {
  redirect("/login");
}
