-- Durée de l'essai gratuit réglable depuis /admin/abonnements
-- (lib/platform-config.ts getTrialDays). Tant que cette migration n'est pas
-- appliquée, l'application utilise 14 jours par défaut.
alter table platform_config add column if not exists trial_days int not null default 14;
alter table platform_config drop constraint if exists platform_config_trial_days;
alter table platform_config add constraint platform_config_trial_days check (trial_days between 1 and 365);
