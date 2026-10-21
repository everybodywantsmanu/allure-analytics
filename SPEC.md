# Allure Analytics — spécification v0.1

**Nom et logo** *(18/10/2026)* : le produit s'appelle **Allure Analytics** (« Allure » en raccourci dans les phrases). Le logo est un logotype dessiné, pas une police : « ALLURE » en capitales géométriques d'un trait régulier, plus larges que hautes (étirées), suivi d'un point rond, comme une signature ; dessous, « ANALYTICS » en petites capitales espacées sur toute la largeur. Noir (#1D1D1F), et la couleur du texte en mode sombre. Une version courte, « A. », sert sur téléphone et pour l'icône d'onglet. Fichiers : `assets/allure-analytics-logo.svg`, `assets/allure-analytics-mark.svg` ; le tracé vit dans `src/logo.js`.

> *the pace of your pages · la vitesse de vos pages*

Refonte de `performance-monitor.html` (v1, conservé tel quel comme référence). Toutes les décisions ci-dessous ont été arbitrées le 17/10/2026.

---

## 1. Le besoin

**Pour qui.** Un product manager ou un responsable marketing, non technique.

**Le besoin central** *(recadré le 17/10/2026)*. Savoir **où je me situe, côté performance, face à mes concurrents**, et ce qu'il me faut pour passer devant le suivant.

**Le job.** *Quand je pilote la performance de mon site, je veux connaître mon rang face à mes concurrents et l'écart qui me sépare de celui juste devant, pour lancer les chantiers qui me font monter, puis vérifier que j'ai gagné la place.*

**La promesse.** Allure dit où vous êtes, ce qu'il vous manque pour monter d'un rang, et quels chantiers y mènent.

**Le cycle.** Se situer → voir ce qui fait monter → relancer l'analyse pour mesurer le chemin parcouru. *(18/10/2026 : Allure est un outil de visualisation ; il ne suit pas les actions menées — ni « En cours », ni « Livré ».)*

**Positionnement.** Produit sans marque, pièce de portfolio publiée sur GitHub (GitHub Pages).

### Principes
1. **Une réponse avant des chiffres.** Chaque écran commence par une phrase, pas par un tableau.
2. **Le terrain avant le labo.** Ce que vivent les vrais visiteurs (CrUX) prime sur Lighthouse.
3. **Chaque couleur signifie quelque chose.** La couleur est réservée aux statuts.
4. **Rien à excuser.** Plus de notes « ±10 pts, c'est normal » : si l'indicateur doit s'excuser, c'est le mauvais indicateur.

---

## 2. Ce que la v1 faisait mal (et ce qu'on en retient)

| v1 | Allure |
|---|---|
| Le score Lighthouse en vedette, bruité (±10 pts) | Les Core Web Vitals terrain (p75), stables |
| La page d'accueil seulement | 3 à 8 pages clés, pondérées |
| Un classement avec médailles, sur la page d'accueil seulement | Un classement sur tout le site, centré sur l'écart à combler |
| Des mesures sans recommandation | Des chantiers classés, et un ticket prêt à copier |
| Un « monitor » qui ne tourne que si on clique | L'historique CrUX récupéré d'emblée |
| 5 mesures × 2 appareils × N sites par clic | Un nombre de mesures adaptatif |
| TTI (hors du score depuis Lighthouse 10), pas d'INP | LCP · INP · CLS |
| Seuils maison (40 / 80) | Seuils officiels de Google |
| La marque d'une entreprise, des emojis, 6 couleurs et plus | Sa propre identité (Allure Analytics), neutre, une seule couleur réservée aux problèmes |

---

## 3. Périmètre du prototype (v0.1, 100 % local)

### Projet
- **1 site, 3 à 8 pages clés nommées** (Accueil, Fiche produit, Panier…).
- **Poids par page** : *Critique ×3 · Importante ×2 · Secondaire ×1*. Le niveau est proposé automatiquement d'après le nom ou l'URL (panier, checkout, produit, tarifs → Critique ; accueil → Importante ; le reste → Secondaire) et se change d'un clic.
- **Concurrents** : un domaine suffit (comparaison sur tout le site, en données terrain). On peut aussi associer une page clé à son **équivalent chez un concurrent**, et sa fiche affiche alors la comparaison page à page.
- **Appareil** : mobile par défaut, une bascule globale Mobile / Desktop. Le verdict signale un écart important entre les deux.

### Mode démo *(révisé le 18/10/2026 : la démo n'est plus le premier écran)*
Un projet fictif déjà rempli : une boutique fictive, 5 pages, environ 6 mois d'historique terrain simulé, 3 concurrents fictifs, une analyse précédente il y a 8 semaines (la colonne d'évolution du classement et le moment de victoire sont donc visibles), et trois quick wins. Le bouton **« Analyser mon site »** fait passer au mode réel. Ensuite, la démo reste à un clic : dans la barre du haut, le nom du projet devient une bascule *Votre entreprise | Démo*.
**Le vrai produit d'abord, la démo à un clic** *(18/10/2026)* :
- L'appli s'ouvre sur **le vrai produit** : sans analyse, un accueil épuré (« Votre site face à vos concurrents. » et une phrase), avec deux boutons, **Analyser mon site** et **Voir la démo**.
- **Dans la barre du haut, toujours la bascule *Mon site | Démo*** (« Mon site » devient le nom de votre entreprise après une analyse) : la démo se choisit d'un clic, de n'importe où.
- **En démo, « Quitter la démo › »** dans la bande du haut ramène à l'appli claire : l'accueil vierge, ou vos résultats.
- Le choix est mémorisé ; une analyse terminée bascule toujours sur vos données.
- **Liens à partager** *(21/10/2026)* : `#/demo` ouvre directement la démo, `#/demo/compare/lcp` l'ouvre sur un écran donné ; `?lang=en` ou `?lang=fr` choisit la langue (par exemple pour envoyer la démo en anglais). Le lien ne reste pas dans l'historique : l'adresse redevient celle de l'écran.

| Cas | Comportement |
|---|---|
| Première visite | L'accueil vierge, pas la démo. |
| Démo choisie, puis rechargement | On reste en démo jusqu'à « Quitter la démo » ou *Mon site*. |
| Quitter la démo sans analyse | L'accueil vierge. |
| Analyse lancée pendant la démo | À la fin, vos résultats. |
| Comparer, fiche page ou fiche action, sans données | L'accueil vierge : il n'y a rien à comparer. |
| Analyse en cours, pas encore de résultat | L'accueil vierge ; le bouton du haut ramène à l'avancement. |
| « Supprimer mes données » | Retour à l'accueil vierge (plus à la démo). |
| Téléphone | Le logo passe à « A. » pour laisser la place à la bascule. |

**La démo se reconnaît au premier coup d'œil** *(18/10/2026)* : sur l'accueil et la vue Comparer, une fine bande sombre traverse le haut de l'écran, au-dessus de la barre, et reste visible au défilement : « **Démo · données fictives** », suivie de « Quitter la démo › ». C'est le code des « modes test » des outils pro. Elle remplace le badge « DÉMO » et la mention dans le pied de page. Pas de bande sur Réglages ni sur l'écran d'analyse, qui ne montrent pas de données.

### Écrans

**Accueil.** Minimaliste et autoporteur *(audit design du 17/10/2026, révisé le soir même)*. Un seul score sur l'accueil, le score PageSpeed de Google, avec son **niveau d'excellence** (60 sur mobile, 80 sur ordinateur).

