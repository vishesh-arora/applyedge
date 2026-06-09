export const ROLE_KEYWORDS: Record<string, string[]> = {
  "Product Analyst": [
    "data analysis", "SQL", "product metrics", "A/B testing", "user research",
    "funnel analysis", "cohort analysis", "retention", "engagement", "conversion",
    "Google Analytics", "Mixpanel", "Amplitude", "Tableau", "Power BI",
    "Excel", "Python", "dashboard", "KPIs", "OKRs", "hypothesis testing",
    "competitive analysis", "market research", "user interviews", "surveys",
    "product roadmap", "stakeholder management", "wireframes", "Figma",
    "JIRA", "sprint", "agile", "PRD", "BRD", "requirements gathering",
    "revenue metrics", "DAU", "MAU", "NPS", "CSAT", "churn", "LTV", "CAC"
  ],
  "Senior Product Analyst": [
    "data analysis", "SQL", "product metrics", "A/B testing", "user research",
    "funnel analysis", "cohort analysis", "retention", "engagement", "conversion",
    "Google Analytics", "Mixpanel", "Amplitude", "Tableau", "Power BI",
    "Python", "R", "statistical analysis", "regression", "segmentation",
    "dashboard", "KPIs", "OKRs", "hypothesis testing", "experimentation",
    "competitive analysis", "market research", "user interviews", "surveys",
    "product roadmap", "stakeholder management", "cross-functional",
    "JIRA", "agile", "PRD", "prioritisation", "go-to-market",
    "revenue metrics", "DAU", "MAU", "NPS", "CSAT", "churn", "LTV", "CAC",
    "mentoring", "leadership", "strategy", "executive communication"
  ],
  "APM": [
    "product management", "product roadmap", "user research", "A/B testing",
    "agile", "scrum", "sprint planning", "JIRA", "stakeholder management",
    "wireframes", "Figma", "PRD", "user stories", "acceptance criteria",
    "go-to-market", "launch", "KPIs", "OKRs", "metrics", "data-driven",
    "SQL", "Google Analytics", "Mixpanel", "Amplitude", "competitive analysis",
    "customer feedback", "user interviews", "usability testing", "NPS",
    "cross-functional", "engineering collaboration", "design collaboration",
    "prioritisation", "backlog", "MVP", "iteration", "product strategy"
  ],
  "PM": [
    "product management", "product roadmap", "product strategy", "user research",
    "A/B testing", "agile", "scrum", "sprint planning", "JIRA", "confluence",
    "stakeholder management", "wireframes", "Figma", "PRD", "user stories",
    "go-to-market", "launch", "KPIs", "OKRs", "metrics", "data-driven",
    "SQL", "Google Analytics", "Mixpanel", "Amplitude", "competitive analysis",
    "customer feedback", "user interviews", "usability testing", "NPS", "CSAT",
    "cross-functional", "engineering", "design", "prioritisation", "backlog",
    "MVP", "product lifecycle", "revenue", "growth", "retention", "engagement",
    "monetisation", "pricing", "positioning", "market sizing", "TAM", "SAM"
  ],
  "Senior PM": [
    "product management", "product roadmap", "product strategy", "product vision",
    "user research", "A/B testing", "agile", "scrum", "stakeholder management",
    "executive communication", "PRD", "go-to-market", "launch", "KPIs", "OKRs",
    "SQL", "data-driven", "Mixpanel", "Amplitude", "competitive analysis",
    "user interviews", "NPS", "CSAT", "cross-functional leadership",
    "engineering", "design", "prioritisation", "MVP", "product lifecycle",
    "revenue growth", "retention", "engagement", "monetisation", "pricing",
    "market sizing", "TAM", "business strategy", "P&L", "mentoring",
    "team leadership", "hiring", "0 to 1", "scaling", "platform thinking"
  ],
  "Growth PM": [
    "growth", "growth hacking", "acquisition", "activation", "retention",
    "referral", "revenue", "AARRR", "pirate metrics", "funnel optimisation",
    "A/B testing", "experimentation", "conversion rate optimisation", "CRO",
    "SEO", "ASO", "paid acquisition", "virality", "network effects",
    "product-led growth", "PLG", "onboarding", "activation rate",
    "DAU", "MAU", "WAU", "churn", "LTV", "CAC", "ROAS", "CPM", "CPC",
    "SQL", "Mixpanel", "Amplitude", "Google Analytics", "Braze", "CleverTap",
    "push notifications", "email marketing", "segmentation", "personalisation",
    "user research", "cohort analysis", "north star metric", "OKRs", "KPIs",
    "cross-functional", "marketing collaboration", "data-driven", "agile"
  ],
  "Lead PM": [
    "product leadership", "product vision", "product strategy", "roadmap",
    "executive communication", "board presentations", "P&L", "business strategy",
    "team leadership", "mentoring", "hiring", "performance management",
    "cross-functional leadership", "stakeholder management", "OKRs", "KPIs",
    "0 to 1", "scaling", "platform thinking", "ecosystem", "partnerships",
    "go-to-market", "launch", "revenue growth", "monetisation", "pricing",
    "market sizing", "TAM", "competitive strategy", "user research",
    "data-driven", "A/B testing", "agile", "product lifecycle",
    "engineering leadership", "design leadership", "SQL", "Mixpanel", "Amplitude",
    "retention", "engagement", "growth", "NPS", "CSAT", "product-market fit"
  ]
};

export function getKeywordsForRoles(roles: string[]): string[] {
  const keywordSet = new Set<string>();
  roles.forEach(role => {
    const keywords = ROLE_KEYWORDS[role] || [];
    keywords.forEach(k => keywordSet.add(k.toLowerCase()));
  });
  return Array.from(keywordSet);
}

export function findKeywordMatches(text: string, keywords: string[]): {
  found: string[];
  missing: string[];
} {
  const normalised = text.toLowerCase();
  const found: string[] = [];
  const missing: string[] = [];

  keywords.forEach(keyword => {
    const variants = [
      keyword.toLowerCase(),
      keyword.toLowerCase().replace(/-/g, " "),
      keyword.toLowerCase().replace(/ /g, "-"),
    ];
    const isFound = variants.some(v => normalised.includes(v));
    if (isFound) {
      found.push(keyword);
    } else {
      missing.push(keyword);
    }
  });

  return { found, missing };
}
