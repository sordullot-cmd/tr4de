/**
 * eloquenceData — contenu statique de la page « Éloquence ».
 *
 * Tout ce qui ne dépend pas de l'IA vit ici : la bibliothèque de textes à lire,
 * les virelangues, les échauffements d'articulation, les thèmes du générateur de
 * sujets, les cadres (frameworks) de structuration, la liste des mots de
 * remplissage et la définition des axes de notation.
 *
 * Persistance : la page stocke l'historique des sessions et la progression via
 * useCloudState (clés ci-dessous), comme les autres pages de productivité.
 */

export const ELOQ_STORAGE_KEY = "tr4de_eloquence_v1";
export const ELOQ_CLOUD_KEY = "eloquence";

/* ─────────────── Niveaux de difficulté ─────────────── */
export const LEVELS = [
  { id: 1, label: "Facile",     color: "#16A34A" },
  { id: 2, label: "Moyen",      color: "#3B82F6" },
  { id: 3, label: "Difficile",  color: "#F59E0B" },
  { id: 4, label: "Expert",     color: "#EF4444" },
];
export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l]));

/* ─────────────── Axes de notation (0–100) ───────────────
 * Partagés entre l'affichage et le prompt de l'IA. L'ordre fixe le rendu. */
export const SCORE_AXES = [
  { id: "structure",    label: "Structure",    desc: "Organisation logique des idées (intro, corps, conclusion)." },
  { id: "vocabulary",   label: "Vocabulaire",  desc: "Richesse, précision et variété du lexique." },
  { id: "clarity",      label: "Clarté",       desc: "Facilité à suivre le propos, phrases nettes." },
  { id: "confidence",   label: "Confiance",    desc: "Assurance perçue, peu d'hésitations et de mots de remplissage." },
  { id: "diction",      label: "Diction",      desc: "Articulation, débit et fluidité de la parole." },
];
// Axe supplémentaire affiché uniquement pour les exercices de lecture.
export const FIDELITY_AXIS = { id: "fidelity", label: "Fidélité", desc: "Exactitude de la lecture par rapport au texte de référence." };

/* ─────────────── Mots de remplissage (FR) ───────────────
 * Comptés localement sur la transcription pour donner une métrique immédiate et
 * nourrir l'analyse IA. Ordre du plus long au plus court pour un matching propre. */
export const FILLER_WORDS = [
  "du coup", "en fait", "c'est-à-dire", "c'est à dire", "tu vois", "vous voyez",
  "je veux dire", "on va dire", "comment dire", "et tout", "et cetera",
  "voilà", "genre", "enfin", "bah", "ben", "euh", "heu", "hum", "bref",
  "quoi", "donc", "alors",
];

/* ─────────────── Bibliothèque de textes (lecture à voix haute) ───────────────
 * Genres variés et longueurs croissantes pour travailler la diction sur des
 * registres différents. `text` est lu tel quel ; il sert aussi de référence
 * pour mesurer la fidélité de lecture. */
