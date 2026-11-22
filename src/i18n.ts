import type { Lang, Localized } from './types'

const en = {
  appTitle: 'Growth dashboard',
  tabToday: 'Today', tabPlan: '30-day plan', tabReputation: 'Reputation', tabWebsite: 'Website',
  lastCheck: 'Last check', updatedDaily: 'Updated every morning', liveData: 'Live data', savedCopy: 'Saved copy (server not reachable)',
  staleTitle: 'This data has not been refreshed recently', staleBody: 'The daily check last ran on {date}. Numbers may be out of date until it runs again.',
  builtBy: 'Built by', sources: 'Sources', openSite: 'Website', openMaps: 'Google Maps', close: 'Close',
  whereFrom: 'Where does this number come from?', at: 'at',

  // Today
  todayTitle: 'Piccolo Caratello today', todayIntro: 'Where the restaurant stands, what we are doing about it, and what we need from you.',
  goalEyebrow: '30-DAY GOAL', dayOf: 'Day {n} of {total}', reviewMeeting: 'Review meeting', nowRank: 'Today', goalRank: 'Goal',
  rankOf: 'No. {rank} of {of}', topZone: 'Top {n}',
  kpiRating: 'Google rating', kpiReviews: 'Google reviews', kpiPlan: 'Plan progress', kpiWebsite: 'Website health',
  sinceDay0: 'since Day 0', sinceDate: 'since {date}', perWeek: '≈ {n} new reviews per week', tasksDone: 'Done: {done} of {total} tasks', checksOk: '{ok} of {total} checks OK',
  ratingSource: 'Google rating published on piccolocaratello.com, read automatically every morning.',
  reviewsSource: 'Google review count, read every morning from piccolocaratello.com. The 2 Nov point comes from Rankeat.',
  planSource: 'Tasks marked done on the plan. We update them as work is completed.',
  websiteSource: 'Automatic check of every page of piccolocaratello.com, run every morning.',
  chartTitle: 'Google reviews over time', chartSub: 'Each point is a real reading. A new point is added every morning.',
  chartReviews: 'Reviews', chartRating: 'Rating', reviewsUnit: 'reviews',
  nextTitle: 'Next steps', seePlan: 'See the full plan',
  ownerTitle: 'What we need from you', ownerSub: 'No passwords. Each item takes a few minutes.', received: 'Received', toDo: 'To do',

  // Plan
  planTitle: 'The 30-day plan', planIntro: 'Every task, why it matters and how it gets done. Tap a task to open it.',
  all: 'All', areaGoogle: 'Google profile', areaReviews: 'Reviews', areaWebsite: 'Website', areaListings: 'Other sites', areaMeasure: 'Measuring',
  statusTodo: 'To do', statusDoing: 'In progress', statusDone: 'Done', statusWaiting: 'Waiting for access',
  whoUs: 'Us', whoOwner: 'Owner', whoTogether: 'Together',
  why: 'Why it matters', how: 'How', doneWhen: 'Done when', needs: 'Needs', showDone: 'Show done tasks', noTasks: 'No task in this group.',
  progress: '{done} of {total} done',

  // Reputation
  repTitle: 'How guests see Piccolo', repIntro: 'Every site where guests read about the restaurant, side by side.',
  managedYes: 'Managed', managedNo: 'Not claimed', managedLikely: 'Probably managed', managedUnknown: 'To check',
  live: 'Live', reviews: 'reviews', open: 'Open', compareTitle: 'Ratings side by side', compareSub: 'Converted to a 5-point scale so they can be compared.',
  mismatchTitle: 'Information that does not match', voiceTitle: 'What guests say', praise: 'Loved', concerns: 'To watch',
  wordsTitle: 'Words to use everywhere', wordsSub: 'What people type when looking for a place like Piccolo. Use them in the Google description, the website and posts.',

  // Website
  webTitle: 'Is the website doing its job?', webIntro: 'piccolocaratello.com is checked automatically every morning. Problems first, each with its fix.',
  statusPass: 'OK', statusWarn: 'To improve', statusFail: 'Broken', statusNa: 'Not verifiable', pagesChecked: 'Pages checked',
  fixFirst: 'To fix', allGood: 'Nothing to fix: every check passed.', howToFix: 'How to fix', whatWeSaw: 'What the check saw',
  working: 'Already working', changesTitle: 'Since the previous check ({date})', fixed: 'Fixed', newProblem: 'New problem', noChanges: 'No change since the previous check.',
  groupFindability: 'Being found on Google', groupLanguages: 'French and English', groupGuestPath: 'From visit to table', groupMobileSharing: 'Phones and sharing',
}

