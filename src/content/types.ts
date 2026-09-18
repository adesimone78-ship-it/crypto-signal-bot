/**
 * Modello dati della guida ospite.
 *
 * I tipi rispecchiano 1:1 le tabelle progettate in FASE H (strutture, unita,
 * guida_sezioni, guida_contenuti, regole, contatti_emergenza, ...).
 * In questa fase i dati arrivano da un file TypeScript; nello STEP 8 la stessa
 * interfaccia verrà servita da Supabase senza modificare i componenti.
 */

export const LANGS = ["it", "en", "fr", "de"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "it";

/** Testo tradotto: una voce per lingua (tabella guida_contenuti). */
export type Translated = Record<Lang, string>;

/** Tipi di sezione previsti (enum tipo_sezione). */
export type SectionType =
  | "checkin"
  | "wifi"
  | "regole"
  | "posizione"
  | "guida_locale"
  | "info_pratiche"
  | "emergenza"
  | "checkout"
  | "contatti";

export interface Struttura {
  nome: string;
  indirizzo: string;
  citta: string;
  cin: string;
  mapsUrl: string;
}

export interface Unita {
  nome: string;
  camere: number;
  bagni: number;
  ospitiMax: number;
}

export interface Regola {
  numero: number;
  testo: Translated;
}

export interface CheckinStep {
  numero: number;
  titolo: Translated;
  /** Percorso immagine; assente finché l'host non fornisce le foto. */
  foto?: string;
}

export type ContattoTipo =
  | "whatsapp"
  | "telefono_urgenze"
  | "numero_emergenza"
  | "ospedale"
  | "farmacia"
  | "farmacia_turno"
  | "altro";

export interface Contatto {
  tipo: ContattoTipo;
  etichetta: Translated;
  /** Nome proprio del luogo, quando ne ha uno (ospedale, farmacia). */
  nome?: string;
  /** Numero di telefono in formato internazionale senza spazi. */
  valore: string;
  /** Come mostrarlo all'ospite. */
  visualizzato: string;
  /** Indirizzo civico: non si traduce, è un dato. */
  indirizzo?: string;
  /** Link alle mappe, per arrivarci con un tocco. */
  mapsUrl?: string;
  visibileIn: "emergenza" | "contatti" | "entrambi";
  /** Ordine di comparsa nella sezione emergenza. */
  ordine?: number;
  /** Voce ancora da confermare dall'host: mostrata come segnaposto. */
  daConfermare?: boolean;
}

export interface VoceChecklist {
  chiave: string;
  testo: Translated;
}

/** Sezione della guida (tabella guida_sezioni). */
export interface Sezione {
  tipo: SectionType;
  attiva: boolean;
  ordine: number;
  titolo: Translated;
}

export interface Guida {
  struttura: Struttura;
  unita: Unita;
  sezioni: Sezione[];
  checkin: {
    orario: string;
    steps: CheckinStep[];
    note?: Translated;
  };
  wifi: {
    rete: string;
    password: string;
  };
  regole: Regola[];
  checkout: {
    orario: string;
    checklist: VoceChecklist[];
    note?: Translated;
  };
  contatti: Contatto[];
}
