import type { Lang } from "./types";

/** Etichette dell'interfaccia, separate dai contenuti della struttura. */
const dizionario = {
  sottotitolo: {
    it: "Guida di benvenuto",
    en: "Welcome guide",
    fr: "Guide de bienvenue",
    de: "Willkommensguide",
  },
  tornaHome: {
    it: "Torna alla home",
    en: "Back to home",
    fr: "Retour à l'accueil",
    de: "Zurück zur Startseite",
  },
  checkinDalle: {
    it: "Check-in dopo le",
    en: "Check-in after",
    fr: "Arrivée après",
    de: "Check-in ab",
  },
  checkoutEntro: {
    it: "Check-out entro le",
    en: "Check-out by",
    fr: "Départ avant",
    de: "Check-out bis",
  },
  comeArrivare: {
    it: "Come arrivare, passo dopo passo",
    en: "How to get in, step by step",
    fr: "Comment arriver, étape par étape",
    de: "So kommen Sie an, Schritt für Schritt",
  },
  fotoInArrivo: {
    it: "Foto in arrivo",
    en: "Photo coming soon",
    fr: "Photo à venir",
    de: "Foto folgt",
  },
  reteGratuita: {
    it: "Rete Wi-Fi gratuita",
    en: "Free Wi-Fi network",
    fr: "Réseau Wi-Fi gratuit",
    de: "Kostenloses WLAN",
  },
  nomeRete: {
    it: "Nome rete",
    en: "Network name",
    fr: "Nom du réseau",
    de: "Netzwerkname",
  },
  password: {
    it: "Password",
    en: "Password",
    fr: "Mot de passe",
    de: "Passwort",
  },
  copiaPassword: {
    it: "Copia password",
    en: "Copy password",
    fr: "Copier le mot de passe",
    de: "Passwort kopieren",
  },
  copiato: {
    it: "Copiato",
    en: "Copied",
    fr: "Copié",
    de: "Kopiert",
  },
  apriMaps: {
    it: "Apri in Maps",
    en: "Open in Maps",
    fr: "Ouvrir dans Maps",
    de: "In Maps öffnen",
  },
  indirizzo: {
    it: "Indirizzo",
    en: "Address",
    fr: "Adresse",
    de: "Adresse",
  },
  scriviWhatsapp: {
    it: "Scrivi su WhatsApp",
    en: "Message on WhatsApp",
    fr: "Écrire sur WhatsApp",
    de: "Auf WhatsApp schreiben",
  },
  chiamaOra: {
    it: "Chiama ora",
    en: "Call now",
    fr: "Appeler",
    de: "Jetzt anrufen",
  },
  emergenzaBreve: {
    it: "Emergenza",
    en: "Emergency",
    fr: "Urgence",
    de: "Notfall",
  },
  primaDiPartire: {
    it: "Prima di partire",
    en: "Before you leave",
    fr: "Avant de partir",
    de: "Vor der Abreise",
  },
  checklistNota: {
    it: "Le spunte restano salvate su questo telefono.",
    en: "Your ticks stay saved on this phone.",
    fr: "Vos coches restent enregistrées sur ce téléphone.",
    de: "Ihre Häkchen bleiben auf diesem Telefon gespeichert.",
  },
  checkoutTardivo: {
    it: "Ti serve un check-out più tardi? Scrivici in anticipo su WhatsApp, confermiamo in base alla disponibilità.",
    en: "Need a later check-out? Message us in advance on WhatsApp, we will confirm based on availability.",
    fr: "Besoin d'un départ plus tard ? Écrivez-nous à l'avance sur WhatsApp, nous confirmerons selon les disponibilités.",
    de: "Brauchen Sie einen späteren Check-out? Schreiben Sie uns vorab auf WhatsApp, wir bestätigen je nach Verfügbarkeit.",
  },
  ingrandisci: {
    it: "tocca per ingrandire",
    en: "tap to enlarge",
    fr: "toucher pour agrandir",
    de: "zum Vergrößern tippen",
  },
  apriMappe: {
    it: "Apri nelle mappe",
    en: "Open in maps",
    fr: "Ouvrir dans les cartes",
    de: "In Karten öffnen",
  },
  notaFarmacie: {
    it: "Di notte e nei giorni festivi le farmacie fanno servizio a turno: l'elenco aggiornato è esposto sulla porta di ogni farmacia. Per un'emergenza chiama il 112.",
    en: "At night and on public holidays pharmacies take turns being open: the current rota is posted on every pharmacy door. In an emergency call 112.",
    fr: "La nuit et les jours fériés, les pharmacies assurent un service de garde à tour de rôle : la liste à jour est affichée sur la porte de chaque pharmacie. En cas d'urgence, appelez le 112.",
    de: "Nachts und an Feiertagen haben die Apotheken abwechselnd Notdienst: Der aktuelle Plan hängt an jeder Apothekentür aus. Rufen Sie im Notfall die 112 an.",
  },
  daConfermare: {
    it: "Informazione in aggiornamento",
    en: "Information being updated",
    fr: "Information en cours de mise à jour",
    de: "Information wird aktualisiert",
  },
  messaggioPrecompilato: {
    it: "Ciao! Sono un ospite di Casa di Mary e avrei una domanda.",
    en: "Hello! I am a guest at Casa di Mary and I have a question.",
    fr: "Bonjour ! Je suis un client de Casa di Mary et j'ai une question.",
    de: "Hallo! Ich bin Gast in Casa di Mary und habe eine Frage.",
  },
} as const;

export type UiKey = keyof typeof dizionario;

export function t(key: UiKey, lang: Lang): string {
  return dizionario[key][lang];
}
