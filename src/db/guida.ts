import type {
  Contatto,
  ContattoTipo,
  Guida,
  Lang,
  Regola,
  SectionType,
  Sezione,
  Translated,
  VoceChecklist,
} from "@/content/types";
import type { Tenant } from "@/tenants/types";
import { sql } from "./client";

interface RigaTraduzione {
  chiave: string;
  lingua_codice: string;
  testo: string;
}

/** Trasforma righe (chiave, lingua, testo) in oggetti tradotti. */
function raggruppaTraduzioni(righe: RigaTraduzione[]): Map<string, Translated> {
  const mappa = new Map<string, Translated>();
  for (const riga of righe) {
    const corrente = mappa.get(riga.chiave) ?? ({} as Translated);
    corrente[riga.lingua_codice as Lang] = riga.testo;
    mappa.set(riga.chiave, corrente);
  }
  return mappa;
}

/**
 * Carica una struttura completa (brand + guida) dal database.
 * Restituisce null se lo slug non esiste o la struttura non è attiva.
 */
export async function caricaTenant(slug: string): Promise<Tenant | null> {
  const db = sql();

  const [struttura] = await db<
    {
      id: string;
      nome: string;
      indirizzo: string;
      citta: string;
      cin: string | null;
      maps_url: string | null;
      slug: string;
      tipografia: string;
      brand: Record<string, unknown>;
    }[]
  >`
    select id, nome, indirizzo, citta, cin, maps_url, slug, tipografia, brand
    from strutture
    where slug = ${slug} and attiva = true
    limit 1
  `;

  if (!struttura) return null;

  const [unita] = await db<
    {
      id: string;
      nome: string;
      camere: number | null;
      bagni: number | null;
      ospiti_max: number | null;
      orario_checkin: string;
      orario_checkout: string;
    }[]
  >`
    select id, nome, camere, bagni, ospiti_max, orario_checkin, orario_checkout
    from unita
    where struttura_id = ${struttura.id}
    order by creato_il
    limit 1
  `;

  if (!unita) return null;

  const [lingue, sezioni, regole, wifi, steps, contatti, vociCheckout] =
    await Promise.all([
      db<{ lingua_codice: string; predefinita: boolean }[]>`
        select lingua_codice, predefinita from strutture_lingue
        where struttura_id = ${struttura.id}
        order by lingua_codice
      `,
      db<
        { tipo: string; attiva: boolean; ordine: number; chiave: string; lingua_codice: string; testo: string }[]
      >`
        select s.tipo, s.attiva, s.ordine,
               s.tipo as chiave, c.lingua_codice, c.titolo as testo
        from guida_sezioni s
        join guida_contenuti c on c.sezione_id = s.id
        where s.unita_id = ${unita.id}
        order by s.ordine
      `,
      db<{ chiave: string; numero: number; lingua_codice: string; testo: string }[]>`
        select r.numero::text as chiave, r.numero, t.lingua_codice, t.testo
        from regole r
        join regole_traduzioni t on t.regola_id = r.id
        where r.unita_id = ${unita.id}
        order by r.numero
      `,
      db<{ rete: string; password: string }[]>`
        select rete, password from wifi where unita_id = ${unita.id} limit 1
      `,
      db<{ chiave: string; numero: number; foto_url: string | null; lingua_codice: string; testo: string }[]>`
        select s.numero::text as chiave, s.numero, s.foto_url, t.lingua_codice, t.titolo as testo
        from checkin_steps s
        join checkin_steps_traduzioni t on t.step_id = s.id
        where s.unita_id = ${unita.id}
        order by s.numero
      `,
      db<
        {
          tipo: string;
          nome: string | null;
          valore: string | null;
          visualizzato: string | null;
          indirizzo: string | null;
          maps_url: string | null;
          visibile_in: string;
          ordine: number;
          da_confermare: boolean;
          etichetta: string;
        }[]
      >`
        select tipo, nome, valore, visualizzato, indirizzo, maps_url,
               visibile_in, ordine, da_confermare, etichetta
        from contatti_emergenza
        where unita_id = ${unita.id}
        order by ordine, tipo
      `,
      db<{ chiave: string; ordine: number; lingua_codice: string; testo: string }[]>`
        select v.chiave, v.ordine, t.lingua_codice, t.testo
        from checkout_voci v
        join checkout_voci_traduzioni t on t.voce_id = v.id
        where v.unita_id = ${unita.id} and v.attiva = true
        order by v.ordine
      `,
    ]);

  const titoliSezione = raggruppaTraduzioni(sezioni);
  const sezioniUniche = new Map<string, Sezione>();
  for (const riga of sezioni) {
    if (sezioniUniche.has(riga.tipo)) continue;
    sezioniUniche.set(riga.tipo, {
      tipo: riga.tipo as SectionType,
      attiva: riga.attiva,
      ordine: riga.ordine,
      titolo: titoliSezione.get(riga.tipo) as Translated,
    });
  }

  const testiRegole = raggruppaTraduzioni(regole);
  const regoleUniche: Regola[] = [
    ...new Map(regole.map((r) => [r.numero, r])).values(),
  ].map((r) => ({
    numero: r.numero,
    testo: testiRegole.get(String(r.numero)) as Translated,
  }));

  const titoliStep = raggruppaTraduzioni(steps);
  const stepsUnici = [
    ...new Map(steps.map((s) => [s.numero, s])).values(),
  ].map((s) => ({
    numero: s.numero,
    titolo: titoliStep.get(String(s.numero)) as Translated,
    foto: s.foto_url ?? undefined,
  }));

  const testiVoci = raggruppaTraduzioni(vociCheckout);
  const vociUniche: VoceChecklist[] = [
    ...new Map(vociCheckout.map((v) => [v.chiave, v])).values(),
  ].map((v) => ({
    chiave: v.chiave,
    testo: testiVoci.get(v.chiave) as Translated,
  }));

  // Le etichette dei contatti sono già tradotte nella colonna etichetta come
  // JSON: sono testi brevi e fissi, non meritano una tabella dedicata.
  const contattiMappati: Contatto[] = contatti.map((c) => ({
    tipo: c.tipo.toLowerCase() as ContattoTipo,
    etichetta: JSON.parse(c.etichetta) as Translated,
    nome: c.nome ?? undefined,
    valore: c.valore ?? "",
    visualizzato: c.visualizzato ?? "",
    indirizzo: c.indirizzo ?? undefined,
    mapsUrl: c.maps_url ?? undefined,
    visibileIn: c.visibile_in.toLowerCase() as Contatto["visibileIn"],
    ordine: c.ordine,
    daConfermare: c.da_confermare,
  }));

  const guida: Guida = {
    struttura: {
      nome: struttura.nome,
      indirizzo: struttura.indirizzo,
      citta: struttura.citta,
      cin: struttura.cin ?? "",
      mapsUrl: struttura.maps_url ?? "",
    },
    unita: {
      nome: unita.nome,
      camere: unita.camere ?? 0,
      bagni: unita.bagni ?? 0,
      ospitiMax: unita.ospiti_max ?? 0,
    },
    sezioni: [...sezioniUniche.values()],
    checkin: { orario: unita.orario_checkin, steps: stepsUnici },
    wifi: wifi[0] ?? { rete: "", password: "" },
    regole: regoleUniche,
    checkout: { orario: unita.orario_checkout, checklist: vociUniche },
    contatti: contattiMappati,
  };

  const brand = struttura.brand as unknown as Tenant["brand"];

  return {
    slug: struttura.slug,
    lingue: lingue.map((l) => l.lingua_codice as Lang),
    linguaPredefinita:
      (lingue.find((l) => l.predefinita)?.lingua_codice as Lang) ?? "it",
    brand: { ...brand, tipografia: struttura.tipografia as Tenant["brand"]["tipografia"] },
    guida,
  };
}

/** Slug della struttura associata a un host (dominio proprio o sottodominio). */
export async function slugDaDominio(host: string): Promise<string | null> {
  const db = sql();
  const [riga] = await db<{ slug: string }[]>`
    select s.slug
    from domini d
    join strutture s on s.id = d.struttura_id
    where d.host = ${host.toLowerCase()} and s.attiva = true
    limit 1
  `;
  return riga?.slug ?? null;
}
