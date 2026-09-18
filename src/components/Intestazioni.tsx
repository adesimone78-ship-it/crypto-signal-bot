import Link from "next/link";
import { t, type Lang } from "@/content";
import type { Tenant } from "@/tenants";
import { IconaIndietro, MarchioCasa } from "./icons";

/** Intestazione della home: marchio della struttura, nome, selettore lingua. */
export function IntestazioneBrand({
  tenant,
  lang,
  base,
}: {
  tenant: Tenant;
  lang: Lang;
  base: string;
}) {
  const { logo, nomeSpaziato } = tenant.brand;

  return (
    <header className="sticky top-0 z-10 border-b border-linea bg-carta px-5 pb-4 pt-6 text-center">
      <div className="flex justify-center text-accento">
        {logo.tipo === "marchio-casa" && <MarchioCasa />}
        {logo.tipo === "iniziali" && (
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-accento font-serif text-sm font-semibold tracking-wider">
            {logo.iniziali}
          </span>
        )}
        {logo.tipo === "immagine" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo.url}
            alt={logo.alt}
            className="h-auto w-full"
            style={{ maxWidth: logo.larghezza ?? 144 }}
          />
        )}
      </div>

      {/*
       * Il nome resta sempre nel documento: serve ai lettori di schermo e ai
       * motori di ricerca. Quando è già dentro l'immagine del logo non viene
       * mostrato una seconda volta.
       */}
      <h1
        className={
          logo.tipo === "immagine" && logo.contieneNome
            ? "sr-only"
            : `mt-2 font-serif text-base font-semibold uppercase ${
                nomeSpaziato ? "tracking-[0.22em]" : "tracking-[0.1em]"
              }`
        }
      >
        {tenant.guida.struttura.nome}
      </h1>
      <p className="mt-1 text-sm text-inchiostro-soft">{t("sottotitolo", lang)}</p>

      {tenant.lingue.length > 1 && (
        <nav aria-label="Lingua" className="mt-4 flex justify-center gap-2">
          {tenant.lingue.map((codice) => {
            const attiva = codice === lang;
            return (
              <Link
                key={codice}
                href={`${base}/${codice}`}
                hrefLang={codice}
                aria-current={attiva ? "true" : undefined}
                className={
                  attiva
                    ? "rounded-full bg-primario px-3.5 py-1.5 text-xs font-semibold text-white"
                    : "rounded-full border border-linea px-3.5 py-1.5 text-xs font-semibold text-inchiostro-soft"
                }
              >
                {codice.toUpperCase()}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}

/** Intestazione delle sezioni interne: ritorno alla home + titolo. */
export function IntestazioneSezione({
  titolo,
  lang,
  base,
}: {
  titolo: string;
  lang: Lang;
  base: string;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-linea bg-carta px-4 py-3">
      <Link
        href={`${base}/${lang}`}
        aria-label={t("tornaHome", lang)}
        className="flex h-11 w-11 items-center justify-center rounded-full text-inchiostro transition-colors hover:bg-primario-chiaro"
      >
        <IconaIndietro size={21} />
      </Link>
      <h1 className="font-serif text-xl font-semibold">{titolo}</h1>
    </header>
  );
}
