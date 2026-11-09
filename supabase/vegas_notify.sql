-- Copie de la fonction de la base qui envoie les notifications (à coller dans Supabase → SQL Editor → Run).
-- Elle est appelée par le trigger « vegas_notify » (AFTER INSERT ON vegas_suivi) et appelle la fonction Edge « vegas-push ».
-- La clé privée VAPID est dans la table vegas_push_cfg, jamais ici.
CREATE OR REPLACE FUNCTION public.vegas_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  c jsonb := coalesce(new.coches, '{}'::jsonb);
  a text := coalesce(nullif(c->>'a', ''), nullif(c->>'par', ''), nullif(c->>'p', ''), 'Quelqu''un');
  lieu text := case when c->>'s' = 'france' then '🥐' else '🎰' end;
  heures text := to_char(now() at time zone 'America/Los_Angeles', 'HH24"h"MI') || ' à Vegas · '
              || to_char(now() at time zone 'Europe/Paris', 'HH24"h"MI') || ' en France';
  base text := 'https://elangebbakambo-prog.github.io/jeux-evg/vegas/';
  lien text := base || '#live';
  titre text; corps text; etiquette text; urg text := 'normal'; cible text := null;
  cfg record; abonnes jsonb; resto text;
begin
  if new.nom like 'post:%' then
    if coalesce(c->>'x', '') = 'true' then return new; end if;
    -- Plusieurs photos d'un coup : une seule notif (sur la première), les suivantes ont « b »
    if coalesce(c->>'b', '') <> '' then return new; end if;
    if coalesce(c->>'g', '') <> '' then titre := '📍 ' || a || ' est perdu ! Touche pour voir où il est'; urg := 'high';
    elsif coalesce(c->>'m', '') <> '' then titre := '⚡ ' || a || ' ' || lieu || ' a posté sa photo du Moment';
    elsif coalesce(c->>'v', '') <> '' then titre := '🎥 ' || a || ' ' || lieu || ' a posté une vidéo';
    elsif coalesce((c->>'n')::int, 1) > 1 then titre := '📸 ' || a || ' ' || lieu || ' a posté ' || (c->>'n') || ' stories';
    elsif coalesce(c->>'h', '') = 'true' then titre := '📸 ' || a || ' ' || lieu || ' a posté une story';
    else titre := '💬 ' || a || ' ' || lieu || ' a écrit sur le Live';
    end if;
    corps := heures || coalesce(E'\n' || nullif(left(c->>'t', 120), ''), '');
    etiquette := 'post-' || substr(new.nom, 6);
    lien := base || '#p=' || substr(new.nom, 6);
  elsif new.nom like 'mom:%' then
    titre := '⚡ MOMENT ! 2 min pour poster';
    corps := a || ' lance un Moment : montre ce que tu fais, là, maintenant ! (' || heures || ')';
    etiquette := 'moment'; urg := 'high';
  elsif new.nom like 'com:%' then
    if coalesce(c->>'o', '') <> '' then
      cible := c->>'o';
      titre := '↩️ ' || a || ' t''a répondu';
    else
      select s.coches->>'a' into cible from vegas_suivi s where s.nom = 'post:' || (c->>'p');
      titre := '💬 ' || a || ' a commenté ta story';
    end if;
    if cible is null or lower(cible) = lower(a) then return new; end if;
    corps := left(coalesce(c->>'t', ''), 140);
    etiquette := 'com-' || coalesce(c->>'p', '');
    lien := base || '#c=' || coalesce(c->>'p', '');
  elsif new.nom like 'note:%' then
    -- Ranking : on annonce qui a noté, sans dévoiler la note
    if coalesce(c->>'x', '') = 'true' then return new; end if;
    select s.coches->>'n' into resto from vegas_suivi s where s.nom = 'resto:' || (c->>'r');
    titre := '🍔 ' || a || ' a noté ' || coalesce(resto, 'un resto');
    corps := 'Note-le à ton tour pour découvrir sa note 🔒';
    etiquette := 'note-' || coalesce(c->>'r', '');
    lien := base || '#r=' || coalesce(c->>'r', '');
  elsif new.nom like 'dep:%' then
    if coalesce(c->>'x', '') = 'true' then return new; end if;
    titre := '💸 ' || a || ' a ajouté une dépense';
    corps := coalesce(nullif(c->>'t', ''), 'Dépense') || ' · '
          || to_char(coalesce((c->>'m')::numeric, 0) / 100, 'FM999999990.00') || ' ' || coalesce(c->>'c', 'USD')
          || ' · payé par ' || coalesce(c->>'p', '?')
          || E'\nOuvre les Comptes pour voir ce que tu dois.';
    etiquette := 'dep-' || substr(new.nom, 5);
    lien := base || '#dep=' || substr(new.nom, 5);
  else
    return new;
  end if;

  select * into cfg from vegas_push_cfg where id = 1;
  if not found then return new; end if;
  select coalesce(jsonb_agg(p.sub), '[]'::jsonb) into abonnes from vegas_push p
  where (cible is null and lower(p.nom) <> lower(a)) or (cible is not null and lower(p.nom) = lower(cible));
  if jsonb_array_length(abonnes) = 0 then return new; end if;

  perform net.http_post(
    url := cfg.url,
    body := jsonb_build_object(
      'vapid', jsonb_build_object('pub', cfg.pub, 'priv', cfg.priv, 'subject', cfg.subject),
      'subs', abonnes, 'urgency', urg,
      'payload', jsonb_build_object('title', titre, 'body', corps, 'tag', etiquette, 'url', lien)),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
  return new;
exception when others then
  return new;
end $function$;