**Excellence, plus « seuil »** *(19/10/2026)* : sur la machine de Google, 60 sur mobile et 80 sur ordinateur, c'est déjà du très haut niveau ; ce n'est pas un plancher. Le mot change partout pour le score : « Excellence 80 » sur la courbe, le classement et la jauge ; « Prochaine étape : l'excellence, à 9 points » ; « Au niveau d'excellence » ; « Quick wins pour atteindre l'excellence ». Pour rester honnête, l'explication dit que Google réserve son vert à 90 et plus. Les seuils des vrais visiteurs (2,5 s, 200 ms, 0,1) restent des « seuils Google » : ce sont de vrais seuils de réussite.

**Comment le score est calculé** *(19/10/2026, après un écart de 61 dans Allure contre 88 dans le Lighthouse de Chrome)* : en tête de la carte d'accueil et de la vue Comparer, la mention de fraîcheur devient une pastille, « Mesuré par Google · aujourd'hui ⓘ ». Elle ouvre une petite carte, « Comment le score est calculé », en cinq lignes illustrées :
1. **Mesuré par Google** : PageSpeed Insights lance Lighthouse sur ses serveurs, une même machine dans les mêmes conditions pour vous et vos concurrents.
2. **Plus bas que dans votre Chrome** : sur votre ordinateur, le processeur est plus rapide ; le JavaScript bloque moins la page et le score monte, parfois de 20 points ou plus.
3. **La moyenne de vos pages comparables** ; sans données de vrais visiteurs, chaque page garde la médiane de 3 passages.
4. **Excellence : 60 sur mobile, 80 sur ordinateur** ; Google réserve son vert à 90 et plus.
5. **Moins de 2 points d'écart : égalité** ; le labo varie d'un passage à l'autre.
Puis « Voir d'où viennent les points › » vers l'onglet Score de Comparer. À la première visite, le ⓘ pulse doucement trois fois pour attirer l'œil, et plus jamais une fois la carte ouverte.

