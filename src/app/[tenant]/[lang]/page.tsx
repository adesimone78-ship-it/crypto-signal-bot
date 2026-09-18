import Link from "next/link";
import { notFound } from "next/navigation";
import { SLUG, isLang, sezioniAttive, t } from "@/content";
import { contestoGuida } from "@/lib/richiesta";
import { ICONE_SEZIONE, IconaChat, IconaTelefono } from "@/components/icons";
import { IntestazioneBrand } from "@/components/Intestazioni";

export default async function HomeGuida({
  params,
}: {
  params: Promise<{ tenant: string; lang: string }>;
}) {
  const { tenant: slug, lang } = await params;
  const { tenant, base } = await contestoGuida(slug);

  if (!isLang(lang) || !tenant.lingue.includes(lang)) notFound();

  const guida = tenant.guida;
  const sezioni = sezioniAttive(guida).filter((s) => s.tipo !== "contatti");
  const whatsapp = guida.contatti.find((c) => c.tipo === "whatsapp");
  /*
   * La barra fissa in fondo mostra il numero dei soccorsi quando c'è: è quello
   * che serve a chi sta male. Il numero dell'host resta la riserva, per le
   * strutture che non dichiarano un numero pubblico.
   */
  const urgenze =
    guida.contatti.find((c) => c.tipo === "numero_emergenza") ??
    guida.contatti.find((c) => c.tipo === "telefono_urgenze");

  return (
    <>
      <IntestazioneBrand tenant={tenant} lang={lang} base={base} />

      <main className="px-5 pb-28 pt-5">
        <nav aria-label={guida.struttura.nome}>
          <ul className="grid grid-cols-2 gap-3">
            {sezioni.map((sezione) => {
              const Icona = ICONE_SEZIONE[sezione.tipo];
              return (
                <li key={sezione.tipo}>
                  <Link
                    href={`${base}/${lang}/${SLUG[sezione.tipo]}`}
                    className="flex h-full min-h-[106px] flex-col gap-3 rounded-xl border border-linea bg-superficie p-4 transition-colors hover:border-primario"
                  >
                    <Icona size={25} className="text-primario-scuro" />
                    <span className="text-sm font-semibold leading-tight">
                      {sezione.titolo[lang]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp.valore.replace("+", "")}?text=${encodeURIComponent(
              t("messaggioPrecompilato", lang),
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-3 rounded-xl bg-primario-scuro p-4 text-white"
          >
            <IconaChat size={24} />
            <span>
              <span className="block text-sm font-semibold">
                {t("scriviWhatsapp", lang)}
              </span>
              <span className="mt-0.5 block text-xs opacity-85">
                {whatsapp.etichetta[lang]}
              </span>
            </span>
          </a>
        )}
      </main>

      {urgenze && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-lg px-5 pb-4">
          <a
            href={`tel:${urgenze.valore}`}
            className="flex items-center gap-2.5 rounded-xl bg-urgenza px-4 py-3 text-white shadow-lg"
          >
            <IconaTelefono size={20} />
            <span className="text-sm font-semibold">
              {t("emergenzaBreve", lang)}: {urgenze.visualizzato}
            </span>
          </a>
        </div>
      )}
    </>
  );
}
