"use client";

const SAMPLE = "je suis une images";

const SIZES = [
  { px: 11, label: "11px" },
  { px: 12, label: "12px" },
  { px: 13, label: "13px" },
  { px: 14, label: "14px" },
  { px: 16, label: "16px" },
  { px: 18, label: "18px" },
  { px: 22, label: "22px" },
  { px: 28, label: "28px" },
  { px: 36, label: "36px" },
  { px: 48, label: "48px" },
  { px: 64, label: "64px" },
];

const WEIGHTS = [
  { w: 300, label: "Light 300" },
  { w: 400, label: "Regular 400" },
  { w: 500, label: "Medium 500" },
  { w: 600, label: "Semibold 600" },
  { w: 700, label: "Bold 700" },
];

export default function FontTestPage() {
  return (
    <div style={{
      fontFamily: "var(--font-sans)",
      color: "#0D0D0D",
      background: "#FFFFFF",
      minHeight: "100vh",
    }}>
      {/* Header */}
      <div style={{ padding: "40px 28px 24px", borderBottom: "1px solid #E5E5E5" }}>
        <div style={{ fontSize: 11, color: "#8E8E8E", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>
          Font test page
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "8px 0 4px", letterSpacing: -0.4 }}>
          OpenAI Sans
        </h1>
        <div style={{ fontSize: 14, color: "#5C5C5C", fontWeight: 400 }}>
          Échantillon : « {SAMPLE} »
        </div>
      </div>

      {/* Pangrammes */}
      <div style={{ padding: "32px 28px", borderBottom: "1px solid #E5E5E5" }}>
        <SectionTitle>Pangrammes & ponctuation</SectionTitle>
        <p style={{ fontSize: 28, fontWeight: 400, margin: "12px 0", lineHeight: 1.25 }}>
          Voix ambiguë d'un cœur qui, au zéphyr, préfère les jattes de kiwis.
        </p>
        <p style={{ fontSize: 18, fontWeight: 400, margin: "8px 0", lineHeight: 1.4 }}>
          The quick brown fox jumps over the lazy dog. 1234567890 — « guillemets » — em–dash – en-dash …
        </p>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "8px 0", color: "#5C5C5C" }}>
          ! ? . , : ; ( ) [ ] {`{}`} / \ | * # @ % & ~ ^ _ + = &lt; &gt; &amp;
        </p>
      </div>

      {/* Graisses */}
      <div style={{ padding: "32px 28px", borderBottom: "1px solid #E5E5E5" }}>
        <SectionTitle>Graisses (regular)</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {WEIGHTS.map(w => (
            <Row key={w.w} hint={w.label}>
              <div style={{ fontSize: 28, fontWeight: w.w, lineHeight: 1.25 }}>{SAMPLE}</div>
            </Row>
          ))}
        </div>
      </div>

      {/* Italiques */}
      <div style={{ padding: "32px 28px", borderBottom: "1px solid #E5E5E5" }}>
        <SectionTitle>Graisses (italique)</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {WEIGHTS.map(w => (
            <Row key={w.w} hint={`${w.label} · italic`}>
              <div style={{ fontSize: 28, fontWeight: w.w, fontStyle: "italic", lineHeight: 1.25 }}>{SAMPLE}</div>
            </Row>
          ))}
        </div>
      </div>

      {/* Tailles */}
      <div style={{ padding: "32px 28px", borderBottom: "1px solid #E5E5E5" }}>
        <SectionTitle>Échelle des tailles (Regular 400)</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SIZES.map(s => (
            <Row key={s.px} hint={s.label}>
              <div style={{ fontSize: s.px, fontWeight: 400, lineHeight: 1.2 }}>{SAMPLE}</div>
            </Row>
          ))}
        </div>
      </div>

      {/* Hiérarchie typographique */}
      <div style={{ padding: "32px 28px", borderBottom: "1px solid #E5E5E5" }}>
        <SectionTitle>Hiérarchie typographique</SectionTitle>
        <h1 style={{ fontSize: 48, fontWeight: 700, margin: "8px 0", letterSpacing: -0.6 }}>{SAMPLE}</h1>
        <h2 style={{ fontSize: 32, fontWeight: 600, margin: "8px 0", letterSpacing: -0.3 }}>{SAMPLE}</h2>
        <h3 style={{ fontSize: 22, fontWeight: 600, margin: "8px 0", letterSpacing: -0.1 }}>{SAMPLE}</h3>
        <h4 style={{ fontSize: 17, fontWeight: 600, margin: "8px 0" }}>{SAMPLE}</h4>
        <p style={{ fontSize: 14, fontWeight: 400, margin: "8px 0", lineHeight: 1.55, maxWidth: 640 }}>
          Paragraphe en 14/1.55 — {SAMPLE}. Regular 400. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
        <p style={{ fontSize: 12, color: "#5C5C5C", margin: "8px 0" }}>Sous-texte 12 · {SAMPLE}</p>
        <p style={{ fontSize: 11, color: "#8E8E8E", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600, margin: "8px 0" }}>
          Eyebrow 11 uppercase · {SAMPLE}
        </p>
      </div>

      {/* Variantes spéciales */}
      <div style={{ padding: "32px 28px", borderBottom: "1px solid #E5E5E5" }}>
        <SectionTitle>Variantes spéciales</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Row hint="Souligné">
            <div style={{ fontSize: 18, textDecoration: "underline" }}>{SAMPLE}</div>
          </Row>
          <Row hint="Barré">
            <div style={{ fontSize: 18, textDecoration: "line-through" }}>{SAMPLE}</div>
          </Row>
          <Row hint="Majuscules">
            <div style={{ fontSize: 18, textTransform: "uppercase", letterSpacing: 0.4 }}>{SAMPLE}</div>
          </Row>
          <Row hint="Petites caps simulées">
            <div style={{ fontSize: 18, fontVariantCaps: "small-caps" }}>{SAMPLE}</div>
          </Row>
          <Row hint="tabular-nums (alignement chiffres)">
            <div style={{ fontSize: 18, fontVariantNumeric: "tabular-nums" }}>1234.56 · 7890.12 · 3456.78</div>
          </Row>
          <Row hint="Couleur muet">
            <div style={{ fontSize: 18, color: "#5C5C5C" }}>{SAMPLE}</div>
          </Row>
          <Row hint="Sur fond sombre">
            <div style={{ fontSize: 18, color: "#FFFFFF", background: "#0D0D0D", padding: "6px 12px", borderRadius: 6, display: "inline-block" }}>
              {SAMPLE}
            </div>
          </Row>
        </div>
      </div>

      {/* Numéraux & symboles */}
      <div style={{ padding: "32px 28px", borderBottom: "1px solid #E5E5E5" }}>
        <SectionTitle>Numéraux & symboles</SectionTitle>
        <div style={{ fontSize: 24, fontWeight: 500, fontVariantNumeric: "tabular-nums", letterSpacing: 0.2, lineHeight: 1.4 }}>
          0 1 2 3 4 5 6 7 8 9
        </div>
        <div style={{ fontSize: 18, fontWeight: 400, marginTop: 8, color: "#5C5C5C" }}>
          € $ £ ¥ ₿ ¢ ₽ · % ‰ ° ± × ÷ ≈ ≠ ≤ ≥ ∞ √ Σ Δ
        </div>
      </div>

      {/* Bloc de texte long */}
      <div style={{ padding: "32px 28px 80px" }}>
        <SectionTitle>Bloc de lecture</SectionTitle>
        <div style={{ maxWidth: 640, fontSize: 15, lineHeight: 1.6, fontWeight: 400 }}>
          <p style={{ margin: "8px 0" }}>
            {SAMPLE} — voici un paragraphe utilisé pour évaluer la lisibilité de la police sur du texte courant. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          <p style={{ margin: "8px 0" }}>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
          <p style={{ margin: "8px 0", fontWeight: 600 }}>
            Texte en semibold pour comparer le contraste : {SAMPLE}.
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, color: "#8E8E8E", textTransform: "uppercase", letterSpacing: 0.6,
      fontWeight: 600, marginBottom: 12,
    }}>{children}</div>
  );
}

function Row({ hint, children }: { hint: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "baseline", gap: 16 }}>
      <div style={{ fontSize: 11, color: "#8E8E8E", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{hint}</div>
      <div>{children}</div>
    </div>
  );
}