const fr: Record<keyof typeof en, string> = {
  appTitle: 'Tableau de croissance',
  tabToday: 'Aujourd’hui', tabPlan: 'Plan 30 jours', tabReputation: 'Réputation', tabWebsite: 'Site web',
  lastCheck: 'Dernier contrôle', updatedDaily: 'Mis à jour chaque matin', liveData: 'Données en direct', savedCopy: 'Copie enregistrée (serveur injoignable)',
  staleTitle: 'Ces données n’ont pas été actualisées récemment', staleBody: 'Le contrôle quotidien a eu lieu pour la dernière fois le {date}. Les chiffres peuvent être dépassés jusqu’au prochain contrôle.',
  builtBy: 'Réalisé par', sources: 'Sources', openSite: 'Site web', openMaps: 'Google Maps', close: 'Fermer',
  whereFrom: 'D’où vient ce chiffre ?', at: 'à',

  todayTitle: 'Piccolo Caratello aujourd’hui', todayIntro: 'Où en est le restaurant, ce que nous faisons, et ce dont nous avons besoin de vous.',
  goalEyebrow: 'OBJECTIF 30 JOURS', dayOf: 'Jour {n} sur {total}', reviewMeeting: 'Bilan', nowRank: 'Aujourd’hui', goalRank: 'Objectif',
  rankOf: 'N° {rank} sur {of}', topZone: 'Top {n}',
  kpiRating: 'Note Google', kpiReviews: 'Avis Google', kpiPlan: 'Avancement du plan', kpiWebsite: 'Santé du site',
  sinceDay0: 'depuis le Jour 0', sinceDate: 'depuis le {date}', perWeek: '≈ {n} nouveaux avis par semaine', tasksDone: 'Terminées : {done} sur {total} tâches', checksOk: '{ok} contrôles sur {total} OK',
  ratingSource: 'Note Google publiée sur piccolocaratello.com, lue automatiquement chaque matin.',
  reviewsSource: 'Nombre d’avis Google, lu chaque matin sur piccolocaratello.com. Le point du 2 nov. vient de Rankeat.',
  planSource: 'Tâches marquées terminées dans le plan. Nous les mettons à jour au fil du travail.',
  websiteSource: 'Contrôle automatique de chaque page de piccolocaratello.com, chaque matin.',
  chartTitle: 'Avis Google dans le temps', chartSub: 'Chaque point est un relevé réel. Un nouveau point s’ajoute chaque matin.',
  chartReviews: 'Avis', chartRating: 'Note', reviewsUnit: 'avis',
  nextTitle: 'Prochaines étapes', seePlan: 'Voir tout le plan',
  ownerTitle: 'Ce dont nous avons besoin de vous', ownerSub: 'Aucun mot de passe. Quelques minutes pour chaque point.', received: 'Reçu', toDo: 'À faire',

  planTitle: 'Le plan sur 30 jours', planIntro: 'Chaque tâche, pourquoi elle compte et comment elle se fait. Touchez une tâche pour l’ouvrir.',
  all: 'Tout', areaGoogle: 'Fiche Google', areaReviews: 'Avis', areaWebsite: 'Site web', areaListings: 'Autres sites', areaMeasure: 'Mesure',
  statusTodo: 'À faire', statusDoing: 'En cours', statusDone: 'Terminé', statusWaiting: 'En attente d’accès',
  whoUs: 'Nous', whoOwner: 'Propriétaire', whoTogether: 'Ensemble',
  why: 'Pourquoi c’est important', how: 'Comment', doneWhen: 'Terminé quand', needs: 'Nécessite', showDone: 'Afficher les tâches terminées', noTasks: 'Aucune tâche dans ce groupe.',
  progress: '{done} sur {total} terminées',

  repTitle: 'Comment les clients voient Piccolo', repIntro: 'Tous les sites où les clients lisent sur le restaurant, côte à côte.',
  managedYes: 'Gérée', managedNo: 'Non revendiquée', managedLikely: 'Probablement gérée', managedUnknown: 'À vérifier',
  live: 'En direct', reviews: 'avis', open: 'Ouvrir', compareTitle: 'Les notes côte à côte', compareSub: 'Ramenées sur 5 pour pouvoir les comparer.',
  mismatchTitle: 'Des informations qui ne concordent pas', voiceTitle: 'Ce que disent les clients', praise: 'Apprécié', concerns: 'À surveiller',
  wordsTitle: 'Les mots à utiliser partout', wordsSub: 'Ce que les gens tapent pour trouver une adresse comme Piccolo. À utiliser dans la description Google, le site et les publications.',

  webTitle: 'Le site fait-il son travail ?', webIntro: 'piccolocaratello.com est contrôlé automatiquement chaque matin. Les problèmes d’abord, chacun avec sa correction.',
  statusPass: 'OK', statusWarn: 'À améliorer', statusFail: 'Cassé', statusNa: 'Non vérifiable', pagesChecked: 'Pages contrôlées',
  fixFirst: 'À corriger', allGood: 'Rien à corriger : tous les contrôles sont réussis.', howToFix: 'Comment corriger', whatWeSaw: 'Ce que le contrôle a relevé',
  working: 'Ce qui fonctionne déjà', changesTitle: 'Depuis le contrôle précédent ({date})', fixed: 'Corrigé', newProblem: 'Nouveau problème', noChanges: 'Aucun changement depuis le contrôle précédent.',
  groupFindability: 'Être trouvé sur Google', groupLanguages: 'Français et anglais', groupGuestPath: 'De la visite à la table', groupMobileSharing: 'Téléphones et partage',
}

export type MessageKey = keyof typeof en
const messages: Record<Lang, Record<MessageKey, string>> = { en, fr }

export type Translator = {
  lang: Lang
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
  tx: (text: Localized) => string
  date: (iso: string) => string
  dateTime: (iso: string) => string
  number: (value: number) => string
  /** Ratings always keep one decimal: 4,0 not 4. */
  rating: (value: number) => string
}

export function makeTranslator(lang: Lang): Translator {
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB'
  const parse = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return {
    lang,
    t: (key, vars) => Object.entries(vars ?? {}).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), messages[lang][key]),
    tx: text => text[lang],
    date: iso => parse(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
    dateTime: iso => `${parse(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' })} ${messages[lang].at} ${parse(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`,
    number: value => value.toLocaleString(locale),
    rating: value => value.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
  }
}
