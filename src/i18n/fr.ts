export const fr = {
  app: {
    name: "BBP",
    fullName: "Bouhra, Boutargue & Protéine",
    tagline: "Mange. Bouge. Bsahtek.",
  },
  nav: {
    journal: "Journal",
    recettes: "Recettes",
    coach: "Kémia",
    planning: "Planning",
    profil: "Moi",
  },
  auth: {
    title: "Bienvenue chez BBP",
    subtitle:
      "Connecte-toi avec ton email, on t'envoie un code. Pas de mot de passe, pas de prise de tête.",
    emailLabel: "Ton email",
    emailPlaceholder: "prenom@exemple.fr",
    sendCode: "Recevoir mon code",
    codeLabel: "Le code reçu par email",
    codePlaceholder: "123456",
    verifyCode: "C'est parti",
    changeEmail: "Changer d'email",
    invalidEmail: "Cet email a une drôle de tête, vérifie-le.",
    sendError: "Le code n'est pas parti. Réessaie dans une minute.",
    verifyError: "Ce code ne correspond pas. Regarde ton email et réessaie.",
    notConfigured:
      "Supabase n'est pas encore branché : copie .env.example vers .env.local et remplis les clés.",
    signOut: "Me déconnecter",
  },
  journal: {
    title: "Journal",
    empty: "Rien dans l'assiette ? Raconte-moi ton petit-déj.",
    soon: "Le journal arrive à la session 4.",
  },
  recettes: {
    title: "Recettes",
    empty: "Les recettes de mémé arrivent bientôt, promis.",
    soon: "Les recettes arrivent à la session 7.",
  },
  coach: {
    title: "Kémia",
    empty: "Kémia est en cuisine, elle arrive très vite.",
    soon: "Le coach arrive à la session 6.",
  },
  planning: {
    title: "Planning",
    empty: "Ta semaine se prépare tranquillement.",
    soon: "Le planning arrive à la session 9.",
  },
  profil: {
    title: "Moi",
    connectedAs: "Connecté·e avec",
    notConnected: "Tu n'es pas encore connecté·e.",
  },
} as const;
