export type Category = 'Technology' | 'Financial';

// Controls display order on the homepage — not alphabetical, so new
// categories can be inserted wherever makes sense.
export const CATEGORY_ORDER: Category[] = ['Technology', 'Financial'];

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
];