export const READING_TEXTS = [
  {
    id: "r-hare",
    level: 1,
    genre: "Fable",
    title: "Le lièvre et la tortue",
    text:
      "Rien ne sert de courir, il faut partir à point. Le lièvre et la tortue en sont un témoignage. " +
      "« Gageons, dit la tortue, que vous n'atteindrez pas si tôt que moi ce but. » Le lièvre, sûr de lui, " +
      "se mit à rire de cette prétention : comment une créature aussi lente oserait-elle le défier à la course ? " +
      "Il accepta le pari sans la moindre hésitation, persuadé que la victoire lui était déjà acquise. " +
      "Le jour venu, les deux concurrents s'élancèrent ensemble. Le lièvre, en quelques bonds prodigieux, " +
      "disparut au loin et laissa sa rivale loin derrière lui. Estimant avoir tout le temps du monde, il " +
      "décida de brouter quelques herbes tendres, de humer les fleurs du chemin, puis, gagné par la chaleur, " +
      "il s'allongea à l'ombre d'un grand chêne et s'endormit profondément. La tortue, elle, patiente et " +
      "régulière, ne se laissa jamais distraire. Elle avançait pas à pas, sans jamais s'arrêter, sourde aux " +
      "moqueries et indifférente à la fatigue. Lorsque le lièvre se réveilla en sursaut et aperçut son ombre " +
      "déjà longue, il bondit de toutes ses forces vers la ligne d'arrivée. Mais il était trop tard : la " +
      "tortue, calme et triomphante, venait de franchir le but la première. La constance, ce jour-là, " +
      "l'avait emporté sur la vitesse, et l'orgueil reçut la leçon qu'il méritait.",
  },
  {
    id: "r-morning",
    level: 1,
    genre: "Narratif",
    title: "Un matin ordinaire",
    text:
      "Le soleil se levait doucement sur la ville encore endormie. Dans la cuisine, l'odeur du café chaud " +
      "remplissait l'air et se mêlait à celle du pain grillé. Camille ouvrit la fenêtre, respira profondément, " +
      "et sourit. La journée commençait bien. Les oiseaux chantaient sur le rebord, le ciel était clair, " +
      "et tout semblait possible. En bas, dans la rue, les premiers passants pressaient le pas, le col relevé, " +
      "tandis qu'un boulanger relevait son rideau de fer dans un grand bruit métallique. Camille prit le temps " +
      "de savourer ces quelques minutes suspendues, où la ville hésitait encore entre le sommeil et l'éveil. " +
      "Elle versa lentement le café dans sa tasse préférée, celle dont l'anse était un peu ébréchée, et " +
      "s'installa près de la fenêtre. Rien d'extraordinaire n'allait se produire ce jour-là, et c'était " +
      "précisément ce qui la rendait heureuse : la douceur tranquille des matins ordinaires, ces instants " +
      "modestes que l'on oublie trop souvent de regarder, mais qui font, mis bout à bout, la trame paisible " +
      "d'une vie. Elle termina sa tasse, ramassa son sac, et descendit l'escalier le cœur léger.",
  },
  {
    id: "r-sea",
    level: 2,
    genre: "Descriptif",
    title: "Devant la mer",
    text:
      "La mer s'étendait à perte de vue, immense et changeante. Les vagues venaient mourir sur le sable " +
      "dans un murmure régulier, comme une respiration ancienne qui ne s'interrompait jamais. Au loin, un " +
      "voilier glissait sur la ligne d'horizon, minuscule point blanc suspendu entre le bleu du ciel et celui " +
      "de l'eau. Le vent portait un parfum de sel et de liberté, et l'on aurait dit que le temps lui-même " +
      "ralentissait. Sur le rivage, les galets polis par des siècles de marées roulaient les uns contre les " +
      "autres à chaque retrait de l'écume, dans un cliquetis doux et continu. Quelques mouettes décrivaient " +
      "de larges cercles au-dessus des rochers, lançant par instants leurs cris aigus que le vent emportait " +
      "aussitôt. La lumière du couchant teintait peu à peu la surface de l'eau de reflets cuivrés, puis " +
      "pourpres, et les nuages s'embrasaient lentement à l'horizon. On pouvait rester là des heures, le regard " +
      "perdu dans cette immensité mouvante, à sentir le sable encore tiède glisser entre ses doigts, gagné " +
      "par cette paix profonde que seule la mer sait offrir à ceux qui acceptent enfin de ne plus rien " +
      "attendre, et de se laisser simplement bercer par le rythme éternel des marées.",
  },
  {
    id: "r-discours",
    level: 2,
    genre: "Discours",
    title: "L'appel au courage",
    text:
      "Mes amis, nous voici réunis à un moment décisif. Le chemin devant nous n'est pas facile, je ne vous " +
      "le cacherai pas. Il sera long, semé d'embûches, et il y aura des jours où le doute nous tenaillera, " +
      "où nous serons tentés de baisser les bras et de rebrousser chemin. Mais l'histoire ne retient jamais " +
      "ceux qui ont reculé devant l'obstacle. Elle retient ceux qui, malgré la peur, ont choisi d'avancer ; " +
      "ceux qui, le cœur serré mais la tête haute, ont fait le pas de plus que les autres n'osaient faire. " +
      "Regardez autour de vous. Chacun de ceux qui nous ont précédés a connu, lui aussi, ses heures de " +
      "découragement. Et pourtant ils ont tenu, parce qu'ils croyaient en quelque chose de plus grand qu'eux. " +
      "Aujourd'hui, je ne vous demande pas d'être des héros, ni d'être parfaits. Je vous demande seulement " +
      "d'être présents, fidèles à votre parole, solidaires les uns des autres dans l'épreuve. Car ce que nul " +
      "ne peut accomplir seul, nous le pouvons ensemble. Ensemble, pas à pas, jour après jour, nous " +
      "construirons ce que d'autres jugeaient impossible. Et quand tout sera achevé, nous pourrons regarder " +
      "en arrière, sans honte et sans regret, et dire que nous n'avons pas tremblé devant l'avenir.",
  },
  {
    id: "r-science",
    level: 3,
    genre: "Vulgarisation",
    title: "La lumière des étoiles",
    text:
      "Lorsque vous contemplez le ciel nocturne, vous ne voyez pas les étoiles telles qu'elles sont, mais " +
      "telles qu'elles étaient. La lumière, bien que d'une rapidité vertigineuse, parcourant près de trois " +
      "cent mille kilomètres en une seule seconde, met des années, parfois des millénaires, à nous parvenir. " +
      "L'étoile la plus proche, après le Soleil, se trouve déjà à plus de quatre années de distance ; sa " +
      "lueur, ce soir, a quitté sa surface alors que vous étiez plus jeune de quatre ans. Ainsi, certains de " +
      "ces points scintillants que nous admirons pourraient s'être éteints depuis fort longtemps, et nous " +
      "continuerions pourtant à recevoir leur dernier éclat, comme une lettre expédiée par un auteur déjà " +
      "disparu. Observer le firmament, c'est donc regarder le passé : un voyage immobile à travers le temps, " +
      "où chaque lueur raconte une histoire achevée bien avant que nos yeux ne la recueillent. Plus une étoile " +
      "est lointaine, plus loin dans le temps notre regard remonte ; les télescopes les plus puissants " +
      "captent ainsi la lumière de galaxies nées il y a des milliards d'années, presque aux origines de " +
      "l'univers. Lever les yeux vers les étoiles, c'est, sans bouger d'un pas, contempler la mémoire même " +
      "du cosmos, et mesurer à quel point notre présent n'est qu'un point minuscule dans l'immensité du temps.",
  },
  {
    id: "r-philo",
    level: 3,
    genre: "Argumentatif",
    title: "Sur la liberté",
    text:
      "On confond souvent la liberté avec l'absence de contraintes. Pourtant, être libre ne signifie pas " +
      "faire tout ce qui nous passe par la tête, au gré de nos impulsions et de nos humeurs. Celui qui obéit " +
      "à chacun de ses caprices n'est pas libre : il est l'esclave de ses désirs, ballotté d'une envie à " +
      "l'autre, incapable de s'appartenir vraiment. Songez à celui qui ne peut résister à aucune tentation : " +
      "il croit choisir, alors qu'il ne fait que céder. Sa volonté est prisonnière de tout ce qui le sollicite. " +
      "La véritable liberté, au contraire, suppose la maîtrise de soi, la capacité de prendre du recul, de " +
      "peser ses raisons, de choisir en connaissance de cause et d'assumer pleinement les conséquences de " +
      "ses actes. Elle ne consiste pas à n'avoir aucune limite, mais à se donner à soi-même les règles que " +
      "l'on juge justes, et à savoir y demeurer fidèle même lorsque cela coûte. C'est pourquoi la liberté " +
      "n'est jamais un point de départ tout offert, mais une conquête de chaque instant. Elle se gagne moins " +
      "contre le monde extérieur, ses lois et ses obstacles, que contre soi-même, contre la facilité, la " +
      "paresse et la peur. Être libre, en somme, c'est devenir l'auteur de sa propre vie plutôt que le " +
      "spectateur passif de ses penchants.",
  },
  {
    id: "r-proust",
    level: 4,
    genre: "Littéraire",
    title: "La phrase longue",
    text:
      "Longtemps, lorsque je revenais le soir de ces promenades où, l'esprit encore plein des paysages " +
      "traversés et des conversations échangées, je laissais mes pensées vagabonder sans contrainte, il " +
      "m'arrivait, au détour d'une rue familière dont la lumière déclinante allongeait démesurément les " +
      "ombres et donnait aux façades une teinte d'or éteint, de ressentir cette mélancolie douce et profonde " +
      "que seuls connaissent ceux qui, ayant beaucoup espéré, ont appris à se réjouir des choses simples sans " +
      "pour autant renoncer à leurs rêves les plus lointains. Alors, sans que je susse pourquoi, une odeur " +
      "oubliée, le grincement particulier d'une porte, ou la silhouette d'un passant entrevue à la faveur du " +
      "crépuscule, suffisaient à rappeler en moi, avec une netteté presque douloureuse, des heures que je " +
      "croyais à jamais perdues ; et il me semblait alors que le temps, loin de s'écouler en ligne droite et " +
      "de tout emporter sur son passage, demeurait au contraire blotti tout entier dans ces sensations " +
      "minuscules, prêt à ressurgir intact dès qu'un hasard, plus puissant que toute la volonté du monde, " +
      "consentait enfin à le délivrer.",
  },
  {
    id: "r-juridique",
    level: 4,
    genre: "Technique",
    title: "Clause complexe",
    text:
      "Nonobstant toute stipulation contraire, les parties conviennent expressément que l'inexécution, par " +
      "l'une d'elles, d'une quelconque de ses obligations substantielles, dûment constatée et notifiée par " +
      "lettre recommandée avec accusé de réception, autorisera l'autre partie, après l'expiration d'un délai " +
      "raisonnable demeuré infructueux, à résilier de plein droit le présent contrat, sans préjudice des " +
      "dommages et intérêts auxquels elle pourrait légitimement prétendre en réparation du préjudice subi. " +
      "Il est en outre précisé que la tolérance dont l'une des parties pourrait faire preuve, à l'égard des " +
      "manquements de l'autre, ne saurait en aucun cas être interprétée comme une renonciation, même tacite, " +
      "à se prévaloir ultérieurement des stipulations de la présente clause. Les parties reconnaissent enfin " +
      "que les présentes dispositions, négociées de bonne foi et en pleine connaissance de leur portée, " +
      "expriment fidèlement leur commune intention, et qu'elles prévaudront sur toute correspondance, " +
      "promesse ou convention antérieure, écrite ou verbale, ayant pu intervenir entre elles relativement au " +
      "même objet, lesquelles seront réputées nulles et non avenues à compter de la signature des présentes.",
  },

  /* ── Niveau 2 — registres variés ── */
  {
    id: "r-interview",
    level: 2,
    genre: "Dialogue",
    title: "L'entretien",
    text:
      "— Qu'est-ce qui vous a donné envie de vous lancer ? demanda la journaliste en posant son carnet. " +
      "— Honnêtement, répondit-il en souriant, c'est la peur de regretter. Je me suis dit qu'il valait " +
      "mieux essayer et échouer que de passer ma vie à imaginer ce qui aurait pu arriver. " +
      "— Et les débuts, comment les avez-vous vécus ? reprit-elle, intriguée. " +
      "— Difficiles, je ne vais pas vous mentir. Il y a eu des nuits sans sommeil, des doutes, des proches " +
      "qui ne comprenaient pas. Mais chaque petit obstacle franchi me donnait un peu plus confiance. " +
      "— Si vous deviez donner un seul conseil à quelqu'un qui hésite encore ? " +
      "— Je lui dirais de commencer petit, mais de commencer vraiment. On apprend infiniment plus en faisant " +
      "qu'en réfléchissant indéfiniment. Aujourd'hui, quoi qu'il advienne, je ne regrette rien.",
  },
  {
    id: "r-recette",
    level: 2,
    genre: "Procédural",
    title: "La pâte à crêpes",
    text:
      "Pour réussir une pâte à crêpes légère, commencez par tamiser la farine dans un grand saladier afin " +
      "d'éviter qu'elle ne forme des paquets. Creusez un puits au centre, cassez-y les œufs un à un, puis " +
      "versez peu à peu le lait tout en fouettant énergiquement du centre vers les bords, pour éviter les " +
      "grumeaux. Ajoutez une pincée de sel, une cuillère de sucre, et, si vous le souhaitez, une cuillère " +
      "d'huile ou de beurre fondu qui rendra les crêpes plus moelleuses. Parfumez selon votre goût d'un peu " +
      "de vanille, de fleur d'oranger ou d'un zeste de citron. Laissez ensuite reposer la pâte au moins une " +
      "heure à température ambiante : ce temps de repos, souvent négligé, permet à la farine de bien " +
      "s'imprégner et fait toute la différence sur la texture finale. Au moment de cuire, graissez " +
      "légèrement une poêle bien chaude, versez une petite louche de pâte en l'inclinant pour la répartir, " +
      "et retournez la crêpe dès que les bords se détachent et que le dessous est joliment doré.",
  },

  /* ── Niveau 3 — difficile ── */
  {
    id: "r-hugo-aube",
    level: 3,
    genre: "Poésie",
    title: "Demain, dès l'aube — Victor Hugo",
    text:
      "Demain, dès l'aube, à l'heure où blanchit la campagne, " +
      "je partirai. Vois-tu, je sais que tu m'attends. " +
      "J'irai par la forêt, j'irai par la montagne. " +
      "Je ne puis demeurer loin de toi plus longtemps. " +
      "Je marcherai les yeux fixés sur mes pensées, " +
      "sans rien voir au dehors, sans entendre aucun bruit, " +
      "seul, inconnu, le dos courbé, les mains croisées, " +
      "triste, et le jour pour moi sera comme la nuit.",
  },
  {
    id: "r-eco",
    level: 3,
    genre: "Vulgarisation",
    title: "Comprendre l'inflation",
    text:
      "L'inflation, souvent décrite comme une simple hausse des prix, traduit en réalité une érosion " +
      "progressive du pouvoir d'achat de la monnaie. Lorsque la quantité de monnaie en circulation croît " +
      "plus vite que la production de biens et de services, chaque unité perd un peu de sa valeur, et il " +
      "faut désormais davantage de pièces et de billets pour acquérir exactement les mêmes choses qu'hier. " +
      "Un même billet, glissé dans une poche et oublié quelques années, achètera demain moins de pain, " +
      "moins d'essence, moins de tout. Les causes en sont multiples : une demande qui s'emballe, des coûts " +
      "de production qui grimpent, ou encore une création de monnaie trop abondante. Comprendre ce mécanisme, " +
      "c'est saisir pourquoi épargner sans investir revient parfois à s'appauvrir lentement, sans même s'en " +
      "apercevoir, car l'argent qui dort perd silencieusement de sa substance. C'est aussi comprendre " +
      "pourquoi une inflation maîtrisée, modérée et prévisible, est jugée préférable à une hausse brutale " +
      "qui désoriente les ménages, décourage l'épargne et finit par fragiliser la confiance même que l'on " +
      "accorde à la monnaie.",
  },
  {
    id: "r-temps",
    level: 3,
    genre: "Philosophie",
    title: "L'instant présent",
    text:
      "Le présent nous échappe sans cesse : à peine l'avons-nous nommé qu'il appartient déjà au passé. " +
      "Nous vivons ainsi suspendus entre un souvenir qui s'efface et une attente qui n'existe pas encore, " +
      "tendus vers un avenir qui, sitôt atteint, se dérobe à son tour. Nous passons une grande partie de " +
      "notre existence à regretter ce qui n'est plus ou à espérer ce qui n'est pas encore, négligeant " +
      "l'unique moment qui nous soit réellement donné de vivre. Pourtant, c'est dans cet instant fugitif, " +
      "et nulle part ailleurs, que la vie se joue véritablement : c'est là que nous respirons, que nous " +
      "aimons, que nous agissons. Peut-être la sagesse consiste-t-elle moins à retenir le temps, ce qui est " +
      "impossible, qu'à habiter pleinement l'instant, à lui prêter toute notre attention avant qu'il ne " +
      "s'évanouisse. Goûter le présent sans le retenir de force, l'accueillir tel qu'il vient, voilà peut-être " +
      "le seul moyen de ne pas passer à côté de sa propre vie.",
  },
  {
    id: "r-sommeil",
    level: 3,
    genre: "Vulgarisation",
    title: "Le travail du sommeil",
    text:
      "Le sommeil n'est pas un simple repos : c'est un travail intense et invisible. Pendant que nous " +
      "dormons, loin de s'éteindre, le cerveau s'active selon un ordre précis : il trie les souvenirs de la " +
      "journée, en consolide certains et en efface d'autres, renforce les apprentissages et élimine peu à " +
      "peu les déchets accumulés durant les heures d'éveil. Les rêves eux-mêmes, longtemps tenus pour de " +
      "simples fantaisies, participeraient à ce grand rangement nocturne, en reliant entre elles des idées " +
      "que la veille tenait séparées. Le corps, de son côté, en profite pour réparer les tissus, réguler les " +
      "hormones et renforcer les défenses immunitaires. Négliger son sommeil, c'est priver l'esprit de cet " +
      "entretien nocturne dont dépend, en grande partie, la clarté de nos pensées, la solidité de notre " +
      "mémoire et la justesse de nos décisions. Une nuit trop courte, répétée jour après jour, ne se rattrape " +
      "jamais tout à fait : elle laisse une dette silencieuse qui finit, tôt ou tard, par se faire sentir.",
  },
  {
    id: "r-liaisons",
    level: 3,
    genre: "Diction",
    title: "Les liaisons",
    text:
      "Les enfants attentifs ont écouté un étrange récit. Quand ils en eurent assez entendu, ils ont " +
      "applaudi avec entrain, puis ont accouru vers les anciens arbres où nichaient autrefois de grands " +
      "oiseaux. Ils y ont aperçu, émerveillés, un immense aigle aux ailes ouvertes, et de tout petits " +
      "êtres ailés voletant en tous sens entre les hautes herbes humides. Les uns ont observé un instant " +
      "ces oiseaux en silence ; les autres ont aussitôt imaginé d'extraordinaires aventures où il était " +
      "question d'îles inconnues et d'océans agités. Un enfant, plus hardi, est allé tout en haut, là où " +
      "les branches anciennes ploient sous le vent, et il a entendu, au loin, un écho amusant lui répondre. " +
      "Tous ensemble, ils ont alors entonné un air ancien, et leurs voix, unies en un seul élan, ont empli " +
      "le grand espace ouvert d'une joie immense et insouciante.",
  },

  /* ── Niveau 4 — expert ── */
  {
    id: "r-baudelaire",
    level: 4,
    genre: "Poésie",
    title: "L'albatros — Baudelaire",
    text:
      "Souvent, pour s'amuser, les hommes d'équipage prennent des albatros, vastes oiseaux des mers, " +
      "qui suivent, indolents compagnons de voyage, le navire glissant sur les gouffres amers. " +
      "À peine les ont-ils déposés sur les planches, que ces rois de l'azur, maladroits et honteux, " +
      "laissent piteusement leurs grandes ailes blanches comme des avirons traîner à côté d'eux.",
  },
  {
    id: "r-festin",
    level: 4,
    genre: "Littéraire",
    title: "Le festin (énumération)",
    text:
      "On apporta force jambons, saucissons, andouilles, cervelas, langues fumées, pâtés en croûte, " +
      "terrines parfumées, fromages affinés, confitures, massepains, dragées et mille autres friandises. " +
      "Vinrent ensuite des volailles dorées, des chapons rôtis à la broche, des cuisses de canard luisantes " +
      "de graisse, des poissons en gelée, des huîtres ouvertes sur leur lit de glace, des soupes fumantes et " +
      "des sauces onctueuses où l'on trempait de larges tranches de pain croustillant. Les flacons de vin, " +
      "rouges, blancs et ambrés, passaient de main en main sans jamais se vider, et les cruches d'hydromel " +
      "se renversaient dans les gobelets avec un joyeux glouglou. Et chacun de bâfrer, de lamper, de " +
      "ripailler, de mâcher, de mastiquer, de s'esclaffer et de festoyer si gaillardement que la table tout " +
      "entière en tremblait d'aise et de gourmandise, que les chandelles vacillaient sous les éclats de rire, " +
      "et que la fête, commencée au crépuscule, se prolongea sans relâche jusqu'aux premières lueurs du matin.",
  },
  {
    id: "r-sifflantes",
    level: 4,
    genre: "Diction",
    title: "Sifflantes et chuintantes",
    text:
      "Sous ses souliers cirés, Sacha chasse sans cesse ces six sangsues sournoises qui se cachent sous " +
      "les souches sèches. Chaque chuchotement choisi cisèle ce chant chuchoté, ce chuintement chaud où " +
      "s'échouent ces serpents soyeux. « Cessez ! » souffle Cécile, soucieuse, sachant ces choses si " +
      "saugrenues qu'elles semblent surgir d'un songe. Sur le seuil, ses sœurs sèchent six chemises serrées, " +
      "tandis que ce sage chasseur sache choisir ses chaussures sans se soucier des soupçons. Si ce chat " +
      "sauvage cessait ses chasses cisaillantes, ces souris songeuses sortiraient sans cesse sous ce ciel " +
      "chargé. Cessez ces simagrées, chuchote-t-elle sans cesse, ces chuchotis chuintants cessent si " +
      "rarement, ces sons sifflants se succèdent sans souffle, sans secours, sans cesse.",
  },
  {
    id: "r-admin",
    level: 4,
    genre: "Administratif",
    title: "La circulaire",
    text:
      "Conformément aux dispositions susvisées, et sous réserve de l'accomplissement préalable des " +
      "formalités déclaratives incombant au demandeur, lequel devra justifier, par la production de toute " +
      "pièce probante, de la régularité de sa situation au regard des obligations légales et réglementaires " +
      "en vigueur, l'autorité compétente se réserve la faculté de subordonner la délivrance de " +
      "l'autorisation sollicitée à la souscription d'engagements complémentaires. Il est rappelé, à toutes " +
      "fins utiles, que tout dossier incomplet ou comportant des éléments inexacts sera réputé irrecevable " +
      "et fera l'objet d'un classement sans suite, sans qu'il soit besoin d'en aviser préalablement " +
      "l'intéressé. Le demandeur dispose, à compter de la notification de la présente décision, d'un délai " +
      "de deux mois pour former, le cas échéant, un recours gracieux auprès de l'autorité signataire, ou un " +
      "recours contentieux devant la juridiction administrative territorialement compétente. Les services " +
      "instructeurs demeurent à la disposition des usagers pour tout renseignement complémentaire, aux jours " +
      "et heures d'ouverture habituels, et veilleront à apporter à chaque demande une réponse motivée dans " +
      "les meilleurs délais que permettront les contraintes du service.",
  },
  {
    id: "r-medical",
    level: 4,
    genre: "Technique",
    title: "Le compte rendu",
    text:
      "L'examen anatomopathologique révèle une prolifération cellulaire atypique caractérisée par un " +
      "pléomorphisme nucléaire marqué, une activité mitotique élevée et des foyers de nécrose " +
      "intratumorale, évoquant un adénocarcinome moyennement différencié. Les marges de résection " +
      "apparaissent, en l'état, saines sur les coupes examinées, bien qu'un contingent infiltrant ait été " +
      "repéré à proximité immédiate du tissu sain, imposant la plus grande prudence dans l'interprétation. " +
      "L'extension locorégionale de la lésion et l'éventuel envahissement ganglionnaire devront être " +
      "précisés sans délai par un complément d'imagerie en coupes fines, idéalement couplé à une exploration " +
      "fonctionnelle, afin d'établir une stadification rigoureuse. Au vu de ces éléments, une concertation " +
      "pluridisciplinaire est vivement recommandée, réunissant chirurgien, oncologue et radiologue, pour " +
      "définir la stratégie thérapeutique la mieux adaptée au cas du patient et arrêter, d'un commun accord, " +
      "le calendrier des examens et des interventions à programmer.",
  },
  {
    id: "r-bergson",
    level: 4,
    genre: "Philosophie",
    title: "La durée",
    text:
      "La durée n'est pas une succession d'instants juxtaposés, semblables aux grains d'un collier que l'on " +
      "pourrait compter un à un ; elle est un écoulement continu, une mélodie où chaque note prolonge la " +
      "précédente et annonce la suivante, sans qu'aucune frontière nette ne vienne jamais les séparer. " +
      "Lorsque nous écoutons un air, nous ne percevons pas une suite de sons isolés : nous saisissons un " +
      "mouvement vivant, où le passé tout entier se prolonge dans le présent et se penche déjà vers l'avenir. " +
      "Ainsi en va-t-il de notre vie intérieure, qui ne cesse de gonfler du souvenir de ce qu'elle vient de " +
      "vivre, comme une boule de neige qui grossit en roulant. Vouloir la saisir par le calcul, la découper " +
      "en parts égales et mesurables, c'est la figer et la trahir ; car ce qui est vivant ne se laisse jamais " +
      "immobiliser sans perdre, dans cette immobilité même, ce qui faisait précisément sa vie. L'intelligence, " +
      "habituée à manier des choses fixes, échoue à penser ce qui dure ; seule une intuition patiente, " +
      "épousant le mouvement du dedans, peut espérer en effleurer la nature.",
  },
  {
    id: "r-mallarme",
    level: 4,
    genre: "Littéraire",
    title: "Le vers pur",
    text:
      "Aboli bibelot d'inanité sonore, le vers se ploie et se déploie, chiffre vain qu'aucun sens " +
      "n'épuise ; et dans l'azur exilé de sa propre clarté, l'idée pure, suspendue, se refuse à choir " +
      "parmi les mots trop humains qui voudraient, vainement, l'enclore.",
  },
  {
    id: "r-appel",
    level: 4,
    genre: "Discours",
    title: "Tenir debout",
    text:
      "Il viendra un jour où l'on s'étonnera d'avoir tant hésité. Ce jour-là, on ne demandera pas à " +
      "chacun ce qu'il possédait, mais ce qu'il a osé ; non ce qu'il a craint, mais ce qu'il a défendu ; " +
      "non les titres qu'il a portés, mais les causes auxquelles il a prêté son courage. On ne nous jugera " +
      "pas sur l'abondance de nos discours, mais sur la constance de nos actes ; pas sur les promesses que " +
      "nous avons faites, mais sur celles que nous avons tenues. Car les époques difficiles ne révèlent pas " +
      "seulement la valeur des hommes : elles la forgent. C'est dans la tempête, et non dans le calme, que " +
      "l'on reconnaît ceux sur qui l'on peut compter. Alors, lorsque viendront les heures sombres — et elles " +
      "viendront —, souvenons-nous que rien de grand ne s'est jamais accompli sans peine, ni sans risque, ni " +
      "sans foi. Que l'on dise alors de nous que, placés devant l'adversité, nous n'avons pas baissé les yeux, " +
      "que nous n'avons pas cherché d'excuses ni attendu que d'autres agissent à notre place, mais que nous " +
      "avons tenu, debout, fidèles jusqu'au bout à ce que nous croyions juste.",
  },
];

