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
    subtitle: "Connecte-toi ou crée ton compte, et on passe à table.",
    emailLabel: "Ton email",
    emailPlaceholder: "prenom@exemple.fr",
    passwordLabel: "Ton mot de passe",
    passwordPlaceholder: "••••••••",
    signIn: "Me connecter",
    signUp: "Créer mon compte",
    toSignUp: "Pas encore de compte ? Crée-le ici.",
    toSignIn: "Déjà un compte ? Connecte-toi.",
    invalidEmail: "Cet email a une drôle de tête, vérifie-le.",
    invalidPassword: "Il faut au moins 6 caractères pour ton mot de passe.",
    signInError: "Email ou mot de passe incorrect. Réessaie.",
    signUpError: "Impossible de créer le compte. Réessaie dans une minute.",
    alreadyRegistered: "Ce compte existe déjà. Connecte-toi plutôt.",
    emailNotConfirmed:
      "Ton email n'est pas encore confirmé. Regarde ta boîte mail.",
    confirmEmailSent:
      "Compte créé ! Confirme ton email depuis ta boîte mail, puis connecte-toi.",
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
  kashrut: {
    bassari: "Bassari",
    halavi: "Halavi",
    parve: "Parvé",
    parveFish: "Parvé · poisson",
  },
  design: {
    title: "Charte BBP",
    subtitle:
      "Le kit « sticker néo-brutaliste doux » : tokens, composants, Kémia et illustrations. Référence visuelle de toutes les sessions.",
    sections: {
      colors: "Couleurs",
      typography: "Typographie",
      buttons: "Boutons",
      cards: "Cartes",
      forms: "Formulaires",
      kashrut: "Pastilles casher",
      progress: "Progression",
      kemia: "Kémia",
      illustrations: "Illustrations",
      logos: "Logo",
      states: "États",
      copy: "Ton éditorial",
    },
  },
} as const;
