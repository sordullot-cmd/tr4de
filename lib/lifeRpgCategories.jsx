"use client";

/**
 * Constantes partagées des « catégories » de la page Vie RPG.
 *
 * Module neutre (aucune dépendance aux pages) afin d'éviter tout import
 * circulaire : la page « Habitudes » (DailyPlannerPage) et la page « Vie RPG »
 * (LifeRpgPage) l'importent toutes les deux. Les catégories réelles de
 * l'utilisateur vivent dans l'état persisté `life_rpg.categories` ; ce qui est
 * ici n'est que le référentiel (icônes, palette) et le jeu par défaut servant
 * de point de départ / repli.
 */

import React from "react";
import {
  Dumbbell, GraduationCap, Users, ShieldCheck, Wallet, Star, Sparkles, Zap,
  Calendar, Heart, Activity, BookOpen, Target, TrendingUp, Briefcase, Code,
  Trophy, Flame,
} from "lucide-react";

// Clés de persistance de l'état Vie RPG (localStorage + Supabase).
export const RPG_STORAGE_KEY = "tr4de_life_rpg";
export const RPG_CLOUD_KEY = "life_rpg";

// Lien « tâche d'agenda → cartes Vie RPG » (+ état de complétion), partagé entre
// la page Agenda (qui l'écrit) et la page Vie RPG (qui le lit pour l'XP). On
// l'indexe par id de Google Task : { [taskId]: { categories, completedAt, title } }.
export const TASK_RPG_STORAGE_KEY = "tr4de_agenda_task_rpg";
export const TASK_RPG_CLOUD_KEY = "agenda_task_rpg";
// XP gagnée pour une tâche terminée, par catégorie liée (≈ une habitude « normale »).
export const TASK_XP = 25;

// Lien « page Discipline → page Vie RPG » : chaque règle de discipline respectée
// (cochée un jour donné) crédite de l'XP à la catégorie « Trading ». Source
// indépendante des habitudes/objectifs/tâches → pas de double comptage.
export const TRADING_CATEGORY_ID = "trading";
export const DISCIPLINE_RULE_XP = 10;

// Résout l'id de la catégorie « Trading » RÉELLEMENT présente chez l'utilisateur.
// Historiquement, l'XP de discipline (et le seed automatique) ciblaient un id
// figé "trading". Si l'utilisateur a renommé ou recréé sa carte Trading à la
// main (id `cat_...`), cet XP tombait dans le vide et pouvait faire naître une
// 2ᵉ carte "trading" en double au moment du seed. On cible donc en priorité la
// carte par son LIBELLÉ « Trading », puis par l'id historique, sinon on retombe
// sur la constante. Ainsi l'XP se consolide sur une seule carte.
export function resolveTradingCatId(categories) {
  const cats = Array.isArray(categories) ? categories : [];
  const byLabel = cats.find(c => String(c?.label || "").trim().toLowerCase() === "trading");
  if (byLabel) return byLabel.id;
  const byId = cats.find(c => c?.id === TRADING_CATEGORY_ID);
  if (byId) return byId.id;
  return TRADING_CATEGORY_ID;
}

// Vrai si une catégorie « Trading » existe déjà (par id historique OU par
// libellé), pour éviter de créer un doublon au seed.
export function hasTradingCategory(categories) {
  const cats = Array.isArray(categories) ? categories : [];
  return cats.some(c => c?.id === TRADING_CATEGORY_ID
    || String(c?.label || "").trim().toLowerCase() === "trading");
}

// Horaires locaux d'une tâche d'agenda (jour planifié + heure éventuelle),
// indexés par id de Google Task : { [taskId]: { day, startTime?, endTime?, colorId } }.
// Partagé entre la page Agenda et la page Vie RPG (qui peut créer une tâche datée
// rattachée à une carte). Google Tasks ne stocke que la date limite (`due`), pas
// le jour où l'on pose la tâche → on le conserve côté tr4de.
export const TASK_TIMES_STORAGE_KEY = "tr4de_task_times";
export const TASK_TIMES_CLOUD_KEY = "task_times";

