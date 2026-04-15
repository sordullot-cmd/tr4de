# 🚨 Diagnostic Rapide - Règles Non Sauvegardées

## 🔍 Étape 1: Vérifier si la Table Existe

**Dans Supabase > SQL Editor > New Query**:

```sql
SELECT to_regclass('public.custom_discipline_rules');
```

**Résultat attendu:** `'public.custom_discipline_rules'::regclass`

Si vous voyez `NULL` → **LA TABLE N'EXISTE PAS!** → Allez à Étape 2

---

## 🔧 Étape 2: Exécuter les Migrations

1. Allez Supabase > SQL Editor > New Query
2. Copiez le contenu COMPLET de `supabase/migration_safe.sql`
3. Collez dans SQL Editor
4. **Cliquez RUN**

**Attendez** que ça dise "Migration complétée avec succès!"

---

## 📊 Étape 3: Tester Directement (Console Navigateur)

**Ouvrez F12 Console**, tapez:

```javascript
// Récupérer l'user ID
const { data: user } = await supabase.auth.getUser();
console.log("User ID:", user?.user?.id);

// Test INSERT
const { data, error } = await supabase
  .from("custom_discipline_rules")
  .insert({
    user_id: user.user.id,
    rule_id: "test_rule",
    type: "texte",
    text: "Test Rule"
  })
  .select();

if (error) {
  console.error("❌ Erreur:", error);
} else {
  console.log("✅ Succès:", data);
}
```

**Si erreur:**
- `PGRST116` → Table n'existe pas → Exécutez migration
- `permission denied` → RLS policy bloque → Check RLS policies
- Autre → Notez l'erreur exacte

---

## ✅ Étape 4: Tester l'App

1. Allez **Discipline**
2. Créez une règle: "Test"
3. Ouvrez F12 Console
4. **Cherchez les logs:**
```
➕ Ajout règle personnalisée: Test
   User ID: [UUID]
   Rule ID: rule_XXXXX
📤 Envoi à Supabase...
✅ Règle insérée dans Supabase:
```

5. Aller Supabase > Table Editor > `custom_discipline_rules`
6. **Vous devriez voir la ligne**

---

## 🆘 Si Ça Marche Pas

Notez **EXACTEMENT** le message d'erreur et partagez-le!

```
❌ Erreur Supabase INSERT: ????
```

C'est la clé pour trouver le problème!

---

## ⚡ TL;DR (Résumé)

1. **Vérifier** que `custom_discipline_rules` table existe
2. **Si non** → Exécuter migration_safe.sql
3. **Si oui** → Testez INSERT directement dans Console
4. **Si erreur** → Partagez l'erreur exacte