/* ─────────────── Virelangues (diction / articulation) ─────────────── */
export const TONGUE_TWISTERS = [
  { id: "tt-chasseurs", level: 1, text: "Un chasseur sachant chasser sait chasser sans son chien." },
  { id: "tt-chemises",  level: 2, text: "Les chaussettes de l'archiduchesse sont-elles sèches, archi-sèches ?" },
  { id: "tt-ton-thé",   level: 1, text: "As-tu vu le ver vert qui va vers le verre en verre vert ?" },
  { id: "tt-dindon",    level: 2, text: "Didon dîna, dit-on, du dos d'un dodu dindon." },
  { id: "tt-piano",     level: 3, text: "Trois tortues trottaient sur un trottoir très étroit." },
  { id: "tt-poisson",   level: 3, text: "Un pâtissier qui pâtissait chez un tapissier qui tapissait." },
  { id: "tt-scieur",    level: 4, text: "Si six scies scient six cyprès, six cent six scies scient six cent six cyprès." },
  { id: "tt-fruits",    level: 4, text: "Cinq chiens chassent six chats, et six chats chassent cinq chiens sans cesse." },

  /* ── Niveau 1 ── */
  { id: "tt-tonton",   level: 1, text: "Si mon tonton tond ton tonton, ton tonton sera tondu." },
  { id: "tt-toux",     level: 1, text: "Ton thé t'a-t-il ôté ta toux ?" },
  { id: "tt-souris",   level: 1, text: "Six souris sous six lits sourient sans souci." },
  { id: "tt-nuit",     level: 1, text: "Trois tortues têtues trottent toute la nuit." },

  /* ── Niveau 2 ── */
  { id: "tt-excuses",  level: 2, text: "Je veux et j'exige d'exquises excuses." },
  { id: "tt-rats",     level: 2, text: "Cinq gros rats grillent dans la grosse graisse grasse." },
  { id: "tt-douches",  level: 2, text: "Douze douches douces dans douze douches douces." },
  { id: "tt-truites",  level: 2, text: "Trois petites truites crues, trois petites truites cuites." },
  { id: "tt-serge",    level: 2, text: "Suis-je bien chez ce cher Serge ?" },

  /* ── Niveau 3 ── */
  { id: "tt-natacha",  level: 3, text: "Natacha n'attacha pas son chat Pacha qui s'échappa." },
  { id: "tt-hibou",    level: 3, text: "La pie niche haut, l'oie niche bas, où niche l'hibou ? L'hibou niche ni haut ni bas." },
  { id: "tt-dragon",   level: 3, text: "Un dragon gradé dégrade un gradé dragon." },
  { id: "tt-fritsfrais", level: 3, text: "Fruits frais, fruits frits, fruits cuits, fruits crus." },
  { id: "tt-tasderiz", level: 3, text: "Tas de riz, tas de rats : tas de riz tentant, tas de rats tentés." },
  { id: "tt-blé",      level: 3, text: "Ces cerises sont si sûres qu'on ne sait si c'en sont." },

  /* ── Niveau 4 — expert ── */
  { id: "tt-berchere", level: 4, text: "Que c'est cher, ce cher Berchère ! Mais c'est si cher que c'est sa chère affaire." },
  { id: "tt-saucisses",level: 4, text: "Ces six saucisses-ci sont si sèches qu'on ne sait si c'en sont." },
  { id: "tt-fisc",     level: 4, text: "Le fisc fixe exprès chaque taxe excessive exclusivement au luxe et à l'exquis." },
  { id: "tt-pruneau",  level: 4, text: "Pruneau cuit, pruneau cru, pruneau cuit, pruneau cru, pruneau cuit, pruneau cru." },
  { id: "tt-kiki",     level: 4, text: "Kiki la cocotte aimait Coco le concasseur de cocos ; Coco le concasseur de cocos concassait les cocos de Kiki la cocotte." },
  { id: "tt-santé",    level: 4, text: "Santé n'est pas sans « t », mais maladie est sans « t » : si la santé t'a quitté, c'est que sans « t » tu es resté." },
  { id: "tt-chasseurs",level: 4, text: "Trois chasseurs sachant chasser sans leur chien chassaient sans cesse ces six chevreuils chétifs." },
];

