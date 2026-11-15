import { cookies } from "next/headers";
import { LANG_COOKIE, asLang, type Lang } from "./lang";

/** Idioma de la visita (servidor): cookie «lang»; si no hay, inglés. */
export async function getLang(): Promise<Lang> {
  return asLang((await cookies()).get(LANG_COOKIE)?.value);
}
