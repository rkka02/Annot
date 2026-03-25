import { TreeNode, Session, ChatMessage } from '@/types';

// ── Mock Tree Structure ─────────────────────────────────────────

export const mockTree: TreeNode = {
  id: 'root',
  name: 'My Research',
  type: 'folder',
  path: '',
  children: [
    {
      id: 'f-ml',
      name: 'Machine Learning',
      type: 'folder',
      path: 'Machine Learning',
      children: [
        {
          id: 'p-survey',
          name: 'survey-2024.pdf',
          type: 'pdf',
          path: 'Machine Learning/survey-2024.pdf',
        },
        {
          id: 'f-transformers',
          name: 'Transformers',
          type: 'folder',
          path: 'Machine Learning/Transformers',
          children: [
            {
              id: 'p-attention',
              name: 'attention-is-all-you-need.pdf',
              type: 'pdf',
              path: 'Machine Learning/Transformers/attention-is-all-you-need.pdf',
            },
            {
              id: 'p-bert',
              name: 'bert-pretraining.pdf',
              type: 'pdf',
              path: 'Machine Learning/Transformers/bert-pretraining.pdf',
            },
          ],
        },
        {
          id: 'f-rl',
          name: 'Reinforcement Learning',
          type: 'folder',
          path: 'Machine Learning/Reinforcement Learning',
          children: [
            {
              id: 'p-ppo',
              name: 'ppo-algorithms.pdf',
              type: 'pdf',
              path: 'Machine Learning/Reinforcement Learning/ppo-algorithms.pdf',
            },
          ],
        },
      ],
    },
    {
      id: 'f-physics',
      name: 'Physics',
      type: 'folder',
      path: 'Physics',
      children: [
        {
          id: 'p-quantum',
          name: 'quantum-entanglement.pdf',
          type: 'pdf',
          path: 'Physics/quantum-entanglement.pdf',
        },
        {
          id: 'f-astro',
          name: 'Astrophysics',
          type: 'folder',
          path: 'Physics/Astrophysics',
          children: [
            {
              id: 'p-darkmatter',
              name: 'dark-matter-constraints.pdf',
              type: 'pdf',
              path: 'Physics/Astrophysics/dark-matter-constraints.pdf',
            },
          ],
        },
      ],
    },
    {
      id: 'f-neuro',
      name: 'Neuroscience',
      type: 'folder',
      path: 'Neuroscience',
      children: [],
    },
  ],
};

// ── Mock Sessions ───────────────────────────────────────────────

export const mockSessions: Record<string, Session[]> = {
  'Machine Learning': [
    {
      id: 's1',
      folderPath: 'Machine Learning',
      title: 'ML landscape overview',
      createdAt: '2026-03-25T10:30:00Z',
      updatedAt: '2026-03-25T14:20:00Z',
      messages: [],
    },
  ],
  'Machine Learning/Transformers': [
    {
      id: 's2',
      folderPath: 'Machine Learning/Transformers',
      title: 'Attention mechanism deep-dive',
      createdAt: '2026-03-24T09:00:00Z',
      updatedAt: '2026-03-24T12:00:00Z',
      messages: [],
    },
  ],
};

// ── Mock Chat Messages (for active session preview) ─────────────

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'c1',
    role: 'user',
    content: 'What exactly is the "Asymmetrical Margin Principle" mentioned on page 3?',
    timestamp: '2026-03-25T10:42:00Z',
  },
  {
    id: 'c2',
    role: 'assistant',
    content: `The **Asymmetrical Margin Principle (AMP)** is a spatial layout strategy that allocates 70% of the screen width to the primary document and 30% to the assistant.

According to the paper, this specific ratio is designed to minimize cognitive load by reducing the physical distance your eyes travel between reading and chatting. It aims to create a "focus state" where the auxiliary tool doesn't distract from the core research.`,
    timestamp: '2026-03-25T10:42:30Z',
    model: 'gpt-4o',
  },
];

// ── Helpers ─────────────────────────────────────────────────────

/** Collect all PDFs reachable from a folder (self + descendants). */
export function collectPdfs(node: TreeNode): TreeNode[] {
  if (node.type === 'pdf') return [node];
  const pdfs: TreeNode[] = [];
  for (const child of node.children ?? []) {
    pdfs.push(...collectPdfs(child));
  }
  return pdfs;
}

/** Find a node by its path in the tree. */
export function findNode(root: TreeNode, targetPath: string): TreeNode | null {
  if (root.path === targetPath) return root;
  for (const child of root.children ?? []) {
    const found = findNode(child, targetPath);
    if (found) return found;
  }
  return null;
}
