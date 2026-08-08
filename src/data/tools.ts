export type Category = 'Technology' | 'Financial' | 'Date & Time';

// Controls display order on the homepage — not alphabetical, so new
// categories can be inserted wherever makes sense.
export const CATEGORY_ORDER: Category[] = ['Financial', 'Technology', 'Date & Time'];

export interface Tool {
  title: string;
  description: string;
  href: string;
  category: Category;
}

export const tools: Tool[] = [
  {
    title: 'Password Generator',
    description:
      'Generate strong, random passwords with configurable length and character sets.',
    href: '/password-generator',
    category: 'Technology',
  },
  {
    title: 'Tip Calculator',
    description:
      'Split the bill and calculate tip for any group size, with optional tax handling and rounding.',
    href: '/tip-calculator',
    category: 'Financial',
  },
  {
    title: 'Mortgage Calculator',
    description:
      'Estimate your monthly mortgage payment, see a cost breakdown, and view a yearly amortization schedule.',
    href: '/mortgage-calculator',
    category: 'Financial',
  },
  {
    title: 'Loan Calculator',
    description:
      'Estimate the monthly payment, total interest, and payoff date for a mortgage, auto, or personal loan, with optional extra payments and fees.',
    href: '/loan-calculator',
    category: 'Financial',
  },
  {
    title: 'Stock Calculator',
    description:
      'Figure out what a hypothetical investment in a U.S. stock or ETF would be worth today, with or without reinvested dividends.',
    href: '/stock-calculator',
    category: 'Financial',
  },
  {
    title: 'Age Calculator',
    description:
      'Find your exact age in years, months, and days, calculate age at a date, reverse-engineer a date of birth, or find the age gap between two people.',
    href: '/age-calculator',
    category: 'Date & Time',
  },
];
