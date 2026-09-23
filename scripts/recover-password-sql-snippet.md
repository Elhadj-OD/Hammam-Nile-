# Récupération d'accès — définir un mot de passe directement en SQL

À utiliser UNIQUEMENT si le mot de passe temporaire généré par la
migration a été perdu et qu'aucun compte gérant n'est encore accessible
pour utiliser le bouton "Réinitialiser le mot de passe" de l'app.

Coller dans Supabase > SQL Editor, remplacer `'VotreNouveauMotDePasse'`
par un mot de passe de votre choix (au moins 6 caractères), puis Run.

```sql
UPDATE auth.users
SET encrypted_password = extensions.crypt('VotreNouveauMotDePasse', extensions.gen_salt('bf'))
WHERE email = 'sophia@hammamnile.local';
```

Ensuite, connectez-vous dans l'app avec `sophia` + `VotreNouveauMotDePasse`.
L'écran "nouveau mot de passe requis" apparaîtra quand même (le drapeau
`must_change_password` reste à `true` en base) — changez-le une dernière
fois depuis l'app pour repartir sur un mot de passe propre.

Répétez pour les autres comptes si besoin (changez juste l'e-mail dans
le `WHERE`).
