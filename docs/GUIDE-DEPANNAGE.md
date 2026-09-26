# Que faire quand ZINDO casse

Ce guide est fait pour être suivi seul, sans aide, même stressé.
Lis-le une fois à tête reposée, **avant** d'en avoir besoin.

---

## 0. À faire une seule fois (maintenant)

### Brancher Sentry en production

Sentry te prévient quand un client a une erreur. Aujourd'hui, la clé n'existe
que sur ton ordinateur (`.env.local`) : en ligne, Sentry ne reçoit rien.

1. Ouvre `.env.local` et copie la valeur de `NEXT_PUBLIC_SENTRY_DSN`
   (la ligne qui commence par `https://`).
2. Va sur vercel.com, projet **zindo**, puis **Settings > Environment Variables**.
3. Ajoute la variable :
   - nom : `NEXT_PUBLIC_SENTRY_DSN` ;
   - valeur : ce que tu as copié ;
   - environnement : **Production** (coche aussi Preview si tu veux).
4. Refais un déploiement : **Deployments**, les trois points du dernier déploiement,
   puis **Redeploy**. Sans cela, la variable n'est pas prise en compte.

### Recevoir un e-mail à chaque nouvelle erreur

1. Va sur sentry.io, organisation **zindo-vk**, projet Next.js.
2. Menu **Alerts** : vérifie qu'une règle du type « A new issue is created »
   existe et envoie un e-mail. Sinon, crée-la (**Create Alert > Issues**).
3. Vérifie dans **User Settings > Notifications** que ton adresse reçoit bien
   les alertes.

### Savoir où sont les sauvegardes

Va sur supabase.com, ton projet, puis **Database > Backups**. Regarde ce que
ton offre garde. Si l'offre gratuite ne garde rien de restaurable, fais une
sauvegarde manuelle chaque semaine (voir la section 6).

---

## 1. Un commerçant appelle : « ça ne marche pas »

Garde toujours cet ordre : **rassurer → couper → comprendre → réparer → prévenir.**

1. **Rassurer.** « Je regarde tout de suite. En attendant, notez vos ventes sur
   un papier, on les saisira après. »
2. **Demander trois choses :**
   - quel écran (caisse, produits, crédits…) ;
   - ce qu'il a fait juste avant ;
   - le message affiché (une photo de l'écran, c'est le mieux).
3. **Savoir si ça touche tout le monde ou lui seul :** essaie la même chose
   avec le compte **Claude Essai** (76090106).
   - Ça casse aussi chez toi : le problème est général, passe à l'étape 2 ou 3.
   - Ça marche chez toi : le problème vient de ses données ou de son appareil
     (connexion, vieux navigateur, cache). Demande-lui de recharger la page,
     ou de se déconnecter puis se reconnecter.

---

## 2. Couper une fonctionnalité (sans toucher au code)

Si l'erreur vient d'une fonctionnalité récente derrière un flag :

1. Va sur **www.zindo.site/admin/fonctionnalites**.
2. Trouve le flag concerné (le nom est dans le commit ou dans ta mémoire).
3. Désactive-le pour ce commerce, ou globalement si tout le monde est touché.

Le commerçant retrouve immédiatement l'ancien fonctionnement. Tu répareras
tranquillement ensuite.

---

## 3. Revenir à la version d'hier (sans toucher au code)

Si tout a cassé juste après une mise à jour :

1. Va sur vercel.com, projet **zindo**, onglet **Deployments**.
2. Trouve le dernier déploiement qui marchait (regarde la date et le message
   du commit).
3. Clique sur les trois points, puis **Promote to Production**
   (ou **Instant Rollback**).

En une minute, le site revient à cette version.

⚠️ **Attention aux migrations SQL.** Revenir en arrière change le code, pas la
base de données. Si la mise à jour cassée avait appliqué une migration, l'ancien
code peut ne plus correspondre à la base. Dans ce cas, le flag (section 2) est
souvent plus sûr.

⚠️ **L'application Windows** embarque son propre code : un retour en arrière sur
Vercel ne la change pas. Il faudra réinstaller l'ancienne version de
l'installateur (`dist-desktop/`).

---

## 4. Comprendre l'erreur

### Sentry (le plus rapide)

