"use client";

import { useMemo } from "react";
import type { RentVsBuyResult } from "@/lib/rent-vs-buy";
import styles from "./rent-vs-buy.module.css";

type ResultsPanelProps = {
  result: RentVsBuyResult;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatMoney(n: number): string {
  return currency.format(Number.isFinite(n) ? n : 0);
}

export function ResultsPanel({ result }: ResultsPanelProps) {
  const {
    timeline,
    breakEvenYear,
    horizonYear,
    rentNetWorthAtHorizon,
    buyNetWorthAtHorizon,
    winnerAtHorizon,
  } = result;

  const visibleRows = useMemo(
    () => timeline.filter((row) => row.year <= horizonYear),
    [timeline, horizonYear]
  );

  const maxNetWorth = useMemo(() => {
    let max = 1;
    for (const row of visibleRows) {
      max = Math.max(max, Math.abs(row.renterNetWorth), Math.abs(row.buyerNetWorth));
    }
    return max;
  }, [visibleRows]);

  const banner = useMemo(() => {
    if (breakEvenYear === null) {
      if (winnerAtHorizon === "rent") {
        return {
          variant: styles.bannerRent,
          title: `Renting stays ahead through ${horizonYear} years`,
          detail: `At year ${horizonYear}, renting shows higher net worth by ${formatMoney(
            rentNetWorthAtHorizon - buyNetWorthAtHorizon
          )}.`,
        };
      }
      return {
        variant: styles.bannerBuy,
        title: `Buying is ahead from year one`,
        detail: `Home equity exceeds the renter's invested position throughout the horizon.`,
      };
    }
    if (breakEvenYear <= horizonYear) {
      return {
        variant: styles.bannerBuy,
        title: `Buying becomes more profitable after ${breakEvenYear} year${breakEvenYear === 1 ? "" : "s"}`,
        detail: `Before year ${breakEvenYear}, renting may show stronger liquid net worth; after that, home equity pulls ahead.`,
      };
    }
    return {
      variant: styles.bannerRent,
      title: `Renting stays ahead through ${horizonYear} years`,
      detail: `Break-even would occur after year ${breakEvenYear}—beyond your selected timeline.`,
    };
  }, [
    breakEvenYear,
    horizonYear,
    winnerAtHorizon,
    rentNetWorthAtHorizon,
    buyNetWorthAtHorizon,
  ]);

  const horizonRow = visibleRows[visibleRows.length - 1];

  return (
    <div>
      <div className={`${styles.banner} ${banner.variant}`}>
        <h3>{banner.title}</h3>
        <p>{banner.detail}</p>
      </div>

      <div className={styles.metricDeck}>
        <dl className={styles.metricGrid}>
          <div className={styles.metricCard}>
            <dt>Net worth renting (year {horizonYear})</dt>
            <dd>{formatMoney(rentNetWorthAtHorizon)}</dd>
          </div>
          <div className={styles.metricCard}>
            <dt>Net worth buying (year {horizonYear})</dt>
            <dd>{formatMoney(buyNetWorthAtHorizon)}</dd>
          </div>
        </dl>
      </div>

      {horizonRow ? (
        <div style={{ marginBottom: "var(--cn-space-4)" }}>
          <p
            style={{
              margin: "0 0 var(--cn-space-3)",
              fontSize: "var(--cn-text-xs)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--cn-text-tertiary)",
            }}
          >
            Year {horizonYear} comparison
          </p>
          <div className={styles.barRow}>
            <span className={styles.barLabel}>Rent</span>
            <div className={styles.barTrack}>
              <div
                className={styles.barFillRent}
                style={{
                  width: `${Math.max(4, (Math.max(0, horizonRow.renterNetWorth) / maxNetWorth) * 100)}%`,
                }}
              />
            </div>
            <span style={{ fontSize: "var(--cn-text-sm)", minWidth: "5.5rem", textAlign: "right" }}>
              {formatMoney(horizonRow.renterNetWorth)}
            </span>
          </div>
          <div className={styles.barRow}>
            <span className={styles.barLabel}>Buy</span>
            <div className={styles.barTrack}>
              <div
                className={styles.barFillBuy}
                style={{
                  width: `${Math.max(4, (Math.max(0, horizonRow.buyerNetWorth) / maxNetWorth) * 100)}%`,
                }}
              />
            </div>
            <span style={{ fontSize: "var(--cn-text-sm)", minWidth: "5.5rem", textAlign: "right" }}>
              {formatMoney(horizonRow.buyerNetWorth)}
            </span>
          </div>
        </div>
      ) : null}

      <div className={styles.tableSection}>
        <h3 className={styles.tableSectionTitle}>Yearly net worth trajectory</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Rent net worth</th>
                <th scope="col">Buy net worth</th>
                <th scope="col">Home equity</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={row.year}
                  className={
                    row.year === breakEvenYear || row.year === horizonYear ? styles.highlight : undefined
                  }
                >
                  <td>{row.year}</td>
                  <td>{formatMoney(row.renterNetWorth)}</td>
                  <td>{formatMoney(row.buyerNetWorth)}</td>
                  <td>{formatMoney(row.homeEquity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