/* ─────────────── Échauffements vocaux / articulation ───────────────
 * Routine guidée, à faire avant un exercice. Pas d'enregistrement requis. */
export const WARMUPS = [
  { id: "w-breath", title: "Respiration", duration: 60, instruction: "Inspirez par le nez en 4 temps, retenez 4 temps, expirez par la bouche en 6 temps. Répétez 5 fois pour ancrer le souffle." },
  { id: "w-jaw",    title: "Détente de la mâchoire", duration: 30, instruction: "Bâillez largement, massez les muscles de la mâchoire, puis faites des cercles lents avec la bouche grande ouverte." },
  { id: "w-lips",   title: "Vibration des lèvres", duration: 30, instruction: "Faites vibrer vos lèvres (le « brrr » du cheval) en montant et descendant dans les graves et les aigus." },
  { id: "w-vowels", title: "Voyelles exagérées", duration: 45, instruction: "Articulez à l'extrême : A – E – I – O – U, en ouvrant la bouche au maximum. Lentement, puis de plus en plus vite." },
  { id: "w-proj",   title: "Projection", duration: 45, instruction: "Comptez de 1 à 10 en imaginant parler à quelqu'un au fond de la pièce, sans crier. Posez la voix sur le souffle." },
];

/* ─────────────── Générateur de sujets : thèmes proposés ───────────────
 * `key` est envoyé à l'IA ; `label` est affiché. Le mode "surprise" laisse
 * l'IA choisir librement. */
