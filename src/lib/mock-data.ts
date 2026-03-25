import { Paper, Session, Project, ChatMessage } from '@/types';

export const mockPapers: Paper[] = [
  {
    id: '1',
    title: 'Attention is All You Need: Scaling Transformative AI',
    authors: 'Vaswani et al., 2017',
    fileName: 'attention-is-all-you-need.pdf',
    uploadedAt: '2024-05-12',
    status: 'peer-reviewed',
    tags: ['NLP', 'Transformers'],
  },
  {
    id: '2',
    title: 'CRISPR/Cas9 Mediated Gene Editing in Higher Fungi',
    authors: 'Dr. Eleanor Vance',
    fileName: 'crispr-fungi.pdf',
    uploadedAt: '2024-06-05',
    status: 'pre-print',
    tags: ['Biology', 'Genetics'],
  },
  {
    id: '3',
    title: 'Dark Matter Constraints from Galaxy Clustering',
    authors: 'Smith & Rodriguez',
    fileName: 'dark-matter-constraints.pdf',
    uploadedAt: '2024-08-18',
    status: 'peer-reviewed',
    tags: ['Physics', 'Astrophysics'],
  },
];

export const mockSessions: Session[] = [
  {
    id: 's1',
    paperId: '1',
    paperTitle: 'Synthesizing Neural Radiance Fields for Urban Planning',
    fileName: 'nerf-urban-net-2013.pdf',
    summary: 'Discussed the computational overhead of instant NGP vs. traditional NeRF models. Explored the implications for real-time architectural visualization and city-scale rendering latency...',
    tags: ['ARCHITECTURE', 'ML SYSTEMS'],
    createdAt: '2026-03-25T10:30:00Z',
    updatedAt: '2026-03-25T14:20:00Z',
    messages: [],
  },
  {
    id: 's2',
    paperId: '2',
    paperTitle: 'Post-Structural Analysis of Early Renaissance Textualities',
    fileName: 'archive-renaissance-v4.pdf',
    summary: 'Investigated into the transition from manuscript to print culture. AI provided a summary of chapter 4 regarding the socio-economic status of scribes in Florence...',
    tags: ['HISTORY', 'LITERATURE'],
    createdAt: '2026-03-25T08:00:00Z',
    updatedAt: '2026-03-25T11:45:00Z',
    messages: [],
  },
  {
    id: 's3',
    paperId: '3',
    paperTitle: 'Ethics of Large Language Models',
    fileName: 'llm-ethics.pdf',
    summary: 'Focused on bias mitigation strategies outlined in the 2025 Meta whitepaper. Discussed RLHF and Constitutional AI approaches...',
    tags: ['AI', 'ETHICS'],
    createdAt: '2026-03-24T09:00:00Z',
    updatedAt: '2026-03-24T12:00:00Z',
    messages: [],
  },
  {
    id: 's4',
    paperId: '1',
    paperTitle: 'Global Supply Chain Fragility',
    fileName: 'supply-chain.pdf',
    summary: 'Analysis of Just-in-Time manufacturing risks during maritime disruptions. Summary of economic projections from World Bank report...',
    tags: ['ECONOMICS'],
    createdAt: '2026-03-24T15:00:00Z',
    updatedAt: '2026-03-24T17:30:00Z',
    messages: [],
  },
];

export const mockRecentSessions = [
  {
    id: 'rs1',
    title: 'Neural Architectures for LLMs',
    summary: 'Continuing analysis on transformer efficiency and attention mechanisms...',
    status: 'active' as const,
    timeAgo: '14 mins ago',
  },
  {
    id: 'rs2',
    title: 'Quantum Computing Ethics',
    summary: 'Troubling moral paper perspective on cryptographic risks...',
    status: 'archive' as const,
    timeAgo: 'Yesterday',
  },
  {
    id: 'rs3',
    title: 'Sustainable Architecture 2024',
    summary: 'Comparing thermal efficiency of modular timber structures...',
    status: 'archive' as const,
    timeAgo: 'Oct 15',
  },
];

export const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'Quantum Gravity',
    sessionCount: 12,
    documentCount: 4,
  },
  {
    id: 'p2',
    name: 'Medieval Art',
    sessionCount: 8,
    documentCount: 3,
  },
];

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
    model: 'claude',
  },
];
