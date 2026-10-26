# Héberger ZINDO gratuitement sur Render

L'offre gratuite de Render ne demande normalement pas de carte bancaire (à confirmer à l'inscription). Son principal inconvénient : le site **s'endort après 15 minutes sans visite** et met environ **une minute** à se réveiller à la visite suivante. La caisse hors ligne continue de fonctionner pendant ce temps (voir plus bas).

La base de données reste chez Supabase. Seul le site change d'hébergeur.

## Avant de commencer

- Ne touchez à rien chez Netlify : il reste en ligne tant que le domaine n'a pas été basculé (étape 5).
- Le fichier `render.yaml` doit être dans le dépôt GitHub (branche `main`).
- Chaque envoi sur `main` relance aussi une compilation chez Netlify (15 crédits). Regroupez vos changements.

## 1. Préparer les variables d'environnement

Les variables sont les mêmes que chez Netlify. Pour recréer le fichier (il reste sur votre ordinateur, ignoré par git) :

```
bash deploy/oracle/make-env.sh deploy/oracle/.env.render
```

Ajoutez dans ce fichier une ligne `NEXT_PUBLIC_APP_URL="https://www.zindo.site"`. Le domaine ne change pas, donc cette valeur reste la même avant et après la bascule : pas besoin de redéployer après le switch DNS. Cette variable est lue pendant la compilation.

## 2. Créer le service

1. Créez un compte sur https://render.com avec « Continue with GitHub ».
2. **New +** puis **Blueprint** : choisissez le dépôt ZINDO. Render lit `render.yaml` et propose le service `zindo` en offre **Free**.
3. Ouvrez le service puis **Environment** : bouton **Add from .env**, collez le contenu de `deploy/oracle/.env.render`, enregistrez.
4. Lancez le déploiement (**Manual Deploy** puis **Deploy latest commit**). Comptez 5 à 10 minutes.

Ouvrez ensuite `https://zindo.onrender.com` et testez la connexion avec le compte « Claude Essai ».

## 3. Tâches de nuit

Render gratuit n'a pas de tâches planifiées. Créez un compte gratuit sur https://cron-job.org et ajoutez deux tâches, chacune avec l'en-tête `Authorization: Bearer <valeur de CRON_SECRET>` :

| Adresse | Heure |
| --- | --- |
| `https://www.zindo.site/api/cron/faso-stock-sync` | 03:00 |
| `https://www.zindo.site/api/cron/purge-corbeille` | 03:30 |

## 4. Si le service plante par manque de mémoire

L'offre gratuite donne 512 Mo. Dans les journaux Render, un message « Out of memory » signifie que la limite est dépassée. Dans ce cas, baissez `--max-old-space-size` dans `render.yaml` (par exemple 320), ou passez à une offre payante.

## 5. Basculer le domaine (en dernier)

1. Render : **Settings** puis **Custom Domains**, ajoutez `www.zindo.site`. Render affiche la valeur exacte à utiliser.
2. Hostinger, zone DNS : remplacez l'enregistrement CNAME `www` (aujourd'hui `zindo-burkina.netlify.app`) par la valeur donnée par Render.
3. **Ne touchez jamais** aux enregistrements MX, TXT (Zoho) et au CNAME de Resend.
4. Attendez le certificat HTTPS (quelques minutes). Si un problème survient, remettez l'ancien CNAME : Netlify reprend aussitôt.

Le domaine ne change pas : la connexion Google et les paiements YiriwaPay continuent de fonctionner sans réglage.

## Pendant le réveil du site

La caisse hors ligne enregistre les ventes sur l'appareil et les synchronise au retour du serveur. Seule la première ouverture de l'application après une longue pause peut être lente.