export const TOPIC_THEMES = [
  { key: "société",     label: "Société",       emoji: "🏛️" },
  { key: "technologie", label: "Technologie",   emoji: "💡" },
  { key: "philosophie", label: "Philosophie",   emoji: "🤔" },
  { key: "quotidien",   label: "Quotidien",     emoji: "☕" },
  { key: "imaginaire",  label: "Imaginaire",    emoji: "🚀" },
  { key: "débat",       label: "Débat d'idées", emoji: "⚖️" },
  { key: "personnel",   label: "Vécu personnel", emoji: "💬" },
  { key: "écologie",    label: "Écologie",      emoji: "🌱" },
  { key: "travail",     label: "Travail & carrière", emoji: "💼" },
  { key: "culture",     label: "Art & culture", emoji: "🎭" },
  { key: "éthique",     label: "Éthique & morale", emoji: "🧭" },
  { key: "science",     label: "Science",       emoji: "🔬" },
  { key: "futur",       label: "Futur",         emoji: "🔮" },
  { key: "relations",   label: "Relations",     emoji: "❤️" },
  { key: "surprise",    label: "Surprends-moi", emoji: "🎲" },
];

/* ─────────────── Banque de sujets statiques ───────────────
 * Permet de proposer des sujets instantanément, sans appel à l'IA (plus rapide,
 * et utilisable même hors-ligne). Même forme que la sortie de l'IA :
 * { title, angle, suggestedStructure }. La page peut piocher ici ou générer via l'IA. */
