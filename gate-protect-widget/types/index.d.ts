export interface GateProtectConfig {
  siteId: string;
  apiKey: string;
  apiUrl?: string;
  subscribeUrl?: string;
  loginUrl?: string;
  mode?: 'auto' | 'always' | 'never';
}

export interface GateConfig {
  type: 'hard' | 'metered' | 'bot-blocked';
  title?: string;
  message?: string;
  articlesRead?: number;
  freeLimit?: number;
  subscribeUrl?: string;
  loginUrl?: string;
}

export interface GateProtect {
  version: string;
  init(config: GateProtectConfig): void;
  showGatewall(config?: GateConfig): void;
  hideGatewall(): void;
  reload(): void;
}

declare global {
  interface Window {
    GateProtect: GateProtect;
  }
}

export const GateProtect: GateProtect;
export default GateProtect;