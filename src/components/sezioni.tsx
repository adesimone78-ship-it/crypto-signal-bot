import { t, type Guida, type Lang } from "@/content";
import { CopiaPassword } from "./CopiaPassword";
import { ChecklistCheckout } from "./ChecklistCheckout";
import {
  IconaChat,
  IconaMappa,
  IconaTelefono,
  IconaWifi,
  MarchioCasa,
} from "./icons";

function linkWhatsapp(numero: string, testo: string) {
  return `https://wa.me/${numero.replace("+", "")}?text=${encodeURIComponent(testo)}`;
}

function Pillola({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-block rounded-full bg-primario-chiaro px-3.5 py-2 text-sm font-semibold text-primario-scuro">
      {children}
    </p>
  );
}

export function SezioneCheckin({
  guida,
  lang,
}: {
  guida: Guida;
  lang: Lang;
}) {
  return (
    <div className="px-5 pb-10 pt-5">
      <Pillola>
        {t("checkinDalle", lang)} {guida.checkin.orario}
      </Pillola>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wider text-inchiostro-soft">
        {t("comeArrivare", lang)}
      </h2>

      {/*
       * Elenco verticale, non una fila da scorrere di lato: i passaggi si
       * seguono in ordine, uno alla volta, camminando con la valigia. Il titolo
       * sta sopra la foto perché prima si legge cosa cercare e poi lo si
       * riconosce. Le foto sono verticali come le ha scattate l'host: ritagliarle
       * in orizzontale taglierebbe via proprio il portone, che sta in basso.
       */}
      <ol className="mt-3 flex flex-col gap-7">
        {guida.checkin.steps.map((step) => (
          <li key={step.numero}>
            <p className="mb-2 text-sm font-semibold">
              {step.numero}. {step.titolo[lang]}
            </p>

            {step.foto ? (
              <a
                href={step.foto}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${step.titolo[lang]} — ${t("ingrandisci", lang)}`}
                className="block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={step.foto}
                  alt={step.titolo[lang]}
                  loading="lazy"
                  className="aspect-3/4 w-full rounded-xl border border-linea object-cover"
                />
              </a>
            ) : (
              /* Senza foto il segnaposto resta basso: non lascia un buco. */
              <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-linea bg-superficie text-xs text-inchiostro-soft">
                {t("fotoInArrivo", lang)}
              </div>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-8 text-center text-xs text-inchiostro-soft">
        CIN: {guida.struttura.cin}
      </p>
    </div>
  );
}

export function SezioneWifi({ guida, lang }: { guida: Guida; lang: Lang }) {
  return (
    <div className="px-5 pb-10 pt-8">
      <div className="flex flex-col gap-5 rounded-2xl border border-linea bg-superficie p-6">
        <div className="flex items-center justify-center text-primario-scuro">
          <IconaWifi size={34} />
        </div>

        <p className="text-center text-xs font-semibold uppercase tracking-wider text-inchiostro-soft">
          {t("reteGratuita", lang)}
        </p>

        <div className="h-px bg-linea" />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-inchiostro-soft">
            {t("nomeRete", lang)}
          </p>
          <p className="mt-1 font-mono text-xl font-bold break-all">
            {guida.wifi.rete}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-inchiostro-soft">
            {t("password", lang)}
          </p>
          <p className="mt-1 font-mono text-xl font-bold break-all">
            {guida.wifi.password}
          </p>
        </div>

        <CopiaPassword password={guida.wifi.password} lang={lang} />
      </div>
    </div>
  );
}

export function SezioneRegole({ guida, lang }: { guida: Guida; lang: Lang }) {
  return (
    <ol className="px-5 pb-10 pt-2">
      {guida.regole.map((regola, indice) => (
        <li
          key={regola.numero}
          className={`flex items-start gap-4 py-5 ${
            indice < guida.regole.length - 1 ? "border-b border-linea" : ""
          }`}
        >
          <span
            aria-hidden="true"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primario text-sm font-bold text-white"
          >
            {String(regola.numero).padStart(2, "0")}
          </span>
          <p className="pt-2 text-sm leading-relaxed">{regola.testo[lang]}</p>
        </li>
      ))}
    </ol>
  );
}

export function SezionePosizione({
  guida,
  lang,
}: {
  guida: Guida;
  lang: Lang;
}) {
  return (
    <div className="px-5 pb-10 pt-6">
      <div className="rounded-2xl border border-linea bg-superficie p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-inchiostro-soft">
          {t("indirizzo", lang)}
        </p>
        <p className="mt-2 font-serif text-xl font-semibold leading-snug">
          {guida.struttura.indirizzo}
        </p>
        <p className="text-sm text-inchiostro-soft">{guida.struttura.citta}</p>

        <a
          href={guida.struttura.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-primario-scuro px-4 py-3.5 text-sm font-semibold text-white"
        >
          <IconaMappa size={18} />
          {t("apriMaps", lang)}
        </a>
      </div>
    </div>
  );
}

export function SezioneEmergenza({
  guida,
  lang,
}: {
  guida: Guida;
  lang: Lang;
}) {
  const urgenze = guida.contatti.find((c) => c.tipo === "telefono_urgenze");
  const whatsapp = guida.contatti.find((c) => c.tipo === "whatsapp");
  const pubblico = guida.contatti.find((c) => c.tipo === "numero_emergenza");
  /*
   * Tutto il resto (ospedale, farmacie) diventa una scheda con nome, indirizzo,
   * telefono e collegamento alle mappe. L'ordine arriva dai dati: in emergenza
   * conta quale voce si legge per prima.
   */
  const luoghi = guida.contatti
    .filter(
      (c) =>
        c.visibileIn === "emergenza" &&
        c.tipo !== "telefono_urgenze" &&
        c.tipo !== "numero_emergenza",
    )
    .sort((a, b) => (a.ordine ?? 99) - (b.ordine ?? 99));
  const cFarmacie = luoghi.some(
    (c) => c.tipo === "farmacia" || c.tipo === "farmacia_turno",
  );

  return (
    <div className="flex flex-col gap-3.5 px-5 pb-10 pt-5">
      {/*
       * Il numero pubblico viene prima di quello dell'host: se qualcuno sta
       * male, la chiamata giusta è ai soccorsi, non a chi affitta la casa.
       */}
      {pubblico && (
        <a
          href={`tel:${pubblico.valore}`}
          className="flex items-center gap-3.5 rounded-2xl bg-urgenza p-5 text-white"
        >
          <IconaTelefono size={26} />
          <span>
            <span className="block text-[11px] font-bold uppercase tracking-wider opacity-85">
              {pubblico.etichetta[lang]}
            </span>
            <span className="mt-0.5 block text-2xl font-bold">
              {pubblico.visualizzato}
            </span>
          </span>
        </a>
      )}

      {urgenze && (
        <a
          href={`tel:${urgenze.valore}`}
          className="flex items-center gap-3.5 rounded-2xl bg-primario-scuro p-5 text-white"
        >
          <IconaTelefono size={26} />
          <span>
            <span className="block text-[11px] font-bold uppercase tracking-wider opacity-85">
              {urgenze.etichetta[lang]}
            </span>
            <span className="mt-0.5 block text-lg font-bold">
              {urgenze.visualizzato}
            </span>
          </span>
        </a>
      )}

      {whatsapp && (
        <a
          href={linkWhatsapp(whatsapp.valore, t("messaggioPrecompilato", lang))}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3.5 rounded-2xl bg-whatsapp p-5 text-white"
        >
          <IconaChat size={26} />
          <span>
            <span className="block text-[11px] font-bold uppercase tracking-wider opacity-90">
              {whatsapp.etichetta[lang]}
            </span>
            <span className="mt-0.5 block text-lg font-bold">
              {whatsapp.visualizzato}
            </span>
          </span>
        </a>
      )}

      {luoghi.map((contatto, indice) => (
        <div
          key={`${contatto.tipo}-${contatto.nome ?? contatto.valore ?? indice}`}
          className="rounded-xl border border-linea bg-superficie px-4 py-3.5"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-inchiostro-soft">
            {contatto.etichetta[lang]}
          </p>

          {contatto.daConfermare ? (
            <p className="mt-1 text-sm text-inchiostro-soft">
              {t("daConfermare", lang)}
            </p>
          ) : (
            <>
              {contatto.nome && (
                <p className="mt-1 text-sm font-semibold">{contatto.nome}</p>
              )}
              {contatto.indirizzo && (
                <p className="mt-0.5 text-sm text-inchiostro-soft">
                  {contatto.indirizzo}
                </p>
              )}

              {/* Due bersagli grandi: in emergenza si tocca, non si legge. */}
              <div className="mt-3 flex flex-wrap gap-2">
                {contatto.valore && (
                  <a
                    href={`tel:${contatto.valore}`}
                    className="rounded-full bg-primario px-4 py-2 text-xs font-semibold text-white"
                  >
                    {contatto.visualizzato || t("chiamaOra", lang)}
                  </a>
                )}
                {contatto.mapsUrl && (
                  <a
                    href={contatto.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-linea px-4 py-2 text-xs font-semibold text-inchiostro-soft"
                  >
                    {t("apriMappe", lang)}
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      ))}

      {cFarmacie && (
        <p className="px-1 text-xs leading-relaxed text-inchiostro-soft">
          {t("notaFarmacie", lang)}
        </p>
      )}
    </div>
  );
}

export function SezioneCheckout({
  guida,
  lang,
}: {
  guida: Guida;
  lang: Lang;
}) {
  const whatsapp = guida.contatti.find((c) => c.tipo === "whatsapp");

  return (
    <div className="px-5 pb-10 pt-5">
      <Pillola>
        {t("checkoutEntro", lang)} {guida.checkout.orario}
      </Pillola>

      <h2 className="mt-6 mb-3 text-xs font-semibold uppercase tracking-wider text-inchiostro-soft">
        {t("primaDiPartire", lang)}
      </h2>

      <ChecklistCheckout voci={guida.checkout.checklist} lang={lang} />

      {whatsapp && (
        <div className="mt-8 rounded-xl border border-linea bg-superficie p-4">
          <p className="text-sm leading-relaxed text-inchiostro-soft">
            {t("checkoutTardivo", lang)}
          </p>
          <a
            href={linkWhatsapp(
              whatsapp.valore,
              t("messaggioPrecompilato", lang),
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-primario px-4 py-3 text-sm font-semibold text-primario-scuro"
          >
            <IconaChat size={18} />
            {t("scriviWhatsapp", lang)}
          </a>
        </div>
      )}
    </div>
  );
}

export function SezioneContatti({
  guida,
  lang,
}: {
  guida: Guida;
  lang: Lang;
}) {
  const whatsapp = guida.contatti.find((c) => c.tipo === "whatsapp");
  const urgenze = guida.contatti.find((c) => c.tipo === "telefono_urgenze");

  return (
    <div className="flex flex-col gap-3.5 px-5 pb-10 pt-5">
      {whatsapp && (
        <a
          href={linkWhatsapp(whatsapp.valore, t("messaggioPrecompilato", lang))}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3.5 rounded-2xl bg-whatsapp p-5 text-white"
        >
          <IconaChat size={26} />
          <span>
            <span className="block text-[11px] font-bold uppercase tracking-wider opacity-90">
              {whatsapp.etichetta[lang]}
            </span>
            <span className="mt-0.5 block text-lg font-bold">
              {whatsapp.visualizzato}
            </span>
          </span>
        </a>
      )}

      {urgenze && (
        <a
          href={`tel:${urgenze.valore}`}
          className="flex items-center gap-3.5 rounded-2xl border border-linea bg-superficie p-5"
        >
          <span className="text-urgenza">
            <IconaTelefono size={24} />
          </span>
          <span>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-inchiostro-soft">
              {urgenze.etichetta[lang]}
            </span>
            <span className="mt-0.5 block text-lg font-bold">
              {urgenze.visualizzato}
            </span>
          </span>
        </a>
      )}
    </div>
  );
}
