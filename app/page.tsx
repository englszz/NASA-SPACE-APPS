import { cookies } from "next/headers";
import HomeView from "./HomeView";
import { FIRST_VISIT_COOKIE } from "@/lib/conuco-local";

export default async function Home() {
  // Primera visita: entra directo con la animación del granero hacia el mapa
  const visited = (await cookies()).has(FIRST_VISIT_COOKIE);
  return <HomeView intro={!visited} />;
}
