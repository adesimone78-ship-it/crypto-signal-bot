import { casaMary as guidaCasaMary } from "@/content/casa-mary";
import type { Tenant } from "./types";

/**
 * Casa di Mary — prima struttura, e riferimento di stile del prodotto.
 * Colori e tipografia presi dai materiali reali: poster "Regole della casa"
 * (teal dei numeri, tan della casetta, serif del logo) e sito lacasadimary.it.
 */
export const tenantCasaMary: Tenant = {
  slug: "casa-mary",
  dominiPersonalizzati: ["guida.lacasadimary.it"],
  lingue: ["it", "en", "fr", "de"],
  linguaPredefinita: "it",
  brand: {
    colori: {
      carta: "#fdfbf8",
      superficie: "#ffffff",
      inchiostro: "#20262a",
      inchiostroSoft: "#6e7478",
      linea: "#e7e2d9",
      primario: "#6e97a0",
      primarioScuro: "#527178",
      primarioChiaro: "#eef3f3",
      accento: "#c6a175",
      urgenza: "#97382c",
    },
    tipografia: "classico",
    logo: {
      tipo: "immagine",
      url: "/strutture/casa-mary/logo.png",
      alt: "Casa di Mary — Luxury Apartment",
      larghezza: 200,
      contieneNome: true,
    },
    nomeSpaziato: true,
  },
  guida: guidaCasaMary,
};