export const TOPIC_BANK = {
  société: [
    { title: "Faut-il limiter le temps passé sur les réseaux sociaux ?", angle: "Pense à un proche que tu as vu changer à cause des écrans.", suggestedStructure: "PREP" },
    { title: "L'école devrait-elle noter les élèves ?", angle: "La note motive-t-elle ou décourage-t-elle ?", suggestedStructure: "Problème · Solution" },
    { title: "La célébrité rend-elle vraiment heureux ?", angle: "Oppose l'image publique à la vie réelle.", suggestedStructure: "3 arguments" },
    { title: "Vivre en ville ou à la campagne ?", angle: "Décris ta journée idéale dans chacun des deux.", suggestedStructure: "PREP" },
    { title: "Le bénévolat devrait-il être obligatoire ?", angle: "Que perd-on quand un geste devient une contrainte ?", suggestedStructure: "Débat" },
    { title: "Les héros d'aujourd'hui sont-ils les bons ?", angle: "Qui admires-tu, et pourquoi ?", suggestedStructure: "PREP" },
  ],
  technologie: [
    { title: "L'intelligence artificielle est-elle une menace ou une chance ?", angle: "Donne un exemple concret de ton quotidien.", suggestedStructure: "Débat" },
    { title: "Pourrait-on vivre une semaine sans smartphone ?", angle: "Raconte ce qui te manquerait vraiment.", suggestedStructure: "STAR" },
    { title: "Faut-il avoir peur des robots au travail ?", angle: "Quels métiers, et quels nouveaux métiers ?", suggestedStructure: "Problème · Solution" },
    { title: "Les jeux vidéo sont-ils un art ?", angle: "Compare à un film ou un roman.", suggestedStructure: "3 arguments" },
    { title: "La vie privée existe-t-elle encore en ligne ?", angle: "Pars d'une donnée que tu as déjà partagée sans y penser.", suggestedStructure: "PREP" },
  ],
  philosophie: [
    { title: "Peut-on être libre tout en obéissant à des règles ?", angle: "Distingue liberté et caprice.", suggestedStructure: "PREP" },
    { title: "Le bonheur se cherche-t-il ou se construit-il ?", angle: "Un moment où tu as été heureux sans le chercher.", suggestedStructure: "3 arguments" },
    { title: "Faut-il toujours dire la vérité ?", angle: "Imagine un cas où mentir protège quelqu'un.", suggestedStructure: "Débat" },
    { title: "L'échec est-il nécessaire pour réussir ?", angle: "Raconte un échec qui t'a fait grandir.", suggestedStructure: "STAR" },
    { title: "Sommes-nous responsables de tout ce que nous faisons ?", angle: "Jusqu'où va notre choix ?", suggestedStructure: "PREP" },
  ],
  quotidien: [
    { title: "Le rituel du matin parfait", angle: "Décris-le minute par minute.", suggestedStructure: "3 arguments" },
    { title: "Convaincs-moi de goûter ton plat préféré", angle: "Fais-nous saliver avec les détails sensoriels.", suggestedStructure: "PREP" },
    { title: "La meilleure habitude que j'aie prise", angle: "Avant / après.", suggestedStructure: "STAR" },
    { title: "Pourquoi tout le monde devrait essayer mon passe-temps", angle: "Vends-le comme une évidence.", suggestedStructure: "Problème · Solution" },
    { title: "Un objet du quotidien dont on ne pourrait plus se passer", angle: "Imagine un monde sans lui.", suggestedStructure: "PREP" },
  ],
  imaginaire: [
    { title: "Tu te réveilles invisible pour 24 heures", angle: "Que fais-tu en premier, et qu'apprends-tu ?", suggestedStructure: "STAR" },
    { title: "Plaide la cause des dragons devant un tribunal", angle: "Tu es leur avocat.", suggestedStructure: "3 arguments" },
    { title: "Le dernier humain sur Terre", angle: "Décris la première journée.", suggestedStructure: "PREP" },
    { title: "Vends une maison hantée à un client réticent", angle: "Transforme chaque défaut en atout.", suggestedStructure: "Problème · Solution" },
    { title: "Tu peux dîner avec n'importe quel personnage de fiction", angle: "Qui, et de quoi parlez-vous ?", suggestedStructure: "PREP" },
  ],
  débat: [
    { title: "Pour ou contre la semaine de quatre jours ?", angle: "Productivité contre fatigue.", suggestedStructure: "Débat" },
    { title: "Le talent compte-t-il plus que le travail ?", angle: "Prends un exemple sportif ou artistique.", suggestedStructure: "3 arguments" },
    { title: "Faut-il interdire la publicité destinée aux enfants ?", angle: "Liberté du commerce contre protection.", suggestedStructure: "Débat" },
    { title: "Les voitures devraient-elles être bannies des centres-villes ?", angle: "Pense aux gagnants et aux perdants.", suggestedStructure: "Problème · Solution" },
    { title: "Vaut-il mieux être craint ou aimé ?", angle: "En tant que chef d'équipe.", suggestedStructure: "PREP" },
  ],
  personnel: [
    { title: "Le meilleur conseil qu'on m'ait donné", angle: "Qui, quand, et ce que ça a changé.", suggestedStructure: "STAR" },
    { title: "Une peur que j'ai surmontée", angle: "Le avant, le déclic, le après.", suggestedStructure: "STAR" },
    { title: "La personne qui m'a le plus inspiré", angle: "Une scène précise plutôt qu'un portrait.", suggestedStructure: "PREP" },
    { title: "Si je pouvais parler à mon moi de 15 ans", angle: "Que lui dirais-tu en une minute ?", suggestedStructure: "PREP" },
    { title: "Un moment où j'ai changé d'avis", angle: "Qu'est-ce qui t'a fait basculer ?", suggestedStructure: "STAR" },
  ],
  écologie: [
    { title: "Le geste écologique le plus utile au quotidien", angle: "Évite les clichés, surprends-nous.", suggestedStructure: "PREP" },
    { title: "Faut-il culpabiliser pour sauver la planète ?", angle: "Motivation positive contre peur.", suggestedStructure: "Débat" },
    { title: "Consommer moins, vivre mieux ?", angle: "Une expérience de sobriété que tu as tentée.", suggestedStructure: "STAR" },
    { title: "Qui doit agir en premier : l'État, les entreprises ou nous ?", angle: "Réponds sans te défausser.", suggestedStructure: "3 arguments" },
  ],
  travail: [
    { title: "Le métier de mes rêves et pourquoi", angle: "Décris une journée type.", suggestedStructure: "PREP" },
    { title: "Vaut-il mieux suivre sa passion ou la sécurité ?", angle: "Donne ta définition de la réussite.", suggestedStructure: "Débat" },
    { title: "Présente-toi en une minute à un recruteur", angle: "Trois forces, un exemple chacune.", suggestedStructure: "STAR" },
    { title: "Le télétravail : libération ou isolement ?", angle: "Parle de ton expérience ou de celle d'un proche.", suggestedStructure: "3 arguments" },
    { title: "Convaincs ton équipe d'adopter ton idée", angle: "Anticipe une objection.", suggestedStructure: "Problème · Solution" },
  ],
  culture: [
    { title: "Défends un film que tout le monde déteste", angle: "Trouve-lui une vraie qualité.", suggestedStructure: "3 arguments" },
    { title: "La musique adoucit-elle vraiment les mœurs ?", angle: "Un morceau qui t'a marqué.", suggestedStructure: "PREP" },
    { title: "Faut-il rendre les musées gratuits ?", angle: "Accès à la culture contre financement.", suggestedStructure: "Débat" },
    { title: "Le livre qui a changé ma façon de voir", angle: "Une idée précise qu'il t'a laissée.", suggestedStructure: "STAR" },
  ],
  éthique: [
    { title: "La fin justifie-t-elle les moyens ?", angle: "Un dilemme concret plutôt qu'abstrait.", suggestedStructure: "Débat" },
    { title: "Rendrais-tu un portefeuille plein trouvé dans la rue ?", angle: "Et si personne ne le saura jamais ?", suggestedStructure: "PREP" },
    { title: "Peut-on juger le passé avec les valeurs d'aujourd'hui ?", angle: "Prends un exemple historique.", suggestedStructure: "3 arguments" },
    { title: "Faut-il toujours pardonner ?", angle: "Distingue pardonner et oublier.", suggestedStructure: "Débat" },
  ],
  science: [
    { title: "Explique la gravité à un enfant de six ans", angle: "Une image plutôt qu'une formule.", suggestedStructure: "PREP" },
    { title: "Coloniser Mars : rêve ou nécessité ?", angle: "Fuite en avant ou survie de l'espèce ?", suggestedStructure: "Débat" },
    { title: "La découverte scientifique la plus importante de l'histoire", angle: "Défends ton choix.", suggestedStructure: "3 arguments" },
    { title: "Faut-il tout chercher à comprendre ?", angle: "Le mystère a-t-il une valeur ?", suggestedStructure: "PREP" },
  ],
  futur: [
    { title: "À quoi ressemblera une journée en 2075 ?", angle: "Réveil, travail, soir.", suggestedStructure: "3 arguments" },
    { title: "Quel métier d'aujourd'hui aura disparu dans 30 ans ?", angle: "Et lequel apparaîtra ?", suggestedStructure: "PREP" },
    { title: "La technologie nous rapproche-t-elle ou nous éloigne-t-elle ?", angle: "Projette la tendance actuelle.", suggestedStructure: "Débat" },
    { title: "Si tu pouvais envoyer un message au futur", angle: "Que veux-tu qu'on retienne de notre époque ?", suggestedStructure: "PREP" },
  ],
  relations: [
    { title: "Qu'est-ce qu'un véritable ami ?", angle: "Illustre par un geste précis.", suggestedStructure: "PREP" },
    { title: "Faut-il tout se dire dans un couple ?", angle: "Sincérité contre tact.", suggestedStructure: "Débat" },
    { title: "Comment garder le lien avec ceux qu'on aime de loin ?", angle: "Une astuce qui marche pour toi.", suggestedStructure: "3 arguments" },
    { title: "La première impression compte-t-elle vraiment ?", angle: "Une fois où tu t'es trompé sur quelqu'un.", suggestedStructure: "STAR" },
  ],
};

