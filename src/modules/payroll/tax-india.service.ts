import Decimal from "decimal.js";

type TaxInput = {
  annualTaxableIncome: string;
  regime: "OLD" | "NEW";
};

type Slab = {
  upto: Decimal;
  rate: Decimal;
};

const NEW_REGIME_SLABS: Slab[] = [
  { upto: new Decimal("300000"), rate: new Decimal("0") },
  { upto: new Decimal("700000"), rate: new Decimal("0.05") },
  { upto: new Decimal("1000000"), rate: new Decimal("0.10") },
  { upto: new Decimal("1200000"), rate: new Decimal("0.15") },
  { upto: new Decimal("1500000"), rate: new Decimal("0.20") },
  { upto: new Decimal("999999999"), rate: new Decimal("0.30") }
];

const OLD_REGIME_SLABS: Slab[] = [
  { upto: new Decimal("250000"), rate: new Decimal("0") },
  { upto: new Decimal("500000"), rate: new Decimal("0.05") },
  { upto: new Decimal("1000000"), rate: new Decimal("0.20") },
  { upto: new Decimal("999999999"), rate: new Decimal("0.30") }
];

export class IndiaTaxService {
  calculateAnnualTax(input: TaxInput): {
    annualTax: string;
    monthlyTds: string;
  } {
    const income = new Decimal(input.annualTaxableIncome);
    const slabs = input.regime === "NEW" ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;

    let previousLimit = new Decimal(0);
    let tax = new Decimal(0);
    for (const slab of slabs) {
      if (income.lte(previousLimit)) break;
      const taxable = Decimal.min(income, slab.upto).minus(previousLimit);
      tax = tax.plus(taxable.mul(slab.rate));
      previousLimit = slab.upto;
    }

    const cess = tax.mul("0.04");
    const annualTax = tax.plus(cess);
    const monthlyTds = annualTax.div("12");
    return {
      annualTax: annualTax.toFixed(2),
      monthlyTds: monthlyTds.toFixed(2)
    };
  }
}
