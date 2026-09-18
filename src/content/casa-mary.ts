import type { Guida } from "./types";

/**
 * Contenuti reali di Casa di Mary.
 *
 * Fonti: poster "Regole della casa" (PDF fornito dall'host, versione 08/2025),
 * sito lacasadimary.it e pagina /casa-mary/ (self check-in).
 *
 * NOTA: i testi in tedesco sono una traduzione fatta in fase di sviluppo — il
 * poster originale non conteneva il tedesco. Vanno riletti dall'host prima di
 * pubblicare la versione DE.
 */
export const casaMary: Guida = {
  struttura: {
    nome: "Casa di Mary",
    indirizzo: "Via Sbarre Inferiori, 131",
    citta: "Reggio Calabria",
    cin: "IT080063C20E90IFAH",
    mapsUrl: "https://maps.google.com/?q=Via+Sbarre+Inferiori+131+Reggio+Calabria",
  },

  unita: {
    nome: "Trilocale",
    camere: 2,
    bagni: 2,
    ospitiMax: 6,
  },

  sezioni: [
    {
      tipo: "checkin",
      attiva: true,
      ordine: 1,
      titolo: {
        it: "Check-in",
        en: "Check-in",
        fr: "Arrivée",
        de: "Check-in",
      },
    },
    {
      tipo: "wifi",
      attiva: true,
      ordine: 2,
      titolo: { it: "WiFi", en: "WiFi", fr: "WiFi", de: "WLAN" },
    },
    {
      tipo: "regole",
      attiva: true,
      ordine: 3,
      titolo: {
        it: "Regole della casa",
        en: "House rules",
        fr: "Règles de la maison",
        de: "Hausregeln",
      },
    },
    {
      tipo: "posizione",
      attiva: true,
      ordine: 4,
      titolo: {
        it: "Posizione",
        en: "Location",
        fr: "Emplacement",
        de: "Lage",
      },
    },
    {
      tipo: "emergenza",
      attiva: true,
      ordine: 5,
      titolo: {
        it: "Emergenza",
        en: "Emergency",
        fr: "Urgence",
        de: "Notfall",
      },
    },
    {
      tipo: "checkout",
      attiva: true,
      ordine: 6,
      titolo: {
        it: "Check-out",
        en: "Check-out",
        fr: "Départ",
        de: "Check-out",
      },
    },
    {
      tipo: "contatti",
      attiva: true,
      ordine: 7,
      titolo: {
        it: "Contatta l'host",
        en: "Contact the host",
        fr: "Contacter l'hôte",
        de: "Gastgeber kontaktieren",
      },
    },
    // Disattivate: nessun contenuto reale ancora fornito dall'host.
    // Restando attiva:false non compaiono in home (regola decisa in FASE F:
    // mai una sezione vuota).
    {
      tipo: "guida_locale",
      attiva: false,
      ordine: 8,
      titolo: {
        it: "Dove mangiare e bere",
        en: "Where to eat and drink",
        fr: "Où manger et boire",
        de: "Essen und Trinken",
      },
    },
    {
      tipo: "info_pratiche",
      attiva: false,
      ordine: 9,
      titolo: {
        it: "Info pratiche",
        en: "Practical info",
        fr: "Infos pratiques",
        de: "Praktische Infos",
      },
    },
  ],

  checkin: {
    orario: "15:00",
    steps: [
      {
        numero: 1,
        titolo: {
          it: "Il palazzo",
          en: "The building",
          fr: "L'immeuble",
          de: "Das Gebäude",
        },
        foto: "/strutture/casa-mary/checkin/1-palazzo.jpg",
      },
      {
        numero: 2,
        titolo: {
          it: "Il portone",
          en: "The main door",
          fr: "La porte d'entrée",
          de: "Die Haustür",
        },
        foto: "/strutture/casa-mary/checkin/2-portone.jpg",
      },
      {
        numero: 3,
        titolo: {
          it: "Il citofono",
          en: "The intercom",
          fr: "L'interphone",
          de: "Die Gegensprechanlage",
        },
        foto: "/strutture/casa-mary/checkin/3-citofono.jpg",
      },
      {
        numero: 4,
        titolo: {
          it: "La porta di casa",
          en: "The apartment door",
          fr: "La porte de l'appartement",
          de: "Die Wohnungstür",
        },
        foto: "/strutture/casa-mary/checkin/4-porta.jpg",
      },
      {
        numero: 5,
        titolo: {
          it: "Il parcheggio",
          en: "Parking",
          fr: "Le parking",
          de: "Der Parkplatz",
        },
        foto: "/strutture/casa-mary/checkin/5-parcheggio.jpg",
      },
      {
        numero: 6,
        titolo: {
          it: "Dentro casa",
          en: "Inside the apartment",
          fr: "À l'intérieur",
          de: "In der Wohnung",
        },
      },
    ],
  },

  wifi: {
    rete: "MERCUSYS_E8CC",
    password: "16359345",
  },

  regole: [
    {
      numero: 1,
      testo: {
        it: "Mantieni la casa pulita e in ordine. Smaltisci i rifiuti seguendo il calendario in dotazione, posizionandoli di fronte ai contatori della luce.",
        en: "Please keep the house clean and tidy. Dispose of waste according to the provided schedule, placing it in front of the electricity meters.",
        fr: "Gardez la maison propre et bien rangée. Éliminez les déchets selon le calendrier fourni, en les plaçant devant les compteurs électriques.",
        de: "Bitte halten Sie die Wohnung sauber und ordentlich. Entsorgen Sie den Müll gemäß dem bereitgestellten Kalender vor den Stromzählern.",
      },
    },
    {
      numero: 2,
      testo: {
        it: "Spegni luci e condizionatori quando non sei in casa. L'appartamento è completamente domotizzato e videosorvegliato esternamente, e i consumi vengono rilevati.",
        en: "Turn off lights and air conditioners when you are not inside. The apartment is fully home-automated, with external video surveillance, and consumption is monitored.",
        fr: "Éteignez les lumières et les climatiseurs lorsque vous n'êtes pas présent. L'appartement est entièrement domotisé, sous vidéosurveillance extérieure, et les consommations sont relevées.",
        de: "Schalten Sie Licht und Klimaanlage aus, wenn Sie nicht da sind. Die Wohnung ist vollständig smart-home-gesteuert, außen videoüberwacht, und der Verbrauch wird erfasst.",
      },
    },
    {
      numero: 3,
      testo: {
        it: "Non è consentito fumare, né all'interno né all'esterno dell'appartamento.",
        en: "Smoking is not allowed, either inside or outside the apartment.",
        fr: "Il est interdit de fumer, à l'intérieur comme à l'extérieur de l'appartement.",
        de: "Rauchen ist weder innerhalb noch außerhalb der Wohnung gestattet.",
      },
    },
    {
      numero: 4,
      testo: {
        it: "Segnala subito eventuali danni. Lo smarrimento delle chiavi sarà sanzionato con una penale di 100 euro.",
        en: "Please report any damage immediately. Loss of keys is subject to a 100-euro fine.",
        fr: "Veuillez signaler immédiatement tout dommage. La perte des clés sera sanctionnée d'une pénalité de 100 euros.",
        de: "Bitte melden Sie Schäden sofort. Der Verlust der Schlüssel wird mit einer Gebühr von 100 Euro berechnet.",
      },
    },
    {
      numero: 5,
      testo: {
        it: "Rispetta le ore di silenzio dalle 22:00 alle 7:00. Non sono ammesse feste.",
        en: "Please respect quiet hours from 10:00 PM to 7:00 AM. Parties are not permitted.",
        fr: "Respectez les heures de silence de 22h00 à 7h00. Les fêtes ne sont pas autorisées.",
        de: "Bitte beachten Sie die Ruhezeiten von 22:00 bis 7:00 Uhr. Partys sind nicht erlaubt.",
      },
    },
    {
      numero: 6,
      testo: {
        it: "Orario di check-in dopo le 15:00, orario di check-out entro le 10:00.",
        en: "Check-in is after 3:00 PM, check-out is by 10:00 AM.",
        fr: "L'arrivée se fait après 15h00, le départ avant 10h00.",
        de: "Check-in ab 15:00 Uhr, Check-out bis 10:00 Uhr.",
      },
    },
  ],

  checkout: {
    orario: "10:00",
    checklist: [
      {
        chiave: "oggetti",
        testo: {
          it: "Porta via i tuoi oggetti personali",
          en: "Take all your personal belongings",
          fr: "Emportez vos effets personnels",
          de: "Nehmen Sie Ihre persönlichen Gegenstände mit",
        },
      },
      {
        chiave: "elettrodomestici",
        testo: {
          it: "Spegni luci, condizionatori ed elettrodomestici",
          en: "Turn off lights, air conditioners and appliances",
          fr: "Éteignez lumières, climatiseurs et appareils",
          de: "Schalten Sie Licht, Klimaanlage und Geräte aus",
        },
      },
      {
        chiave: "rifiuti",
        testo: {
          it: "Svuota i cestini seguendo il calendario dei rifiuti",
          en: "Empty the bins following the waste schedule",
          fr: "Videz les poubelles selon le calendrier des déchets",
          de: "Leeren Sie die Mülleimer gemäß dem Abfallkalender",
        },
      },
      {
        chiave: "finestre",
        testo: {
          it: "Chiudi finestre e balcone",
          en: "Close windows and balcony door",
          fr: "Fermez les fenêtres et le balcon",
          de: "Schließen Sie Fenster und Balkontür",
        },
      },
      {
        chiave: "chiavi",
        testo: {
          it: "Lascia le chiavi dove indicato dall'host",
          en: "Leave the keys where the host indicated",
          fr: "Laissez les clés à l'endroit indiqué par l'hôte",
          de: "Lassen Sie die Schlüssel am vom Gastgeber angegebenen Ort",
        },
      },
    ],
  },

  contatti: [
    {
      tipo: "whatsapp",
      /*
       * Non più "per domande non urgenti": essendo l'unico modo per raggiungere
       * l'host, un ospite chiuso fuori a mezzanotte deve sentirsi autorizzato a
       * scrivere qui.
       */
      etichetta: {
        it: "Scrivi all'host, per qualsiasi cosa",
        en: "Message the host, about anything",
        fr: "Écrivez à l'hôte, pour tout",
        de: "Schreiben Sie dem Gastgeber, worum es auch geht",
      },
      valore: "+393201762726",
      visualizzato: "320 176 2726",
      visibileIn: "entrambi",
    },
    /*
     * Nessun numero di telefono dell'host: per scelta di Antonio il contatto
     * con la struttura passa solo da WhatsApp. Per un'emergenza vera c'è il
     * 112, che è la chiamata giusta e non dipende da chi risponde.
     */
    {
      tipo: "numero_emergenza",
      etichetta: {
        it: "Ambulanza, polizia, vigili del fuoco",
        en: "Ambulance, police, fire brigade",
        fr: "Ambulance, police, pompiers",
        de: "Rettungswagen, Polizei, Feuerwehr",
      },
      valore: "112",
      visualizzato: "112",
      visibileIn: "emergenza",
      ordine: 1,
    },
    {
      tipo: "ospedale",
      etichetta: {
        it: "Pronto soccorso",
        en: "Emergency room",
        fr: "Urgences",
        de: "Notaufnahme",
      },
      nome: "Grande Ospedale Metropolitano Bianchi-Melacrino-Morelli",
      valore: "",
      visualizzato: "",
      indirizzo: "Via Giuseppe Melacrino 21, 89124 Reggio Calabria",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Grande+Ospedale+Metropolitano+Via+Giuseppe+Melacrino+21+Reggio+Calabria",
      visibileIn: "emergenza",
      ordine: 4,
    },
    {
      tipo: "farmacia",
      etichetta: {
        it: "Farmacia",
        en: "Pharmacy",
        fr: "Pharmacie",
        de: "Apotheke",
      },
      nome: "Farmacia Fata Morgana",
      valore: "+39096524013",
      visualizzato: "0965 24013",
      indirizzo: "Via Osanna 15, 89125 Reggio Calabria",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Farmacia+Fata+Morgana+Via+Osanna+15+Reggio+Calabria",
      visibileIn: "emergenza",
      ordine: 5,
    },
    {
      tipo: "farmacia",
      etichetta: {
        it: "Farmacia",
        en: "Pharmacy",
        fr: "Pharmacie",
        de: "Apotheke",
      },
      nome: "Farmacia Centrale",
      valore: "+390965332332",
      visualizzato: "0965 332332",
      indirizzo: "Corso Garibaldi 455, 89127 Reggio Calabria",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Farmacia+Centrale+Corso+Garibaldi+455+Reggio+Calabria",
      visibileIn: "emergenza",
      ordine: 6,
    },
  ],
};
