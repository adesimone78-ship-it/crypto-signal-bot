import type { Guida, Lang } from "@/content/types";

/** Coppie tipografiche disponibili (classi in globals.css). */
export type PresetTipografico = "classico" | "moderno";

/** Tutto ciò che cambia da una struttura all'altra a livello visivo. */
export interface Brand {
  /** Colori applicati come custom properties CSS a runtime. */
  colori: {
    carta: string;
    superficie: string;
    inchiostro: string;
    inchiostroSoft: string;
    linea: string;
    primario: string;
    primarioScuro: string;
    primarioChiaro: string;
    accento: string;
    urgenza: string;
  };
  tipografia: PresetTipografico;
  /** Come si presenta il marchio in cima alla guida. */
  logo:
    | { tipo: "marchio-casa" }
    | { tipo: "iniziali"; iniziali: string }
    | {
        tipo: "immagine";
        url: string;
        alt: string;
        /** Larghezza massima in pixel sullo schermo (il file può essere più grande). */
        larghezza?: number;
        /**
         * Il logo contiene già il nome della struttura: in quel caso il nome
         * non va ripetuto sotto, resta solo per lettori di schermo e motori
         * di ricerca. Molti loghi sono invece solo un simbolo, e lì il nome
         * scritto serve.
         */
        contieneNome?: boolean;
      };
  /** Spaziatura delle lettere del nome struttura (i nomi lunghi ne vogliono meno). */
  nomeSpaziato?: boolean;
}

/**
 * Un tenant = una struttura ricettiva servita dall'applicazione.
 * Raggiungibile da <slug>.dominio-principale oppure da un dominio proprio.
 */
export interface Tenant {
  slug: string;
  dominiPersonalizzati?: string[];
  lingue: Lang[];
  linguaPredefinita: Lang;
  brand: Brand;
  guida: Guida;
}