// Pioche aléatoire de `count` sujets dans la banque. Thème vide ou "surprise" →
// pioche tous thèmes confondus.
export function getTopicsFromBank(themeKey, count = 4) {
  const pool = (!themeKey || themeKey === "surprise")
    ? Object.values(TOPIC_BANK).flat()
    : (TOPIC_BANK[themeKey] || Object.values(TOPIC_BANK).flat());
  const a = pool.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, count);
}

// Un seul sujet au hasard (pour « Tirer un sujet »).
export function pickRandomTopic(themeKey) {
  return getTopicsFromBank(themeKey, 1)[0] || null;
}

/* ─────────────── Cadres de structuration (exercices de structure) ───────────────
 * Méthodes pour organiser une prise de parole. Servent de support à l'exercice
 * « Structure » : l'utilisateur reçoit un sujet + un cadre, parle, et l'IA juge
 * le respect du cadre. */
export const STRUCTURE_FRAMEWORKS = [
  {
    id: "prep",
    name: "PREP",
    short: "Point · Raison · Exemple · Point",
    description: "Idéal pour répondre à une question de façon claire et convaincante.",
    steps: [
      { label: "Point", hint: "Énoncez votre idée principale en une phrase." },
      { label: "Raison", hint: "Expliquez pourquoi vous le pensez." },
      { label: "Exemple", hint: "Illustrez par un cas concret ou une anecdote." },
      { label: "Point", hint: "Reformulez votre idée pour conclure." },
    ],
  },
  {
    id: "star",
    name: "STAR",
    short: "Situation · Tâche · Action · Résultat",
    description: "Parfait pour raconter une expérience (entretien, retour d'expérience).",
    steps: [
      { label: "Situation", hint: "Plantez le décor : contexte et enjeu." },
      { label: "Tâche", hint: "Quel était votre objectif ou votre rôle ?" },
      { label: "Action", hint: "Qu'avez-vous concrètement fait ?" },
      { label: "Résultat", hint: "Quel a été le résultat, qu'avez-vous appris ?" },
    ],
  },
  {
    id: "tripode",
    name: "La règle de trois",
    short: "Trois arguments",
    description: "Annoncez trois points, développez-les, puis synthétisez.",
    steps: [
      { label: "Annonce", hint: "« Je vois trois raisons à cela. »" },
      { label: "Argument 1", hint: "Le plus fort en premier." },
      { label: "Argument 2", hint: "Un angle complémentaire." },
      { label: "Argument 3", hint: "Celui qui restera en mémoire." },
      { label: "Synthèse", hint: "Reliez les trois et concluez." },
    ],
  },
  {
    id: "problème",
    name: "Problème · Solution",
    short: "Problème · Cause · Solution · Bénéfice",
    description: "Pour convaincre ou présenter une proposition.",
    steps: [
      { label: "Problème", hint: "Décrivez la difficulté de façon vivante." },
      { label: "Cause", hint: "Pourquoi ce problème existe-t-il ?" },
      { label: "Solution", hint: "Présentez votre réponse." },
      { label: "Bénéfice", hint: "Montrez ce que tout le monde y gagne." },
    ],
  },
];
export const FRAMEWORK_BY_ID = Object.fromEntries(STRUCTURE_FRAMEWORKS.map((f) => [f.id, f]));