| Cas | Comportement |
|---|---|
| Clic à côté, ou Échap | La carte se referme. |
| Téléphone | La carte prend toute la largeur de la carte d'accueil. |
| Carte déjà ouverte une fois | Le ⓘ ne pulse plus (mémorisé dans le navigateur). |
| Animations réduites | Pas de pulsation. |
| Clavier, lecteur d'écran | La pastille est un bouton qui déplie ; le contenu est du texte. |
| Démo | Même pastille, même explication. | Chaque chiffre n'est dit qu'une fois, et aucune légende n'est nécessaire.
*(18/10/2026 : la ligne « Depuis votre analyse du 10 oct. · Maison Lune +6 pts · Halde −9 pts » au-dessus de la carte, et son rappel « Nouvelle semaine : relancez… », ont été retirés : ils n'apportaient rien. L'évolution vit désormais dans le classement, ligne par ligne.)*
1. **Synthèse, courbe et classement** (une seule carte)
   - En tête de carte, à gauche la fraîcheur (« Score PageSpeed · mesuré il y a 3 jours »), à droite la bascule **Mobile / Ordinateur** : elle filtre les données, elle vit donc avec elles et non dans la barre du haut.
   - **Une phrase en deux tons, positive, qui porte la position** *(réécrite le 18/10/2026 : l'important est la place, pas le nombre de concurrents ; plus de « sur 4 », et l'écart devient la prochaine étape plutôt qu'un retard)* :
     - « Vous êtes 3e. *Prochaine étape : la 2e place, à 15 points.* »
     - À 5 points ou moins : « Vous êtes 2e. *La 1re place est à portée : 4 points.* »
     - Sous 2 points d'écart : « Vous êtes 3e. *Au coude-à-coude avec Lumen & Co.* »
     - En tête : « Vous êtes en tête. *6 points d'avance sur Lumen & Co.* » (ou « *Au coude-à-coude avec Lumen & Co.* » sous 2 points).
     - En tête mais sous le seuil, le seuil passe avant : « Vous êtes en tête. *Prochaine étape : le seuil, à 9 points.* »
     - Sans concurrent comparable : « Vous êtes à 53 sur 100. *Prochaine étape : le seuil, à 7 points.* », « *Au-dessus du seuil.* », ou « *Bien au-dessus du seuil.* » à 10 points ou plus.
     - « En tête » plutôt que « 1er » : la phrase reste neutre en genre.
     - La position est seule sur sa ligne, en noir ; la suite, en gris, passe toujours à la ligne dessous.
   - **Une pastille au plus** *(épuré le 18/10/2026 : les deux pastilles et la colonne d'évolution disaient trois fois la même chose)* : le **moment de victoire** *(MLP)* quand une place a été gagnée ou perdue depuis l'analyse précédente (« ▲ Vous passez devant Halde », pastille foncée ; « ▼ Halde passe devant vous »), sinon l'évolution sur la durée (« ▲ 1 place gagnée en 6 mois » ; en solo, « ▲ +5 points en 6 mois »), masquée tant que l'historique couvre moins d'un mois.
   - **Le rang qui tourne** *(effet, 18/10/2026)* : quand votre place a changé depuis l'analyse précédente, « Vous êtes 4e » roule jusqu'à « 3e », comme un compteur, une seule fois par analyse et par appareil.
   - Un graphique sur 6 mois, chaque point à sa date : votre courbe en noir, les concurrents en gris. **Le concurrent à battre ressort** *(18/10/2026)* : sa ligne (celui juste devant, ou juste derrière quand vous menez) est d'un gris soutenu, les autres sont estompées, leur nom reste lisible. Les concurrents se dessinent d'abord, votre courbe ensuite, par-dessus, puis son point final apparaît. Chaque ligne est étiquetée à son extrémité par son **nom seulement** : les scores sont dans le classement juste à côté. L'excellence est étiquetée (« Excellence 60 », en ligne pointillée). En dessous, votre point final est orange (sans symbole). Au-delà de 4 concurrents, seuls le leader, les sites juste devant et juste derrière, puis les plus proches en score sont tracés, avec la mention « + 4 autres concurrents dans le classement ». Un nom trop long est tronqué au bout de sa courbe. Un point isolé entre deux trous est marqué d'un point.
   - **Le classement** : une barre par site sur la grille 0–100, avec la ligne de seuil. Votre entreprise en noir, **par son nom**, suivi d'une petite mention « vous » ; les concurrents en gris. *(17/10/2026 : le nom remplace « Vous » partout où l'on nomme les sites — classement, courbe, ligne « Depuis… », écran d'analyse ; « vous » reste dans les phrases : « Vous passez devant Halde », « Vous êtes 3e ».)* Sous le titre, les pages comparées (« Comparé sur Accueil · Fiche produit · Panier »). Un clic sur une ligne déplie les trois indicateurs vrais visiteurs (Affichage, Réactivité, Stabilité). Un concurrent non mesuré reste listé en bas, sans rang (« Mesure indisponible »). Après une place gagnée, les lignes glissent de leur ancienne place à la nouvelle, une fois, puis **un reflet traverse votre barre** *(18/10/2026)* ; après une place perdue, les lignes glissent sans reflet.
   - **L'évolution depuis l'analyse précédente** *(18/10/2026)* : à droite de chaque score, un petit nombre gris, « +4 », « −9 », ou « = » sous 2 points (la variation normale du labo). Calculé sur les scores tels qu'ils étaient affichés, pour tous les sites, sans couleur. Au survol : « Depuis votre analyse du 21 août : +4 pts ». Pas de colonne à la première analyse ni quand les pages comparées ont changé ; vide pour un concurrent absent de l'analyse précédente.
   - **Sous le seuil** *(18/10/2026, remplace le ▲)* : votre score passe en orange ; la barre reste noire, la ligne de seuil suffit à montrer l'écart *(une barre orange clair dessinant l'écart a été essayée puis retirée le même jour, à la demande de l'utilisateur)*. Au survol : « à 8 pts de l'excellence (80) ». Dans une tuile vrais visiteurs au-delà du seuil Google, la valeur est orange et la tuile dit le seuil : « seuil 2,5 s ».
   - **Sur grand écran** (860 px utiles dans la carte), la courbe et le classement sont côte à côte (classement dans une colonne de 340 px) ; sur téléphone, ils s'empilent dans la même carte.
   - Pas de légende, pas de zones teintées, pas de bascule par indicateur.
2. **Quick wins pour passer 2e** *(la section « Pourquoi … est devant » a été retirée le 17/10/2026 : les quick wins suffisent pour s'améliorer)*
   - Le titre ne promet que ce que le plan atteint : une place (« pour passer 2e »), sinon le seuil (« pour passer le seuil »), sinon « pour réduire l'écart ».
   - **Un avant / après** *(refondu deux fois le 18/10/2026 : l'évolution doit se lire d'un coup d'œil)* : à gauche « Aujourd'hui », **72** en grand et en gris, et dessous « 3e place » ; à droite « Avec ces trois actions », **≈ 86** en grand et en noir, et dessous ce que ça change : « 2e place » (en gras quand c'est une place gagnée), « à égalité avec Lumen & Co », ou « en tête ». Entre les deux, une flèche qui porte le gain dans une pastille noire : « **+14 pts** ». Sans concurrent, les lignes du dessous parlent du seuil : « 7 pts sous le seuil » → « au-dessus du seuil ».
   - **La barre** : aujourd'hui en noir plein, puis chaque gain possible **hachuré** (le code habituel du « possible, pas encore acquis »), étiqueté dessous « +6 », « +6 », « +2 ». Des repères marquent le seuil et le concurrent visé. Un gain trop étroit pour son étiquette la laisse à sa ligne (le dernier peut déborder à droite).
   - **Les gains s'additionnent exactement** : chaque marche est l'écart entre deux scores arrondis (72 → 78 → 84 → 86), donc +6 +6 +2 = 86 − 72 ; sous 1 point, l'estimation elle-même (« ≈ +0,6 »).
   - **Trois lignes compactes sous la jauge, dans la même carte** *(18/10/2026, remplacent les trois grandes cartes)* : une coche ronde, le titre, l'effort, le gain « ≈ +6 pts », et « › » vers la fiche. Pas de statut, pas de liste de chantiers livrés *(retirés le 18/10/2026 : Allure visualise, il ne suit pas les actions)*.
   - **Le simulateur** *(18/10/2026)* : cocher ou décocher une action recalcule tout en direct, sans recharger : les segments hachurés se replient ou s'étendent, le chiffre d'arrivée défile jusqu'à sa nouvelle valeur, la pastille de gain et la place d'arrivée suivent (« 2e place », « à égalité avec Lumen & Co »…). Une action décochée affiche en gris ce qu'elle ajouterait à la sélection actuelle. C'est un « et si ? » : rien n'est enregistré, la sélection vit le temps de la visite (par appareil). Une ligne discrète l'annonce **juste au-dessus des cases** (pas sous le titre, trop loin) : « Cochez ou décochez une action pour simuler ».
3. **Vos pages** : une barre par page, de la pire à la meilleure, avec la ligne de seuil. Un clic ouvre la fiche. Affichée seulement si vous comparez des pages choisies (au moins deux) : en *Site entier*, une seule barre répéterait le score du classement.

**Règles transverses**
- **Couleur** : l'orange ne marque que **vos** valeurs sous le seuil (le chiffre, jamais la barre) ; une tuile dit aussi le seuil qu'elle dépasse. Plus de ▲ : il avait la forme du ▲ « place gagnée » et se lisait comme une hausse *(revue UX du 18/10/2026)*. Les triangles ne servent plus qu'aux mouvements (▲ gagné, ▼ perdu). Les concurrents restent toujours en gris. Les erreurs de saisie restent neutres. Texte orange plus foncé de jour (#A35F00, contraste 5:1).
- **Typographie** : 5 tailles (titre principal, 24, 15, 13 et 11 px) et 2 graisses (normal, demi-gras).
- **Barre du haut** : le logo Allure Analytics (« A. » sur téléphone), la bascule *Mon site | Démo* (votre entreprise par son nom dès la première analyse ; sur téléphone, le nom raccourcit, « Démo » reste entier), Réglages et **une seule action**, selon le moment : « Analyser mon site » (démo ou projet incomplet, vers le paramétrage), « Relancer l'analyse » (un clic, même projet), « Analyse en cours… » (retour à l'avancement). Elle tient sur une ligne, téléphone compris.
- **Pied de page** *(18/10/2026)* : « Allure Analytics · v0.1 · Code source ↗ » à gauche (le lien mène au dépôt GitHub), et à droite la signature « Imaginé et créé par **Emmanuel Nsuele** ↗ » (le nom mène à son LinkedIn, dans un nouvel onglet), en gris discret. Rien d'autre : plus de « prototype », plus de « Méthode », et la mention démo est passée dans la bande du haut.
- **Mesure de l'audit** : on passe de 384 à environ 155 mots, de 16 à 5 tailles de texte, de 27 tuiles à aucune tuile visible, et de 8 à 4 contrôles dans la barre.

**Comparer** (page, `#/compare/score` · `/lcp` · `/inp` · `/cls`) *(cadré le 17/10/2026)*. Pour comparer en profondeur votre entreprise et vos concurrents, indicateur par indicateur, avec tout ce que Google fournit d'utile.
- **Entrées** : « Comparer en détail › » à côté du titre « Classement » de l'accueil (onglet Score) ; et les tuiles d'une ligne du classement, qui deviennent des raccourcis vers l'onglet de leur indicateur.
- **En-tête** : « ‹ Accueil », le titre, la bascule Mobile / Ordinateur (partagée avec l'accueil) et quatre onglets, *Score · Affichage · Réactivité · Stabilité*, qui tiennent sur un téléphone.
- **Onglets Affichage, Réactivité, Stabilité** : les vrais visiteurs d'abord, à l'échelle du site.
  - La courbe sur 6 mois, tirée de l'historique CrUX hebdomadaire (disponible dès la première analyse, concurrents compris), tracée sur 100 avec 90 au seuil « bon » de Google, pour qu'elle monte quand ça s'améliore. Au survol, la valeur réelle (« 2,4 s »).
  - Le classement sur la valeur réelle p75 (« 2,4 s »).
  - Dans la même carte, la **part de visites bonnes**, sous un titre qui dit le seuil (« Visites affichées en 2,5 s ou moins »), une barre et un pourcentage par site, de la meilleure à la moins bonne, avec le repère « 75 %, validé par Google » : deux niveaux, comme partout.
  - Puis **le labo, page par page**, dans une seconde carte : une ligne par page comparée, un chiffre par site (pour la Réactivité, le temps de blocage, que le labo mesure à la place de l'INP : c'est la seule ligne d'explication). Chaque valeur, soulignée d'un fin pointillé, ouvre le rapport PageSpeed Insights de Google pour cette page, concurrents compris. « indisponible » si la page devait être mesurée et a échoué, « — » si le site n'est pas comparé sur cette page.
- **Onglet Score** : « D'où viennent les points », la décomposition du score en ses 5 mesures labo (premier affichage 10, vitesse d'affichage 10, affichage principal 25, temps de blocage 30, stabilité 25), avec les points perdus sur chacune, site par site, sur les pages comparées. Chaque cellule se teinte d'un gris d'autant plus profond que la perte est grande ; la ligne « Score » reprend le score du classement de l'accueil. Les sites sans mesure sont dits une fois, sous le tableau (« Comptoir Sud : mesure indisponible »). Puis le score page par page, avec les liens Google.
- **Sites** : tous dans les classements et les barres. Sur les courbes, votre entreprise et jusqu'à 4 concurrents, choisis par des pastilles légères (grises quand la courbe est tracée, en contour sinon ; pas de pastille pour un site sans données) ; par défaut les plus proches de vous ; le choix est gardé d'un onglet à l'autre ; tout décocher ne laisse que votre courbe.
- **Passe minimaliste** *(après construction)* : deux cartes par onglet au lieu de trois, des titres qui disent le seuil au lieu de paragraphes, la décomposition lisible d'un coup d'œil, les liens signalés par un pointillé plutôt qu'expliqués.
- **Couleur** : l'orange ne marque que vos valeurs au-delà du seuil Google (vrais visiteurs) ou hors du vert de Lighthouse (labo) ; les concurrents restent gris ; les points perdus sont neutres.
- **Données** : la part de visites bonnes vient de la répartition que CrUX renvoie déjà (la première tranche de son histogramme), gardée désormais ; tout le reste est déjà récupéré.

**Fiche page.**
- LCP, INP et CLS terrain (p75) avec leur statut.
- Les causes classées.
- L'historique.
- La comparaison avec la page équivalente d'un concurrent, si elle est renseignée.
- Le score labo en indicateur secondaire.

**Fiche chantier.**
- Le pourquoi en une phrase (« vos visuels produit pèsent 2,1 Mo et retardent l'affichage de 1,4 s »).
- Les pages concernées, le gain et l'effort.
- **« Copier le ticket »** : un texte en Markdown pour Jira ou Linear (contexte, éléments fautifs relevés par l'API, critère de réussite mesurable).
- Pas de statut ni de suivi *(18/10/2026)* : la fiche explique, elle ne coche pas.

**Analyse** (page, `#/analyze`) *(construite le 17/10/2026)*. L'écran de l'action, pas du paramétrage.
- **Lancement** : depuis le paramétrage (« Lancer l'analyse »), ou d'un clic depuis la barre du haut (« Relancer l'analyse ») dès qu'un projet complet existe. Un projet incomplet renvoie au paramétrage, le curseur sur la première erreur.
- **L'avancement** *(allégé le 17/10/2026)* : une seule carte, centrée. « Analyse en cours », un grand pourcentage, « Maison Lune et 2 concurrents · environ 2 min » (le temps restant suit le rythme des premières mesures), une barre qui avance avec un léger reflet. Puis une ligne par site, avec un point par mesure : creux en attente, pulsant pendant la mesure, plein une fois fait, gris si indisponible. Les scores attendent le résultat. Les mesures indisponibles sont dites une fois, en bas, en quelques mots (« Comptoir Sud · Accueil : protection anti-robot »). Une page en échec ne bloque jamais les autres. On peut quitter l'écran (l'analyse continue dans l'onglet) ou l'arrêter (rien n'est enregistré).
- **La fin** : **directement l'accueil**, sans écran intermédiaire. *(18/10/2026)* Une transition marque l'arrivée : votre rang (ou votre score sans concurrent) s'affiche en très grand au centre, tourne depuis l'ancien s'il a changé, puis glisse et rétrécit jusqu'à sa place dans la phrase d'accueil pendant que la page apparaît. Les points à garder en tête (adresse corrigée, redirection, bandeau cookies, panier vide, pas de données terrain…) sont repliés au pied de la carte d'accueil : « 3 points à garder en tête sur cette analyse ». Si l'on a quitté l'écran d'analyse entre-temps, on n'est pas déplacé : seule la barre du haut change.
- **Arrêt ou échec** : la même carte, avec la cause et « Relancer l'analyse » / « Modifier le projet ».
- **Sans analyse en cours** : « Dernière analyse » (date, points à garder en tête, Relancer, Modifier le projet), ou, avant toute analyse, l'invitation à paramétrer.

**Réglages** (page) *(révisés le 17/10/2026)*. Tout ce qu'on règle une fois. Avant la première analyse, la page s'intitule « Analyser mon site » : c'est la porte d'entrée.
- **Votre site** : l'adresse, et le nom, **déduit du domaine** (« www.maison-lune.fr » → « Maison Lune ») tant qu'on ne le change pas. Puis **ce qu'on compare** : *Site entier* (le score PageSpeed de l'accueil et les vrais visiteurs de tout le domaine ; PageSpeed ne mesure qu'une page à la fois) ou *Pages choisies* (1 à 8 pages clés : nom, chemin ou adresse complète, importance proposée d'après le nom et changée d'un clic).
- **Concurrents** (8 au plus) : le domaine et le nom, déduit aussi. Si vous comparez vos pages, chacun a sa bascule : *Site entier* (comparé sur son accueil) ou *Pages choisies* (ses pages équivalentes ; l'accueil compte d'office).
- **Clé Google** *(cadrée le 21/10/2026, revue le 22/10/2026)* : en dernier dans le paramétrage (on commence par ce qui intéresse ; le brouillon est gardé si l'on part dans la console). **Le champ « Clé API » passe en premier** : on sait ce qu'est une clé API ; le guide est une action secondaire, replié sous le champ, en petit et en gris (« Pas encore de clé ? Les 4 étapes pour en créer une »).
  - **Une seule clé, deux API.** C'est une clé API Google Cloud, gratuite. Sur cette clé, on active deux API, et chacune débloque quelque chose :
    - **PageSpeed Insights API**, *obligatoire* : le score, le classement, la courbe, les quick wins, le labo page par page, et une copie des vrais visiteurs sans historique.
    - **Chrome UX Report API**, *recommandée* : les vrais visiteurs à la source (valeurs et part de visites bonnes, plus souvent disponibles à l'échelle du site) et **6 mois d'historique** dans Comparer. Facultative : sans elle, l'analyse tourne quand même.
  - **Le guide, replié par défaut** : quatre étapes en liste simple (numéro, texte, lien « Ouvrir ↗ » souligné en pointillé, sans bouton ni fond), chacune vers la bonne page de la console : 1. créer un projet Google Cloud ; 2. activer PageSpeed Insights API *(obligatoire)* ; 3. activer Chrome UX Report API *(recommandée)* ; 4. créer une clé API, puis la coller dans le champ.
  - **Vérification automatique** dès que la clé est collée : une requête légère par API, qui ne mesure rien (Google répond à la porte : clé refusée, API non activée, ou entrée). Un voyant par API : *Activée*, *Non activée*, *Clé refusée*. Les étapes se cochent toutes seules.
  - **L'action là où on la voit** : une API non activée porte son lien directement dans son voyant (« Chrome UX Report · non activée · Activer ↗ »), sans ouvrir le guide. Quand les deux répondent : « Clé valide · PageSpeed Insights · activée · Chrome UX Report · activée ».
  - Pas d'étape sur les restrictions de la clé *(choix du 21/10/2026)* ; seul le message de clé refusée les évoque, puisque c'est alors une cause possible.
  - La mention « gardée dans ce navigateur, envoyée à Google uniquement » reste sous le champ.

| Cas | Comportement |
|---|---|
| Pas encore de clé | Le champ, et sous lui le guide replié ; pas de voyant. |
| Clé mal formée | Pas d'appel à Google ; sous le champ : « Une clé Google commence par AIza et compte 39 caractères. » |
| Vérification en cours | « Vérification de la clé… » ; le reste du formulaire reste utilisable. |
| Clé modifiée | Nouvelle vérification après une courte pause de frappe ; la précédente est abandonnée. |
| Clé refusée | « Google refuse cette clé : vérifiez qu'elle est copiée en entier, et ses restrictions dans la console. » Lancement bloqué sur ce motif. |
| PageSpeed Insights non activée | L'étape 2 reste à faire, avec son lien ; lancement bloqué sur ce motif. |
| Chrome UX Report non activée (ou non autorisée pour cette clé) | L'étape 3 reste à faire, avec ce qu'elle débloque ; le lancement reste possible (vrais visiteurs sans historique). |
| Quota du jour atteint | « Quota du jour atteint pour cette clé : réessayez demain. » Lancement bloqué. |
| Hors ligne, Google injoignable, réponse inattendue | « Vérification impossible pour l'instant » et « Réessayer » ; le lancement reste possible, l'analyse dira si ça bloque. |
| Retour depuis la console | En revenant sur l'onglet, une clé incomplète est revérifiée d'elle-même. |
| Tout est bon | « Clé valide » et les deux voyants ; le guide reste replié, ses étapes cochées si on l'ouvre. |
| Réglages rouverts avec une clé enregistrée | Vérifiée une fois par visite ; le résultat est gardé tant que la clé ne change pas. |
| Coût | Deux requêtes légères par vérification ; rien n'est mesuré. |
- **L'estimation** et le lancement : « 14 mesures · 1 à 3 min » (la fourchette tient compte des pages mesurées trois fois), puis « Lancer l'analyse ».
- Le brouillon est enregistré à la frappe ; les erreurs s'affichent au premier lancement, sous le champ concerné, puis en direct, et le curseur va sur la première.
- **Préférences** : la langue (Français / English), le thème (Auto / Clair / Sombre), et « Effacer mes données » (projet, mesures, historique et clé, avec confirmation).
- À venir : l'export CSV.

**Export du brief.** Une mise en page A4 (feuille de style d'impression) : santé, 3 priorités, grille des pages, repère concurrents. On l'enregistre en PDF depuis la fenêtre d'impression du navigateur.

---

## 4. Données

### Sources
| Besoin | Source |
|---|---|
| Terrain d'une page | PSI v5 `loadingExperience` (ou CrUX `records:queryRecord` par URL) |
| Terrain de tout le site (concurrents) | CrUX `records:queryRecord` par origine |
| Tendance | CrUX History `records:queryHistoryRecord` (historique hebdomadaire) |
| Score PageSpeed (vous : chaque page clé ; concurrents : leurs pages équivalentes, ex. accueil, fiche produit, panier) | PSI v5 `lighthouseResult.categories.performance.score` et ses métriques labo |
| Historique du score PageSpeed | Les analyses d'Allure (un point par analyse ; planifiées chaque semaine en phase 2), pas d'historique Google pour le labo |
| Causes et gains | PSI v5 `lighthouseResult` (audits et insights, `metricSavings`) |

**Une clé Google gratuite est nécessaire** (APIs PageSpeed Insights et Chrome UX Report activées) : le quota de PageSpeed sans clé est désormais nul. Sans l'API CrUX, l'analyse se replie sur la copie des données terrain que renvoie PageSpeed, sans historique.

### Collecte *(construite le 17/10/2026)*
- **Ordre** : vos pages d'abord, puis chaque concurrent ; les données terrain d'un site suivent ses mesures labo, pour interroger CrUX à l'adresse où PageSpeed est arrivé.
- **Débit** : 5 mesures PageSpeed et 4 appels CrUX en parallèle au plus. Les limites de débit (429) et les erreurs serveur (5xx) sont relancées avec un délai croissant (`Retry-After` respecté), trois fois au plus ; une erreur Lighthouse, une fois. Un quota quotidien épuisé, une clé refusée ou une API désactivée arrêtent l'analyse avec un message clair, puisque rien ne pourrait être mesuré.
- **Score** : recalculé par `pageSpeedScore` à partir des métriques labo de Lighthouse (FCP, Speed Index, LCP, TBT, CLS).
- **Causes** : les audits et insights qui annoncent des gains (`metricSavings`) sont rattachés au catalogue d'Allure ; les anciens audits de Lighthouse et les insights qui les remplacent pointent vers le même chantier, et le plus grand gain par métrique est gardé. Les gains « réactivité » sont ceux du TBT, pas de l'INP.
- **Ce qui est gardé** : uniquement les valeurs utiles (quelques dizaines de Ko), jamais la réponse brute de PageSpeed (plusieurs centaines de Ko par mesure).

### Repli
URL terrain → origine terrain → labo. Une valeur issue du labo est toujours marquée *« estimation labo »*. Le repli labo ne vaut que pour une page (LCP et CLS ; jamais l'INP, que le labo ne mesure pas) : le terrain du site, lui, reste vide plutôt qu'estimé, et ses tuiles restent neutres.

### Mesures labo
- **1** par page et par appareil si la page a des données terrain.
- **3** avec médiane sinon (la mesure médiane est gardée entière : ses métriques et ses causes vont ensemble). La règle vaut aussi pour les pages des concurrents, pour que le bruit soit le même des deux côtés.

### Historique du score PageSpeed
- **Un point par analyse** *(révisé le 17/10/2026, ex-« un point par semaine »)*, placé à sa date et à son heure : **deux analyses suffisent pour tracer la courbe**, même le même jour (l'axe montre alors les heures, et sous six semaines les dates de début et de fin). Rien n'est inventé entre deux analyses ; une analyse où une page comparée manque fait un trou. Au survol : « Analyse du 17 oct. à 14:05 ». La démo garde un point par semaine.
- **Les dates labo ne sont jamais appariées aux périodes CrUX** : chaque série garde ses propres dates (analyses d'un côté, fins de fenêtre de 28 jours de l'autre).
- **Une page est son adresse** : son identifiant dérive du site et du chemin. Changer le chemin recommence sa courbe ; la retirer puis la remettre retrouve son historique. La page équivalente d'un concurrent garde une empreinte de son adresse : la changer recommence sa ligne.
- 104 analyses conservées, les 6 derniers mois affichés. Les historiques hebdomadaires enregistrés avant ce changement deviennent une analyse par semaine.

### Seuils (officiels Google, p75)
| | Bon | À améliorer | Mauvais |
|---|---|---|---|
| LCP | ≤ 2,5 s | ≤ 4 s | > 4 s |
| INP | ≤ 200 ms | ≤ 500 ms | > 500 ms |
| CLS | ≤ 0,1 | ≤ 0,25 | > 0,25 |

---

## 5. Position et priorisation

### Position
- **Rang par indicateur** : ordre croissant de LCP, INP et CLS p75 (plus bas = meilleur), sur l'ensemble du site (origine CrUX).
- **Score global = score PageSpeed de Google** *(arbitré le 17/10/2026)*. On recalcule la notation officielle de Lighthouse (code source Apache-2.0) : chaque métrique labo passe par une courbe log-normale dont les points de contrôle dépendent de l'appareil, puis les métriques sont pondérées (FCP 10 %, Speed Index 10 %, LCP 25 %, TBT 30 %, CLS 25 %).

  | Point de contrôle [90 ; 50] | FCP | SI | LCP | TBT | CLS |
  |---|---|---|---|---|---|
  | Mobile | 1,8 s ; 3 s | 3,4 s ; 5,8 s | 2,5 s ; 4 s | 200 ; 600 ms | 0,1 ; 0,25 |
  | Ordinateur | 0,93 s ; 1,6 s | 1,3 s ; 2,3 s | 1,2 s ; 2,4 s | 150 ; 350 ms | 0,1 ; 0,25 |

  **Calcul exact de Lighthouse** *(17/10/2026)* : poids entiers additionnés dans l'ordre de Lighthouse (FCP, LCP, TBT, CLS, SI), moyenne gardée à deux décimales, puis ×100 et arrondi. La virgule flottante tranche des cas comme 77,5 : c'est ce qui garantit les mêmes chiffres que PageSpeed Insights.

  **Comparaison à périmètre égal** *(cas limites, 17/10/2026)* : le score d'un site est la moyenne de ses **pages comparables**, celles mesurées chez vous et chez chacun des concurrents classés (dans la démo : accueil, fiche produit, panier). Le **rang global** se fait sur ce score, départagé par l'affichage terrain. Sans concurrent, le score porte sur toutes vos pages mesurées.
- **Égalité** : moins de **2 points** d'écart, car le labo varie d'une mesure à l'autre. Les rangs de l'historique sont calculés sur une moyenne glissante de 3 points (semaines dans la démo, analyses sur vos données).
- **Excellence du score global** *(ex-« objectif » le 17/10/2026, ex-« seuil » le 19/10/2026)* : **60 sur mobile, 80 sur ordinateur**. Sur la machine de Google, c'est déjà du très haut niveau (Google qualifie de « bon » un score de 90). Au-dessus, vous êtes au niveau d'excellence ; en dessous, vos valeurs sont « à améliorer » (orange). L'objectif, c'est le site juste devant. On évite « moyenne du marché » : Allure ne calcule pas cette moyenne.
- **Score par indicateur** (vrais visiteurs, vues de détail) : sur 100, avec 90 au seuil « bon » de Google et 50 au seuil « mauvais », et une échelle linéaire entre les deux. L'objectif est 90, soit le seuil Google.
- **Repères de marché** (Web Almanac 2025, HTTP Archive / CrUX, juillet 2025), part des sites qui atteignent le seuil « bon » :

  | | Mobile | Ordinateur |
  |---|---|---|
  | Les 3 Core Web Vitals | 48 % | 56 % |
  | Affichage (LCP ≤ 2,5 s) | 62 % | 74 % |
  | Réactivité (INP ≤ 200 ms) | 77 % | 97 % |
  | Stabilité (CLS ≤ 0,1) | 81 % | 72 % |
- **Concurrent visé** : celui juste devant vous ; si vous menez, celui juste derrière.
- **Écart** : en points PageSpeed avec le concurrent visé (phrase de synthèse), puis indicateur par indicateur, côté vrais visiteurs (ligne d'écart).
- **Évolution** : vue Global = l'historique du score PageSpeed mesuré par Allure ; vues par indicateur = l'historique CrUX hebdomadaire. Le rang est recalculé chaque semaine pour mesurer les places gagnées.

### Impact d'un chantier sur le score
Les gains estimés par Lighthouse (`metricSavings` : LCP, TBT, CLS) sont appliqués aux métriques labo de chaque page comparée, puis la page est rescorée comme PageSpeed. Le nouveau score du site donne les points gagnés et le nouveau rang. C'est une **estimation**, présentée comme telle (« ≈ +5 pts »).
- **Gains combinés sans double compte** : les gains de Lighthouse se recouvrent (sur la fiche produit, quatre audits annoncent −3,6 s, −1,2 s, −0,9 s et −0,5 s pour un LCP de 7,6 s). Chaque gain retire donc sa part de la valeur d'origine, appliquée à la suite des autres (`v × (1 − gain / valeur d'origine)`), et le LCP ne descend jamais sous le FCP.
- Un chantier qui rapporte moins de 0,5 point n'est pas proposé en quick win.

### Ordre des quick wins sur l'accueil
Impact sur la position, divisé par l'effort (Facile 1, Moyen 1,6, Lourd 3).
- Impact = places gagnées si le chantier est livré seul + part de l'écart en points PageSpeed comblée (ou, en tête, les points gagnés ÷ 10).
- En cas d'égalité : la priorité de base décrite ci-dessous, divisée par l'effort.

### Priorité de base

1. **Regrouper** : un même problème présent sur plusieurs pages forme **un seul chantier**.
2. **Gain normalisé** : chaque économie estimée (`metricSavings`) est rapportée au seuil « bon » de sa métrique, pour pouvoir additionner des ms de LCP et des unités de CLS.
3. **Priorité** = Σ (gain normalisé × poids de la page).
4. **Effort** (heuristique selon le type d'audit) :
   - *Facile* : images (format, compression, dimensions), `font-display`, espace réservé aux éléments qui décalent la mise en page.
   - *Moyen* : scripts tiers, ressources bloquantes, cache.
   - *Lourd* : JS inutilisé ou trop lourd, travail du thread principal, temps de réponse serveur.
5. Le classement ne s'appuie sur aucun ratio « ms → € ».

### Cas limites
| Cas | Comportement |
|---|---|
| Aucun concurrent | Mode solo : score sur 100 et écart au seuil ; pas de classement. |
| Mesure d'un concurrent en échec | Exclu du classement, listé « Mesure indisponible ». |
| Concurrent sans page commune | Exclu, listé « Aucune page comparable ». |
| Appareil jamais mesuré | « Aucune mesure sur ordinateur pour l'instant. » et le bouton Analyser. |
| Une de vos pages sans mesure | Retirée du périmètre comparé ; listée en bas de « Vos pages ». |
| Historique vide ou d'un seul point | *(révisé le 19/10/2026 : le grand bloc gris « La courbe apparaîtra… » faisait vide)* Pas de courbe ni d'emplacement vide : **le classement prend toute la largeur**, c'est l'information du moment. Dessous, une ligne discrète avec un point plein suivi d'un pointillé qui s'efface : « Point de départ le 18 oct. · votre courbe se dessinera dès la prochaine analyse. » Sans concurrent, la même ligne sous la phrase. Pastille d'évolution masquée sous un mois. |
| Concurrent ajouté récemment | Séries alignées par la fin ; le mouvement de rang ne compte que les sites mesurés aux deux dates. |
| Point manquant | Trou dans la courbe, jamais un zéro. |
| Écart < 2 points | « Au coude-à-coude avec Lumen & Co ». |
| Score de 59,6 | Affiché 60, donc pas sous le seuil : l'alerte suit le chiffre affiché. |
| Indicateur terrain absent | Tuile neutre « — », jamais d'alerte. |
| Plan minuscule | Moins de 0,5 point : non proposé ; un gain trop étroit pour son étiquette « +1 » la laisse à sa ligne. |
| Arrondis de la jauge | Les marches sont les écarts entre scores arrondis : cartes, étiquettes et « 72 → ≈ 86 » s'additionnent exactement. |
| Plus de 4 concurrents | 4 courbes au plus, les autres restent dans le classement. |
| Nom de concurrent long | Tronqué au bout de la courbe (nom complet au survol), avec points de suspension dans le classement. |
| 1er mais sous l'excellence | « Vous êtes en tête. *Prochaine étape : l'excellence, à 9 points.* » ; les quick wins visent l'excellence, pas « garder la tête ». |
| Interface en anglais | « pt » / « pts » selon l'usage anglais ; « this action » quand il n'y en a qu'une. |

#### Cas limites du MLP et de l'accueil réel *(17/10/2026)*
| Cas | Comportement |
|---|---|
| Première analyse | Pas de colonne d'évolution ni de pastille de victoire. |
| Évolution sous 2 points | « = » (stable) : la variation normale du labo n'est pas une évolution. |
| Concurrent absent de l'analyse précédente | Pas de chiffre d'évolution sur sa ligne. |
| Place « gagnée » à moins de 2 points | Égalité : rien n'est revendiqué. |
| Pages comparées différentes d'une analyse à l'autre | Pas de comparaison avec l'analyse précédente : les scores ne portent pas sur les mêmes pages. |
| Analyse précédente d'un autre site | Ignorée. |
| Deux analyses le même jour | Au survol de l'évolution : « Depuis votre analyse de 14:05 ». |
| Animation de victoire | Jouée une fois par analyse et par appareil ; supprimée si l'utilisateur réduit les animations. |
| Site entier, ou une seule page | Pas de section « Vos pages ». |
| Nom d'entreprise long | Tronqué avec points de suspension ; « vous » reste visible ; nom complet au survol. Sur téléphone, un nom qui ne tient pas passe sur deux lignes plutôt que d'être coupé. |
| Démo | L'analyse précédente date de 8 semaines : Maison Lune +4, Halde −10, et « Vous passez devant Halde ». |

#### Cas limites de l'analyse réelle *(🔵, traités le 17/10/2026)*
| Cas | Comportement |
|---|---|
| Adresse saisie librement (`Monsite.fr/`, `http://`, `www.`, barre finale) | Normalisée : https ajouté, hôte en minuscules, chemin seul gardé pour le site. `www.x.fr` et `x.fr` sont le même site ; `/panier/` et `/panier` la même page. |
| Le site redirige (http → https, x.fr → www.x.fr) | L'adresse où PageSpeed arrive est retenue, car CrUX distingue www et sans www ; à défaut, CrUX est interrogé sur l'adresse saisie puis sur sa jumelle www. Note : « adresse retenue www.monsite.fr ». Le formulaire reprend l'adresse corrigée. |
| Une page redirige ailleurs (panier → connexion, fiche disparue → accueil) | Mesurée telle quelle, avec la note « Panier redirige vers /connexion : c'est cette page qui est mesurée. » |
| Votre propre domaine en concurrent | Refusé : « C'est votre propre site » (www et majuscules compris). Une page équivalente sur votre site aussi. |
| Doublons | Même concurrent deux fois (même domaine, www ou non) ou même page deux fois (même chemin, barre finale ou adresse complète) : « déjà dans la liste ». |
| Page hors de votre site | « Cette page n'est pas sur votre site ». |
| Concurrent sans page équivalente | Refusé tant qu'aucune n'est donnée (l'accueil compte d'office si vous en avez un). |
| Panier | Lighthouse arrive sans article : la note le dit, la comparaison reste juste puisque c'est vrai chez les concurrents aussi. |
| Bandeau cookies | Détecté (requêtes ou tiers d'une plateforme de consentement) : note « Lighthouse mesure la page comme un premier visiteur, bandeau affiché ». |
| Protection anti-robot | Page servie en 401 / 403 / 429 / 503, ou erreur Lighthouse avec ce statut : « Mesure indisponible · protection anti-robot », jamais le score flatteur d'une page de vérification. Chez vous, la note invite à autoriser « Chrome-Lighthouse ». |
| Petit site sans données CrUX | Tuiles terrain neutres « — », jamais d'alerte ; pages mesurées trois fois (médiane) ; note « Trop peu de visites pour les données de Google ». |
| Terrain sur mobile seulement | Chaque appareil se replie seul : tuiles neutres sur ordinateur, note « Vrais visiteurs sur mobile seulement ». |
| API CrUX non activée pour la clé | L'analyse continue avec le terrain fourni par PageSpeed, sans historique ; note dédiée. |
| Analyses irrégulières | Chaque analyse à sa date : l'espacement de la courbe dit le temps écoulé. Jamais un zéro ni une valeur inventée entre deux analyses. |
| Deux analyses le même jour | Deux points ; l'axe montre leurs heures. |
| Dates labo ≠ périodes CrUX | Jamais appariées point à point (voir § 4, Historique). |
| Liste de pages modifiée | La comparaison à périmètre égal recalcule le jeu de pages ; la courbe reprend là où toutes les pages comparées ont une valeur. |
| Mesures en échec | Sorties de la comparaison ; note « 2 mesures indisponibles : ces pages sortent de la comparaison, le reste est classé normalement ». |
| Aucune de vos pages mesurée | Rien n'est enregistré : « Vos résultats précédents sont conservés. » |
| Analyse arrêtée | « Rien n'a été enregistré. » |
| Clé refusée, API PageSpeed désactivée, quota du jour épuisé | L'analyse s'arrête avec la cause et la marche à suivre ; rien n'est enregistré. |
| Stockage du navigateur plein | On garde d'abord moins d'historique terrain, puis moins de semaines labo ; si rien ne tient, le résultat reste affiché dans l'onglet, avec la note « ne sera plus là après la fermeture ». Données illisibles : ignorées, la démo s'affiche. |
| Plusieurs onglets ouverts | Une seule analyse à la fois (verrou partagé, renouvelé toutes les 15 s, libéré à la fermeture) : l'autre onglet affiche « Une analyse est déjà en cours dans un autre onglet. » Un résultat enregistré dans un onglet s'affiche dans les autres. Fermer l'onglet pendant l'analyse demande confirmation. |

#### Cas limites de la vue Comparer *(étudiés avant construction, 17/10/2026)*
| Cas | Comportement |
|---|---|
| Aucun concurrent | Pas de classement sur l'accueil, donc pas d'entrée. Par l'adresse : votre entreprise seule, et « Ajoutez des concurrents dans les réglages pour comparer. » |
| Mesure labo d'un concurrent en échec | Il reste dans les vrais visiteurs (CrUX ne dépend pas du labo). Labo : « indisponible » ; décomposition : dit une fois sous le tableau. |
| Concurrent sans page commune | Vrais visiteurs : présent. Labo page par page : « — » sur les pages qu'il n'a pas. Décomposition : dit une fois sous le tableau, « aucune page comparable ». |
| Site sans données CrUX (petit site) | Pas de ligne sur la courbe ; classement et part de visites bonnes : « Pas assez de visites pour Google », neutre, en bas, sans rang. |
| Vrais visiteurs sur un seul appareil | Sur l'autre, même traitement que ci-dessus. |
| API CrUX non activée | Pas de courbe (« Historique indisponible : API Chrome UX Report non activée ») ; valeurs et part de visites bonnes tirées de la copie de PageSpeed. |
| Historique CrUX troué ou court | Trou dans la courbe ; une ligne commence à sa première semaine connue. |
| Analyse enregistrée avant la vue | Part de visites bonnes « — » jusqu'à la prochaine analyse ; tout le reste s'affiche. |
| Valeurs terrain égales | Pas de rang partagé ni de phrase d'avance : le classement terrain ne revendique rien. |
| Page redirigée | « Rapport Google › » ouvre l'adresse effectivement mesurée. |
| Rapport Google | Il relance une mesure chez Google : ses chiffres peuvent différer de quelques points (le labo varie). Dit au survol du lien. |
| Réactivité en labo | Le labo ne mesure pas l'INP : la ligne s'intitule « Temps de blocage (labo) ». |
| Plus de 4 concurrents | 4 courbes au plus : une fois 4 pastilles choisies, les autres sont grisées. Classements et barres restent complets. |
| Toutes les pastilles décochées | Seule votre courbe reste. |
| Pastille d'un concurrent retiré | Ignorée ; à défaut de choix valable, les plus proches de vous. |
| Onglet inconnu dans l'adresse | Onglet Score. |
| Appareil jamais mesuré | Même état que l'accueil, avec la bascule. |
| Décomposition et arrondis | Les points perdus s'additionnent à 100 − score à un point près (arrondis) ; entiers seulement. |
| Site entier | Labo page par page : une seule ligne, l'accueil. |
| Nom d'entreprise long | Tronqué ; « vous » reste visible ; nom complet au survol. |
| Démo | Complète : la part de visites bonnes y est simulée à partir des valeurs p75. |

#### Cas limites des effets et du simulateur *(étudiés avant construction, 18/10/2026)*
| Cas | Comportement |
|---|---|
| Aucune action cochée | « Aujourd'hui 72 · 3e place » ; la flèche s'estompe, sans pastille de gain ; à droite : « Cochez une action pour voir son effet ». Pas de segment hachuré. |
| Gain de la pastille | L'écart entre les deux chiffres affichés (≈ 86 − 72 = +14), égal à la somme des gains cochés. |
| Une seule action proposée | Elle se coche et se décoche comme les autres. |
| Gains combinés | Les actions cochées gardent l'ordre du plan ; chaque marche est l'écart entre deux scores arrondis, donc les gains cochés s'additionnent exactement au chiffre d'arrivée. |
| Gain d'une action décochée | Ce qu'elle ajouterait à la sélection actuelle (combiné sans double compte), en gris. |
| Échelle de la jauge | Fixée sur le plan complet : la barre ne saute pas quand on décoche. |
| Titre de la section | Celui du plan complet (« pour passer 2e ») ; c'est le résultat sous les chiffres qui suit la sélection. |
| Changement d'appareil | Chaque appareil garde sa sélection pendant la visite ; un rechargement repart du plan complet. |
| Clavier, lecteur d'écran | Chaque ligne est un bouton coché / décoché ; le résumé est annoncé quand il change. |
| Animations réduites | Mises à jour instantanées : pas de défilement de chiffres, pas de rang qui tourne, pas de reflet, pas de transition de fin d'analyse. |
| Rang inchangé, première analyse, pages comparées différentes | Le rang ne tourne pas. |
| Place gagnée ou perdue | Le rang tourne dans les deux sens ; le reflet n'accompagne qu'une place gagnée. |
| En tête | « 2e » tourne jusqu'à « en tête ». |
| Sans concurrent | Pas de rang : rien ne tourne. |
| Moment déjà vu | Rang qui tourne, glissement et reflet : une fois par analyse et par appareil, comme le moment de victoire. |
| Démo | Elle montre le rang qui tourne (4e → 3e), le glissement et le reflet, une fois. |
| Fin d'analyse vue sur l'écran d'analyse | La transition joue : le grand rang au centre, puis il se range dans la phrase. Le rang qui tourne a lieu dans ce grand chiffre, pas une seconde fois dans la phrase. |
| Fin d'analyse alors qu'on est ailleurs, ou onglet caché | Pas de transition : le rang tournera à votre retour sur l'accueil. |
| Courbe sans concurrent à battre tracé | Aucune ligne n'est mise en avant, aucune n'est estompée. |
| Une pastille au plus | Victoire (ou place perdue) d'abord ; sinon l'évolution sur 6 mois ; sinon aucune. |

## 6. Vérification des chantiers *(retirée le 18/10/2026)*
Allure ne suit pas les actions menées : pas de statut *En cours* / *Livré*, pas de preuve par chantier. L'effet d'une action se voit là où se voit tout le reste : la courbe, et l'évolution de chaque score dans le classement à l'analyse suivante.

---

## 7. Design — luxe discret, management visuel

*Révisé le 17/10/2026 : le premier prototype, de style « éditorial couture » (serif Didone, phrases), était trop textuel. La direction est maintenant celle d'un produit haut de gamme façon Apple.*

- **Esprit** : un produit Apple ou un objet haut de gamme, plus luxe que mode. On décide au premier regard ; les explications sont dans les fiches.
- **Management visuel** : anneaux, tuiles, gros chiffres, matrice impact × effort. **La couleur signale une exception** : ce qui va bien reste neutre, ce qui pose problème se teinte.
- **Couleurs** : surfaces neutres (gris très clair et blanc le jour, noir et graphite la nuit). **Une seule couleur d'attention**, l'orange, pour *À améliorer*, sur le chiffre seulement, avec l'écart au survol (« 8 pts sous le seuil de 80 »), le seuil écrit dans une tuile, et un libellé pour les lecteurs d'écran. *Bon* reste neutre, sans vert ; les gains et progrès sont neutres aussi.
- **Thèmes** : clair et sombre, selon le réglage du système, avec une bascule manuelle (icône soleil / lune).
- **Typographie** : SF Pro sur les appareils Apple, Inter ailleurs ; titres en semi-gras, interlettrage serré ; titres en deux tons (encre et gris).
- **Composants** : barre supérieure translucide, sélecteur segmenté Mobile / Ordinateur (dans la carte d'accueil), cartes à grands rayons et ombres douces, pastilles, bouton principal en pilule.
- **Mouvement** : apparitions courtes, anneau et courbes qui se dessinent ; tout est désactivé si l'utilisateur réduit les animations.
- **Graphiques** : en SVG, dessinés à la main (Chart.js est retiré).
- **Langue** : bilingue FR / EN, selon la langue du navigateur, avec une bascule dans l'en-tête. Tous les textes sont dans un dictionnaire unique.
- **Responsive** : lisible sur mobile, avec un minimum de 16 px de marge latérale.

---

## 8. Architecture

Modules JavaScript natifs, **sans build, sans dépendance**. Publication sur GitHub Pages. En local, il faut un petit serveur, car les modules ne se chargent pas en `file://` :

```bash
node serve.mjs
```

(`serve.mjs` : un serveur statique en Node natif, sans dépendance ni téléchargement.)

```
index.html
styles.css            tokens (clair/sombre), print, responsive
serve.mjs             serveur local sans dépendance
src/
  app.js              état + routage (#/ · #/page/:id · #/fix/:id · #/analyze · #/settings), onglets multiples
  api.js              PSI v5, CrUX queryRecord, CrUX queryHistoryRecord : débit limité, relances
  analyze.js          une analyse réelle : mesures, repli terrain, causes, notes → la forme de demo.js
  project.js          paramétrage, contrôles, résultats enregistrés, historique hebdomadaire, verrou
  url.js              normalisation des adresses, identifiants stables
  storage.js          interface unique — localStorage aujourd'hui, backend en phase 2
  metrics.js          seuils, santé d'une page, catalogue d'audits, poids suggéré
  prioritize.js       regroupement, gain normalisé, poids, effort
  verify.js           comparaisons avant / après
  demo.js             projet de démonstration
  i18n.js             dictionnaires FR / EN, formats
  charts.js           graphiques SVG
  html.js             échappement
  views/              accueil, analyse, fiche page, fiche chantier, réglages, brief imprimable
README.md             captures clair/sombre, lien démo, limites assumées
```

### Couleurs de statut (deux niveaux)
| | Clair | Sombre |
|---|---|---|
| Bon | neutre (`--fill`) | neutre (`--fill`) |
| À améliorer (inclut « mauvais ») | `#C97700` (3,4:1 sur blanc) | `#FF9F0A` |

---

## 9. Hors périmètre v0.1 → phase 2
- **Données partagées** : mesures planifiées côté serveur, historique commun, lien partageable.
- Alertes de régression (e-mail, Slack).
- Plusieurs projets.
- Parcours enchaînés (nécessitent un navigateur piloté).
- Estimation de l'impact en €.

## 10. Limites à assumer (README)
- CrUX ne couvre que les pages et sites qui ont assez de trafic. Un petit site passera surtout en *estimation labo*.
- En local, la clé API est stockée dans le navigateur (et envoyée à Google seulement). Elle passera côté serveur en phase 2.
- Une clé Google est indispensable : PageSpeed n'accorde plus de quota sans clé.
- L'historique du score PageSpeed ne se construit que si l'on relance l'analyse chaque semaine (planification côté serveur en phase 2).
- Les gains sont des **estimations** de Lighthouse. La vérification terrain sert de juge final.
