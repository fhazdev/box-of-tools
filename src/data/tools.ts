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
];
