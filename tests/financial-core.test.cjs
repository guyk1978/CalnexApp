"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const corePath = path.join(__dirname, "..", "engine", "financial-core.js");
const code = fs.readFileSync(corePath, "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const FC = sandbox.window.FinancialCore;

describe("FinancialCore deterministic outputs", () => {
  test("loan amortization: payment and interest in expected range", () => {
    const principal = 240_000;
    const annualAprPercent = 6.5;
    const termMonths = 360;
    const r = FC.loanAmortization({
      principal,
      annualAprPercent,
      termMonths,
      includeExtra: false
    });
    assert.ok(r.monthlyPayment > 1400 && r.monthlyPayment < 1700, `monthlyPayment=${r.monthlyPayment}`);
    assert.ok(r.summary.totalInterest > 200_000 && r.summary.totalInterest < 400_000, `totalInterest=${r.summary.totalInterest}`);
    const r2 = FC.loanAmortization({
      principal,
      annualAprPercent,
      termMonths,
      includeExtra: false
    });
    assert.equal(r.monthlyPayment, r2.monthlyPayment);
    assert.equal(r.summary.totalInterest, r2.summary.totalInterest);
  });

  test("mortgage snapshot aggregates match amortization", () => {
    const f = FC.computeMortgageSnapshot({
      homePrice: 400_000,
      downType: "percent",
      downPercent: 20,
      downFixed: 0,
      annualRate: 6,
      totalMonths: 360,
      extraMonthly: 0,
      lumpSum: 0,
      paymentStartMonth: 1,
      propertyTaxAnnual: 3600,
      homeInsuranceAnnual: 1200,
      annualIncome: 120_000
    });
    assert.equal(f.loanAmount, 320_000);
    assert.ok(f.monthlyPrincipalInterest > 1800 && f.monthlyPrincipalInterest < 2200);
    assert.ok(f.recommendedMonthly > 2000 && f.recommendedMonthly < 3500);
    assert.ok(f.monthlyMortgagePayment > f.monthlyPrincipalInterest);
  });

  test("rent vs buy snapshot produces timeline and break-even", () => {
    const r = FC.computeRentVsBuySnapshot({
      monthlyRent: 1200,
      rentInsurance: 15,
      annualRentIncreasePct: 3,
      investmentReturnPct: 7,
      homePrice: 350_000,
      downPaymentPct: 20,
      interestRatePct: 6.5,
      loanTermYears: 30,
      propertyTaxPct: 1.2,
      maintenancePct: 1,
      annualAppreciationPct: 3,
      horizonYears: 15
    });
    assert.equal(r.timeline.length, 30);
    assert.equal(r.downPayment, 70_000);
    assert.equal(r.loanAmount, 280_000);
    assert.ok(r.monthlyMortgagePayment > 1500);
    assert.ok(typeof r.breakEvenYear === "number" || r.breakEvenYear === null);
    assert.ok(r.rentNetWorthAtHorizon !== undefined);
    assert.ok(r.buyNetWorthAtHorizon !== undefined);
  });

  test("retirement FV increases with horizon and matches toolkit", () => {
    const fv10 = FC.calculateReferenceRetirement({
      initial: 10_000,
      monthly: 500,
      annualReturn: 7,
      months: 120
    });
    const fv20 = FC.calculateReferenceRetirement({
      initial: 10_000,
      monthly: 500,
      annualReturn: 7,
      months: 240
    });
    assert.ok(fv20 > fv10 * 1.5, "longer horizon should materially increase FV");
    const tk = FC.computeRetirementToolkit({
      currentAge: 35,
      targetAge: 65,
      currentSavings: 10_000,
      monthlyContribution: 500,
      annualReturnRate: 7,
      inflationRate: 2.5,
      desiredRetirementIncome: 60_000
    });
    assert.ok(tk.referenceFinancialResult.projectedBalance > 400_000);
    assert.equal(
      tk.referenceFinancialResult.projectedBalance,
      FC.calculateReferenceRetirement({
        initial: 10_000,
        monthly: 500,
        annualReturn: 7,
        months: tk.nMonths
      })
    );
  });

  test("loan comparison: picks lower total cost and effective APR with fees", () => {
    const snap = FC.computeLoanComparisonSnapshot({
      offers: [
        { label: "A", enabled: true, principal: 25_000, annualAprPercent: 7.5, termValue: 5, termUnit: "years", fees: 500 },
        { label: "B", enabled: true, principal: 25_000, annualAprPercent: 6.9, termValue: 5, termUnit: "years", fees: 1200 }
      ]
    });
    assert.equal(snap.offers.length, 2);
    assert.ok(snap.offers[0].monthlyPayment > 400);
    assert.ok(snap.offers[0].totalCost > 25_000);
    assert.ok(snap.offers[1].effectiveAprPercent >= snap.offers[1].annualAprPercent - 0.01);
    assert.ok(snap.savingsVsRunnerUp >= 0);
    assert.equal(snap.winnerLabel, snap.offers[snap.winnerIndex].label);
    const cheaper = snap.offers[0].totalCost <= snap.offers[1].totalCost ? snap.offers[0] : snap.offers[1];
    assert.equal(snap.winnerLabel, cheaper.label);
  });

  test("interest toolkit: compound exceeds principal and cache repeat", () => {
    const a = FC.computeInterestToolkit({
      principal: 10_000,
      annualRate: 5,
      years: 10,
      monthlyContribution: 100,
      compounding: "monthly"
    });
    assert.ok(a.compoundAmount > a.inputs.principal);
    assert.ok(a.totalInterest > 0);
    const b = FC.computeInterestToolkit({
      principal: 10_000,
      annualRate: 5,
      years: 10,
      monthlyContribution: 100,
      compounding: "monthly"
    });
    assert.equal(a.compoundAmount, b.compoundAmount);
    assert.equal(a.yearlyRows.length, 10);
  });
});
