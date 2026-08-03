export interface Tool {
  title: string;
  description: string;
  href: string;
}

export const tools: Tool[] = [
  {
    title: 'Password Generator',
    description:
      'Generate strong, random passwords with configurable length and character sets.',
    href: '/password-generator',
  },
  {
    title: 'Tip Calculator',
    description:
      'Split the bill and calculate tip for any group size, with optional tax handling and rounding.',
    href: '/tip-calculator',
  },
];
