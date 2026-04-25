"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ParsedTrade } from "@/lib/types/trade";

export interface ExportJournalPdfOptions {
  trades: ParsedTrade[];
  /** Note libre du jour (ou de la semaine), keyée par date YYYY-MM-DD. */
  dailyNotes?: Record<string, string>;
  /** Note par trade, keyée par tradeId (date+symbol+entry concat). */
  tradeNotes?: Record<string, string>;
  /** Période ISO YYYY-MM-DD */
  startDate?: string;
  endDate?: string;
  /** Nom du trader / titre du document */
  title?: string;
  /** "USD" / "EUR" / "$" */
  currencySymbol?: string;
}

const tradeKey = (tr: ParsedTrade): string =>
  `${tr.date}${tr.symbol}${tr.entry}`;

const fmtMoney = (n: number, sym: string): string => {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}${sym}${Math.abs(n).toFixed(2)}`;
};

/**
 * Génère un PDF du journal de trading et le télécharge.
 * Inclut :
 *  - en-tête avec période + statistiques résumées (PnL total, win rate, R:R)
 *  - une section par jour : note du jour + tableau trades
 *  - notes par trade en bas (1 page de notes regroupées)
 */
export async function exportJournalPdf(opts: ExportJournalPdfOptions): Promise<void> {
  const {
    trades,
    dailyNotes = {},
    tradeNotes = {},
    startDate,
    endDate,
    title = "Journal de trading",
    currencySymbol = "$",
  } = opts;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;

  // ── Header ────────────────────────────────────────────────────────────
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, margin + 14);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const periodLabel = startDate && endDate ? `${startDate} → ${endDate}` : "Toutes périodes";
  doc.text(periodLabel, margin, margin + 32);
  doc.text(`Généré le ${new Date().toLocaleString("fr-FR")}`, margin, margin + 46);

  // ── Stats globales ────────────────────────────────────────────────────
  const totalPnL = trades.reduce((s, t) => s + (t.pnl || 0), 0);
  const wins = trades.filter(t => (t.pnl || 0) > 0).length;
  const losses = trades.filter(t => (t.pnl || 0) < 0).length;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const grossWin = trades.filter(t => (t.pnl || 0) > 0).reduce((s, t) => s + (t.pnl || 0), 0);
  const grossLoss = Math.abs(trades.filter(t => (t.pnl || 0) < 0).reduce((s, t) => s + (t.pnl || 0), 0));
  const profitFactor = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : "∞";

  autoTable(doc, {
    startY: margin + 60,
    head: [["Trades", "Win rate", "P&L total", "Profit factor"]],
    body: [[
      String(trades.length),
      `${winRate}%`,
      fmtMoney(totalPnL, currencySymbol),
      String(profitFactor),
    ]],
    theme: "grid",
    headStyles: { fillColor: [13, 13, 13], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 11, halign: "center" },
    margin: { left: margin, right: margin },
  });

  // ── Trades groupés par jour ──────────────────────────────────────────
  const byDate: Record<string, ParsedTrade[]> = {};
  for (const tr of trades) {
    if (!tr.date) continue;
    const d = String(tr.date).split("T")[0];
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(tr);
  }
  const sortedDates = Object.keys(byDate).sort().reverse();

  for (const date of sortedDates) {
    const dayTrades = byDate[date];
    const dayPnL = dayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    // Get last Y from previous table; jsPDF-autotable exposes it via lastAutoTable
    // @ts-expect-error -- jsPDF runtime extension typed loosely
    const lastY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || margin + 90;
    let cursorY = lastY + 20;

    if (cursorY > 750) {
      doc.addPage();
      cursorY = margin;
    }

    // Day header
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(date, margin, cursorY);
    doc.setFontSize(11);
    doc.setTextColor(dayPnL >= 0 ? 16 : 239, dayPnL >= 0 ? 163 : 68, dayPnL >= 0 ? 127 : 68);
    doc.text(fmtMoney(dayPnL, currencySymbol), pageWidth - margin, cursorY, { align: "right" });
    doc.setTextColor(0, 0, 0);
    cursorY += 6;

    // Day note
    const note = dailyNotes[date];
    if (note && note.trim()) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(92, 92, 92);
      const wrapped = doc.splitTextToSize(note, pageWidth - margin * 2);
      doc.text(wrapped, margin, cursorY + 14);
      doc.setTextColor(0, 0, 0);
      cursorY += 14 + wrapped.length * 11;
    }

    // Trades table
    autoTable(doc, {
      startY: cursorY + 4,
      head: [["Heure", "Symbol", "Side", "Entry", "Exit", "P&L", "Notes"]],
      body: dayTrades.map(tr => {
        const entryT = tr.entryTime || (tr.time as string | undefined) || "";
        const note = tradeNotes[tradeKey(tr)] || "";
        return [
          String(entryT),
          String(tr.symbol),
          String(tr.direction || tr.side || ""),
          String(tr.entry),
          String(tr.exit),
          fmtMoney(tr.pnl || 0, currencySymbol),
          note.length > 60 ? note.slice(0, 58) + "…" : note,
        ];
      }),
      theme: "striped",
      headStyles: { fillColor: [240, 240, 240], textColor: 13, fontSize: 8 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 50 },
        2: { cellWidth: 40 },
        5: { halign: "right", cellWidth: 60 },
        6: { cellWidth: "auto" },
      },
      margin: { left: margin, right: margin },
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────
  const filename = startDate && endDate
    ? `journal_${startDate}_${endDate}.pdf`
    : `journal_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}
