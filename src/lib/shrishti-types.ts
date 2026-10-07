export type Certainty = "known" | "probable" | "possible" | "uncertain";

export interface KNode {
  label: string;
  detail: string;
  certainty: Certainty;
}
export interface Branch {
  name: string;
  nodes: KNode[];
}
export interface Problem {
  title: string;
  what: string;
  why: string;
  severity: number; // 1-5
  urgency: "immediate" | "near-term" | "long-term";
  branches: string[];
}
export interface ReasonLink {
  from: string;
  relation: string;
  to: string;
  why: string;
  evidence: string;
  assumptions: string;
  uncertainty: string;
}
export interface ReasonChain {
  title: string;
  links: ReasonLink[];
}
export interface Research {
  seed: string;
  summary: string;
  branches: Branch[];
  problems: Problem[];
  reasoning: ReasonChain[];
  limitations: string;
}
export interface QA {
  question: string;
  answer: string;
  branches: string[];
  grounded: boolean;
}
