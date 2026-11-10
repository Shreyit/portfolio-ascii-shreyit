// Outputs of the Rinn microcredit default-risk study, transcribed verbatim
// from the saved outputs of notebooks/01_section_III_submission.ipynb in the
// public repo github.com/Shreyit/rinn-microcredit-risk (cell numbers noted).
// Nothing here is re-computed or estimated: per-loan probabilities were not
// saved, so the lab only offers the thresholds the study actually evaluated.
// The data are synthetic (seeded generator), as the repo states.

export interface Confusion {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
}

export interface ModelResult {
  key: string;
  label: string;
  confusion: Confusion; // test set, threshold 0.5 (cell 32)
  accuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  f1: number;
  rocAuc: number;
}

export const RINN = {
  dataset: {
    loans: 900, // cell 12
    defaultRate: 0.2, // cell 12
    train: 720, // cell 17
    test: 180, // cell 17
    testDefaults: 36, // cell 19: 144 + 36 = 180
    features: [
      "age",
      "monthly_income",
      "loan_amount",
      "term_months",
      "prior_loans",
      "agri_income_share",
      "branch_distance_km",
      "savings_group",
    ], // cell 12
  },

  // Cell 32 (confusion counts) and its metrics table.
  models: [
    {
      key: "baseline",
      label: "majority baseline",
      confusion: { tn: 144, fp: 0, fn: 36, tp: 0 },
      accuracy: 0.8,
      precision: 0,
      recall: 0,
      specificity: 1,
      f1: 0,
      rocAuc: 0.5,
    },
    {
      key: "logistic",
      label: "logistic regression",
      confusion: { tn: 133, fp: 11, fn: 18, tp: 18 },
      accuracy: 0.8389,
      precision: 0.6207,
      recall: 0.5,
      specificity: 0.9236,
      f1: 0.5538,
      rocAuc: 0.8877,
    },
    {
      key: "knn",
      label: "k-nearest neighbours",
      confusion: { tn: 134, fp: 10, fn: 28, tp: 8 },
      accuracy: 0.7889,
      precision: 0.4444,
      recall: 0.2222,
      specificity: 0.9306,
      f1: 0.2963,
      rocAuc: 0.7728,
    },
    {
      key: "naive_bayes",
      label: "naive Bayes",
      confusion: { tn: 130, fp: 14, fn: 29, tp: 7 },
      accuracy: 0.7611,
      precision: 0.3333,
      recall: 0.1944,
      specificity: 0.9028,
      f1: 0.2456,
      rocAuc: 0.7876,
    },
    {
      key: "decision_tree",
      label: "decision tree",
      confusion: { tn: 129, fp: 15, fn: 22, tp: 14 },
      accuracy: 0.7944,
      precision: 0.4828,
      recall: 0.3889,
      specificity: 0.8958,
      f1: 0.4308,
      rocAuc: 0.7477,
    },
    {
      key: "svm",
      label: "support vector machine",
      confusion: { tn: 136, fp: 8, fn: 19, tp: 17 },
      accuracy: 0.85,
      precision: 0.68,
      recall: 0.4722,
      specificity: 0.9444,
      f1: 0.5574,
      rocAuc: 0.8924,
    },
  ] satisfies ModelResult[],

  // Cell 34: logistic regression at the two thresholds the study evaluated.
  thresholds: [
    {
      t: 0.5,
      confusion: { tn: 133, fp: 11, fn: 18, tp: 18 },
      precision: 0.6207,
      recall: 0.5,
    },
    {
      t: 0.3,
      confusion: { tn: 123, fp: 21, fn: 11, tp: 25 },
      precision: 0.5435,
      recall: 0.6944,
    },
  ],

  // Cells 27 and 28: validation curves (F1 on the fit vs validation split).
  knnSweep: [
    { x: 1, fit: 1.0, val: 0.3774 },
    { x: 3, fit: 0.71, val: 0.4583 },
    { x: 5, fit: 0.5803, val: 0.3111 },
    { x: 7, fit: 0.5465, val: 0.2857 },
    { x: 9, fit: 0.4819, val: 0.3 },
    { x: 11, fit: 0.4224, val: 0.3721 },
    { x: 15, fit: 0.3151, val: 0.4 },
    { x: 21, fit: 0.3099, val: 0.2778 },
    { x: 31, fit: 0.126, val: 0.1765 },
  ],
  depthSweep: [
    { x: 1, fit: 0, val: 0 },
    { x: 2, fit: 0.2406, val: 0 },
    { x: 3, fit: 0.2406, val: 0 },
    { x: 4, fit: 0.2308, val: 0 },
    { x: 5, fit: 0.603, val: 0.4706 },
    { x: 6, fit: 0.7117, val: 0.5714 },
    { x: 7, fit: 0.7461, val: 0.2222 },
    { x: 8, fit: 0.806, val: 0.2979 },
    { x: 9, fit: 0.8762, val: 0.2917 },
    { x: 10, fit: 0.91, val: 0.3396 },
  ],

  // Cell 23: the effect of feature scaling on KNN.
  scaling: [
    { label: "KNN scaled", accuracy: 0.8056, recall: 0.2069 },
    { label: "KNN unscaled", accuracy: 0.7917, recall: 0.069 },
  ],
} as const;