// Catégories (« cartes ») rattachées à une habitude. Une habitude peut être
// liée à PLUSIEURS cartes. Rétrocompatible avec l'ancien champ `attribute`
// (id unique) : on le convertit en tableau à un élément.
export function habitCategoryIds(h) {
  if (Array.isArray(h?.attributes)) return h.attributes.filter(Boolean);
  return h?.attribute ? [h.attribute] : [];
}

// Banque d'icônes disponibles pour les catégories (clé string ↔ composant).
export const CATEGORY_ICONS = {
  dumbbell: Dumbbell, graduation: GraduationCap, users: Users, shield: ShieldCheck,
  heart: Heart, activity: Activity, wallet: Wallet, book: BookOpen, sparkles: Sparkles,
  star: Star, zap: Zap, target: Target, trending: TrendingUp, calendar: Calendar,
  trophy: Trophy, flame: Flame, briefcase: Briefcase, code: Code,
};
export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

// Rend l'icône d'une catégorie. Composant défini au niveau module (et non via
// un alias obtenu pendant le rendu) pour respecter la règle ESLint « ne pas
// créer de composant pendant le rendu ».
export function CatIcon({ name, ...rest }) {
  const Ic = CATEGORY_ICONS[name] || Star;
  return <Ic {...rest} />;
}

// Palette de couleurs proposée pour les catégories.
export const CATEGORY_PALETTE = [
  "#F97316", "#3B82F6", "#EC4899", "#16A34A", "#06B6D4", "#8B5CF6",
  "#059669", "#EF4444", "#F59E0B", "#14B8A6", "#6366F1", "#64748B",
];

// Catégories par défaut. Le « modèle » est qualitatif : une identité future
// (qui je veux devenir) et, optionnellement, une personne dont on veut
// s'inspirer (roleModel + ce qu'on admire chez elle).
// Les OBJECTIFS d'une catégorie ne vivent plus ici : ils sont gérés sur la page
// « Objectifs ». Un objectif y porte un champ `rpgCategory` (id de catégorie) et
// un `rpgXp` ; sa progression alimente alors l'XP de la catégorie au prorata.
export const DEFAULT_CATEGORIES = [
  { id: "force",      label: "Force",      color: "#F97316", icon: "dumbbell",   identity: "Je prends soin de mon corps et je m'entraîne régulièrement.", roleModel: "", roleModelWhy: "" },
  { id: "intellect",  label: "Intellect",  color: "#3B82F6", icon: "graduation", identity: "J'apprends quelque chose de nouveau chaque jour.",            roleModel: "", roleModelWhy: "" },
  { id: "social",     label: "Social",     color: "#EC4899", icon: "users",      identity: "Je cultive des relations sincères et profondes.",            roleModel: "", roleModelWhy: "" },
  { id: "discipline", label: "Discipline", color: "#16A34A", icon: "shield",     identity: "Je tiens mes engagements, même quand c'est difficile.",      roleModel: "", roleModelWhy: "" },
  { id: "health",     label: "Santé",      color: "#06B6D4", icon: "activity",   identity: "Je vis sainement et avec énergie.",                          roleModel: "", roleModelWhy: "" },
  { id: "finance",    label: "Finances",   color: "#059669", icon: "wallet",     identity: "Je gère mon argent avec sagesse et sérénité.",               roleModel: "", roleModelWhy: "" },
  { id: "creativity", label: "Créativité", color: "#8B5CF6", icon: "sparkles",   identity: "Je crée et j'exprime mes idées librement.",                  roleModel: "", roleModelWhy: "" },
  { id: "mind",       label: "Sérénité",   color: "#14B8A6", icon: "heart",      identity: "Je cultive le calme, la gratitude et la présence.",          roleModel: "", roleModelWhy: "" },
  { id: TRADING_CATEGORY_ID, label: "Trading", color: "#F59E0B", icon: "trending", identity: "Je respecte mon plan et ma discipline de trading chaque jour.", roleModel: "", roleModelWhy: "" },
];