sentry.io, puis **Issues**. Chaque erreur indique :

- le message (souvent suffisant pour comprendre) ;
- le fichier et la ligne ;
- le nombre de personnes touchées et depuis quand.

Les erreurs rattrapées dans le code (celles qui affichent « Une erreur
inattendue est survenue » à la caissière) remontent aussi dans Sentry.

### Les logs Vercel

vercel.com, projet **zindo**, onglet **Logs**. Filtre sur **Error** et sur
l'heure indiquée par le commerçant. Les messages commencent souvent par un
repère entre crochets, par exemple `[sales]` ou `[createSaleAction]` : cherche
ce mot dans le code avec Ctrl+Maj+F dans VS Code, et tu trouves le fichier.

### Les messages fréquents

| Message | Cause probable | Que faire |
|---|---|---|
| `Could not find the function ...` | Une migration SQL n'a pas été appliquée | Applique le fichier de `supabase/migrations/` concerné (section 5) |
| `column ... does not exist` | Même chose : migration manquante | Même chose |
| `new row violates row-level security` | Règle de sécurité (RLS) de la base | Regarde les migrations `rls_*` ; ce n'est pas un bug de l'écran |
| `Failed to find Server Action` | Page restée ouverte pendant une mise à jour | Recharger la page |
| `fetch failed`, `timeout` | Supabase ou le réseau du commerçant | Vérifie status.supabase.com, puis réessaie |
| `Échec de l'ajustement du stock` | La fonction `adjust_stock` a échoué | Vérifie qu'elle existe dans Supabase (SQL Editor) |

---

## 5. Réparer

### Appliquer une migration oubliée

1. Ouvre le fichier dans `supabase/migrations/` (le nom commence par la date).
2. Copie tout son contenu.
3. supabase.com, ton projet, **SQL Editor** : colle, puis **Run**.
4. Vérifie qu'il n'y a pas d'erreur en rouge.

### Corriger le code

1. Reproduis l'erreur en local : `npm run dev`, puis connecte-toi avec
   Claude Essai.
2. Corrige.
3. Vérifie avant de pousser :
   - `npx tsc --noEmit` (erreurs de types) ;
   - `npm run build` (obligatoire si tu as touché à `lib/actions/`).
4. Commite et pousse : Vercel déploie tout seul.
5. Vérifie que le déploiement est **Ready** sur Vercel, puis refais le test
   avec Claude Essai **en ligne**.

### Demander de l'aide à une IA (offre gratuite)

Une seule question, précise, avec tout ce qu'il faut :

> Mon application Next.js (ZINDO) affiche cette erreur : `<message exact>`.
> Elle vient de ce fichier : `<colle le fichier ou la fonction>`.
> Le commerçant faisait : `<l'action>`. Comment corriger ?

Jamais de mot de passe ni de clé secrète dans la question.

---

## 6. Protéger les données

- **Sauvegarde manuelle chaque semaine :** supabase.com, **Database > Backups**,
  ou demande l'export depuis **Project Settings**. Garde le fichier sur une clé
  USB ou un disque, pas seulement sur le PC.
- **Ne jamais exécuter** dans le SQL Editor une commande `DELETE` ou `UPDATE`
  sans `WHERE`. Relis-la deux fois.
- En cas de données abîmées chez un commerçant : note d'abord ce qui est faux
  (captures d'écran), puis corrige. L'historique `stock_movements` garde
  l'ancien et le nouveau stock de chaque mouvement : il sert à retrouver la
  vérité.

---

## 7. Prévenir le commerçant

Quand c'est réparé, appelle ou écris-lui :

> Bonjour, le problème de `<écran>` est réglé. Vous pouvez saisir les ventes
> notées sur papier. Merci pour votre patience.

Un commerçant bien traité pendant une panne devient souvent plus fidèle
qu'avant.

---

## Liens utiles

- Site : https://www.zindo.site
- Administration des flags : https://www.zindo.site/admin/fonctionnalites
- Vercel : https://vercel.com (projet `zindo`)
- Supabase : https://supabase.com/dashboard
- Sentry : https://sentry.io (organisation `zindo-vk`)
- État de Supabase : https://status.supabase.com
- État de Vercel : https://www.vercel-status.com
