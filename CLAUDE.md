@AGENTS.md
Oui. Voici une V1 structurée du cahier des charges de ZINDO, pensée comme une vraie base de développement pour une application de gestion de stock adaptée aux commerces au Burkina Faso.
CAHIER DES CHARGES — ZINDO V1
Nom de l’application : ZINDO
Version : V1.0
Type : Application de gestion de stock et de ventes
Plateformes ciblées : Android, iOS et Windows
Langue principale : Français
Créateur : Coulibaly SOMA
1. Présentation du projet
ZINDO est une application de gestion de stock destinée aux commerçants, boutiques, magasins, grossistes, ateliers et petites entreprises.
L'objectif est de permettre à un utilisateur de :
enregistrer ses produits ;
connaître son stock en temps réel ;
enregistrer les entrées et sorties ;
effectuer des ventes ;
imprimer ou partager des tickets ;
suivre ses achats ;
connaître ses bénéfices ;
recevoir des alertes lorsque les stocks sont faibles ;
consulter l'historique de ses opérations ;
gérer ses clients et fournisseurs.
L'application doit être simple pour un débutant, mais suffisamment complète pour être utilisée par un commerce professionnel.
2. Objectifs de ZINDO
Objectif principal
Remplacer les cahiers et fichiers Excel utilisés pour suivre les marchandises par une solution numérique simple et accessible.
Objectifs secondaires
ZINDO doit permettre de :
réduire les erreurs de stock ;
éviter les ruptures de marchandises ;
connaître la valeur du stock ;
suivre les ventes ;
suivre les dépenses et achats ;
calculer automatiquement les bénéfices ;
identifier les produits les plus vendus ;
conserver l'historique des opérations ;
faciliter la gestion de plusieurs employés ;
produire des rapports.
3. Utilisateurs ciblés
ZINDO V1 doit pouvoir être utilisé par :
boutiques générales ;
magasins de pièces détachées ;
boutiques de motos ;
quincailleries ;
alimentations ;
pharmacies* ;
magasins d'électronique ;
magasins de vêtements ;
grossistes ;
demi-grossistes ;
ateliers ;
dépôts ;
petits commerces.
* Pour les activités réglementées, les fonctionnalités spécifiques devront être adaptées à la réglementation applicable.
4. Fonctionnalités principales
4.1 Création du compte
L'utilisateur peut créer son compte avec :
nom ;
prénom ;
numéro de téléphone ;
adresse e-mail facultative ;
mot de passe ;
nom du commerce ;
activité ;
ville/pays.
Connexion :
téléphone + mot de passe ;
ou e-mail + mot de passe.
Prévoir également :
déconnexion ;
récupération du mot de passe ;
modification du profil.
5. Tableau de bord
Après connexion, l'utilisateur arrive sur un tableau de bord.
Il doit voir immédiatement :
Statistiques
chiffre d'affaires du jour ;
chiffre d'affaires du mois ;
bénéfice estimé ;
nombre de produits ;
valeur totale du stock ;
nombre de ventes ;
produits en rupture ;
produits bientôt en rupture.
Exemple
Aujourd'hui
Ventes : 125 000 FCFA
Bénéfice estimé : 32 500 FCFA
Produits vendus : 47
Stock total : 4 850 000 FCFA
6. Gestion des produits
L'utilisateur peut créer un produit.
Informations du produit
nom ;
référence ;
catégorie ;
marque ;
description ;
unité ;
prix d'achat ;
prix de vente ;
quantité initiale ;
stock minimum ;
emplacement ;
fournisseur ;
photo ;
code-barres.
Exemple
Produit : Plaquette de frein
Référence : FR-001
Catégorie : Freinage
Prix d'achat : 3 000 FCFA
Prix de vente : 4 500 FCFA
Stock : 25
Stock minimum : 5
7. Code-barres
ZINDO V1 doit pouvoir gérer les codes-barres.
L'utilisateur peut :
scanner un code-barres avec le téléphone ;
rechercher un produit avec son code ;
associer un code-barres à un produit ;
utiliser un lecteur de codes-barres sur ordinateur ;
imprimer une étiquette avec code-barres.
Important : tous les produits ne sont pas obligés d'avoir un code-barres. ZINDO doit également fonctionner avec une référence créée manuellement.
8. Gestion des catégories
L'utilisateur peut créer ses propres catégories.
Exemples :
Moteurs ;
Freinage ;
Électricité ;
Pneus ;
Batteries ;
LED ;
Accessoires ;
Lubrifiants.
Actions :
ajouter ;
modifier ;
supprimer ;
rechercher.
9. Gestion du stock
Chaque produit possède un stock en temps réel.
Le système doit enregistrer :
Entrées
achat ;
retour client ;
correction de stock ;
inventaire.
Sorties
vente ;
produit endommagé ;
perte ;
retour fournisseur ;
correction.
Chaque mouvement doit être enregistré avec :
date ;
heure ;
produit ;
quantité ;
utilisateur ;
motif ;
ancien stock ;
nouveau stock.
10. Gestion des ventes
L'écran de vente doit fonctionner comme une caisse enregistreuse.
L'utilisateur peut :
rechercher un produit ;
scanner son code-barres ;
sélectionner la quantité ;
ajouter plusieurs produits au panier ;
appliquer une remise ;
sélectionner le client ;
choisir le moyen de paiement ;
valider la vente.
Moyens de paiement
Prévoir :
espèces ;
mobile money ;
carte bancaire ;
paiement à crédit ;
autre.
Les moyens de paiement doivent pouvoir être configurés selon les besoins du commerce.
11. Ticket de caisse
Après une vente, ZINDO doit générer un ticket.
Le ticket contient :
Nom du commerce
Téléphone
Adresse
N° de vente
Date / heure
Produit
Qté
Prix
Produit A
2
5 000
Produit B
1
3 500
TOTAL : 13 500 FCFA
Paiement : Espèces
Merci pour votre visite.
Le ticket doit pouvoir être :
imprimé ;
enregistré en PDF ;
partagé ;
envoyé au client.
12. Impression
ZINDO V1 doit prévoir la compatibilité avec :
imprimantes thermiques ;
imprimantes classiques ;
impression A4 ;
impression de tickets 58 mm ;
impression de tickets 80 mm.
L'application doit permettre de configurer l'imprimante.
13. Gestion des clients
Créer une fiche client contenant :
nom ;
téléphone ;
adresse ;
historique des achats ;
montant total acheté ;
crédit éventuel ;
paiements effectués.
Exemple
Client : Moussa Traoré
Téléphone : 70 XX XX XX
Achats : 350 000 FCFA
Crédit restant : 25 000 FCFA
14. Gestion des crédits
ZINDO doit permettre de vendre à crédit.
Lorsqu'une vente est faite à crédit :
le montant dû est enregistré ;
le client est associé à la dette ;
l'échéance peut être indiquée ;
les remboursements sont enregistrés.
Le système doit afficher :
Total des crédits : 850 000 FCFA
et permettre de voir :
qui doit de l'argent ;
combien ;
depuis quand ;
les remboursements.
15. Gestion des fournisseurs
Fiche fournisseur :
nom ;
entreprise ;
téléphone ;
adresse ;
produits fournis ;
historique des achats ;
dettes éventuelles.
16. Gestion des achats
Lorsqu'un commerçant reçoit une marchandise :
sélectionner le fournisseur ;
sélectionner les produits ;
saisir les quantités ;
saisir le prix d'achat ;
valider.
Le stock augmente automatiquement.
Exemple :
Achat de 50 batteries
Prix d'achat : 15 000 FCFA
Total : 750 000 FCFA
17. Alertes de stock
ZINDO doit prévenir l'utilisateur lorsqu'un produit atteint son stock minimum.
Exemple :
⚠️ Stock faible
Batterie 12V
Stock actuel : 3
Stock minimum : 5
Autres alertes :
produit en rupture ;
produit bientôt périmé, si cette fonction est activée ;
stock anormal ;
inventaire nécessaire.
18. Inventaire
Fonction permettant de comparer :
Stock théorique
avec
Stock réellement présent dans le magasin.
Exemple :
Stock informatique : 100
Stock réel : 97
Écart :
-3
L'utilisateur peut ensuite valider la correction.
19. Historique
ZINDO doit conserver l'historique de toutes les opérations.
Filtres :
aujourd'hui ;
hier ;
cette semaine ;
ce mois ;
période personnalisée.
Types :
ventes ;
achats ;
entrées ;
sorties ;
corrections ;
crédits ;
paiements.
20. Rapports
ZINDO V1 doit produire des rapports simples.
Rapport des ventes
chiffre d'affaires ;
nombre de ventes ;
produit vendu ;
quantité ;
bénéfice estimé.
Rapport de stock
stock actuel ;
valeur du stock ;
produits en rupture ;
produits à faible stock.
Rapport des achats
montant des achats ;
fournisseurs ;
produits achetés.
Rapport des bénéfices
Le système calcule :
Bénéfice = Prix de vente − Prix d'achat
avec prise en compte des quantités vendues.
21. Recherche
Une barre de recherche globale doit permettre de rechercher :
produit ;
référence ;
code-barres ;
client ;
fournisseur ;
vente ;
ticket.
La recherche doit être rapide même avec plusieurs milliers de produits.
22. Gestion des utilisateurs
Le propriétaire peut créer des comptes pour ses employés.
Administrateur
Peut :
tout consulter ;
modifier ;
supprimer ;
gérer les utilisateurs ;
consulter les rapports.
Vendeur
Peut :
effectuer des ventes ;
consulter les produits ;
consulter les clients.
Gestionnaire de stock
Peut :
ajouter des produits ;
effectuer des entrées ;
effectuer des sorties ;
faire l'inventaire.
Les permissions doivent être configurables.
23. Sécurité
ZINDO doit protéger les données.
Prévoir :
authentification ;
mots de passe sécurisés ;
rôles et permissions ;
sauvegardes ;
historique des actions ;
protection contre la suppression accidentelle ;
confirmation avant suppression importante.
24. Fonctionnement hors connexion
Une fonctionnalité très importante pour le Burkina Faso :
ZINDO V1 doit pouvoir continuer à fonctionner sans connexion Internet pour les fonctions essentielles.
Par exemple :
consulter les produits ;
effectuer une vente ;
enregistrer une entrée ;
enregistrer une sortie ;
consulter l'historique local.
Lorsque la connexion revient, les données peuvent être synchronisées avec le serveur.
25. Sauvegarde
Prévoir :
Sauvegarde locale
Les données sont conservées sur l'appareil.
Sauvegarde en ligne
Une copie sécurisée est conservée sur le serveur lorsque Internet est disponible.
Le système doit pouvoir restaurer les données en cas de changement de téléphone ou d'ordinateur.
26. Interface
L'interface doit être :
moderne ;
professionnelle ;
rapide ;
simple ;
adaptée aux petits écrans ;
adaptée aux ordinateurs ;
facile à comprendre pour quelqu'un qui n'est pas informaticien.
Menu principal
Tableau de bord
Ventes
Produits
Stock
Achats
Clients
Fournisseurs
Rapports
Inventaire
Paramètres
27. Écrans de la V1
La première version doit au minimum comporter :
Écran de démarrage
Connexion
Création de compte
Tableau de bord
Produits
Ajouter produit
Modifier produit
Détails produit
Scanner code-barres
Stock
Entrée stock
Sortie stock
Vente/Caisse
Panier
Paiement
Ticket
Clients
Détails client
Crédits
Fournisseurs
Achats
Inventaire
Historique
Rapports
Utilisateurs
Paramètres
Profil
Sauvegarde
28. Architecture technique proposée
Pour pouvoir développer une seule base de code compatible avec plusieurs plateformes :
Frontend
Flutter
Cible :
Android ;
iOS ;
Windows.
Backend
Possibilité d'utiliser :
Node.js ;
API REST ;
PostgreSQL.
Stockage local
Utiliser une base locale permettant le fonctionnement hors connexion.
Synchronisation
Architecture :
Application → Base locale → Serveur → Base centrale
avec synchronisation automatique lorsque la connexion est disponible.
29. Base de données principale
Tables principales :
users
businesses
roles
products
categories
stock_movements
sales
sale_items
purchases
purchase_items
customers
customer_payments
suppliers
supplier_payments
inventories
inventory_items
expenses
payments
notifications
audit_logs
30. Identifiant des produits
Chaque produit doit avoir un identifiant unique.
Exemple :
ZND-000001
Même si deux produits portent le même nom, ils doivent pouvoir être différenciés par leur référence.
31. Paramètres du commerce
L'utilisateur peut configurer :
nom du commerce ;
logo ;
téléphone ;
adresse ;
devise ;
format du ticket ;
imprimante ;
moyens de paiement ;
seuil de stock ;
utilisateurs ;
permissions.
32. Devise
La V1 doit prendre en charge le FCFA (XOF) comme devise principale.
L'architecture devra toutefois permettre d'ajouter d'autres devises ultérieurement.
33. Modèle économique envisagé
ZINDO peut utiliser un modèle Freemium.
Gratuit
nombre limité de produits ;
ventes ;
stock ;
clients ;
fonctionnalités essentielles.
Premium
produits illimités ;
rapports avancés ;
plusieurs utilisateurs ;
synchronisation avancée ;
sauvegarde cloud ;
statistiques avancées ;
multi-boutiques.
Les prix seront définis après validation du marché.
34. Priorités de développement V1
🔴 Priorité absolue
connexion ;
produits ;
stock ;
ventes ;
achats ;
clients ;
fournisseurs ;
caisse ;
tickets ;
historique.
🟠 Priorité importante
codes-barres ;
inventaire ;
crédits ;
rapports ;
utilisateurs ;
permissions.
🟢 Priorité secondaire
statistiques avancées ;
personnalisation poussée ;
multi-boutiques ;
fonctionnalités cloud avancées.
35. Résultat attendu de ZINDO V1
À la fin du développement, un commerçant doit pouvoir installer ZINDO, créer son commerce et commencer immédiatement à :
Ajouter ses produits → enregistrer son stock → vendre → encaisser → imprimer le ticket → suivre son stock → suivre ses bénéfices.
L'application doit être suffisamment simple pour une petite boutique, mais son architecture doit permettre d'évoluer ensuite vers une solution professionnelle beaucoup plus complète.
Vision des futures versions
ZINDO V1 → Stock + caisse + ventes
ZINDO V2 → Comptabilité + dépenses + statistiques avancées
ZINDO V3 → Multi-boutiques + cloud + gestion avancée
ZINDO V4 → ERP complet pour commerces et entreprises
Si tu veux, je peux ensuite �⁠transformer cette V1 en cahier des charges V2 beaucoup plus professionnel, avec �⁠tous les écrans détaillés, �⁠les boutons de chaque écran, �⁠les règles métier, �⁠la base de données complète, �⁠l'architecture Flutter/Backend et �⁠les instructions directement utilisables dans Claude Code/VS Code.