/* ─────────────── Modes d'exercice (onglets) ─────────────── */
export const EXERCISE_MODES = {
  reading: "reading",
  freeSpeech: "freeSpeech",
  topics: "topics",
  diction: "diction",
  structure: "structure",
};

/* ─────────────── Helpers de métriques (locales, avant l'IA) ─────────────── */

// Compte les mots d'une transcription (séparateurs Unicode-friendly).
export function countWords(text) {
  if (!text) return 0;
  const m = String(text).trim().match(/[\p{L}\p{N}'’-]+/gu);
  return m ? m.length : 0;
}

// Détecte et compte les mots de remplissage. Renvoie { total, byWord }.
export function countFillers(text) {
  const byWord = {};
  let total = 0;
  if (!text) return { total, byWord };
  const lower = " " + String(text).toLowerCase().replace(/[.,;:!?()«»"]/g, " ") + " ";
  for (const f of FILLER_WORDS) {
    // Bornes de mots autour de l'expression pour éviter les faux positifs.
    const re = new RegExp("(?<![\\p{L}])" + escapeRegex(f) + "(?![\\p{L}])", "giu");
    const matches = lower.match(re);
    if (matches && matches.length) {
      byWord[f] = matches.length;
      total += matches.length;
    }
  }
  return { total, byWord };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Débit de parole en mots/minute à partir du nombre de mots et d'une durée (s).
export function computeWpm(wordCount, durationSec) {
  if (!durationSec || durationSec <= 0) return 0;
  return Math.round((wordCount / durationSec) * 60);
}

// Qualification du débit pour un retour immédiat à l'utilisateur.
export function describeWpm(wpm) {
  if (!wpm) return { label: "—", tone: "mut" };
  if (wpm < 110) return { label: "Lent", tone: "blue" };
  if (wpm <= 160) return { label: "Idéal", tone: "green" };
  if (wpm <= 190) return { label: "Soutenu", tone: "amber" };
  return { label: "Trop rapide", tone: "red" };
}

// Score global = moyenne des axes présents (arrondi).
export function overallScore(scores) {
  if (!scores) return 0;
  const vals = Object.values(scores).filter((v) => typeof v === "number");
  if (!vals.length) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
