export interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  status: "idle" | "connected" | "active" | "error";
  apiType: "OAuth 2.0" | "Bearer Token" | "Simulated Scraper";
  credentialsRequired: string[];
  docUrl: string;
  description: string;
}

export interface GroundedPost {
  platform: string;
  author: string;
  content: string;
  likes: number;
  shares: number;
  timestamp: string;
  link?: string;
}

export interface Citations {
  title: string;
  url: string;
}

export interface PlatformFormat {
  message: string;
  apiPayload: string;
  title?: string;
}

export interface GeneratedOmnipost {
  twitter?: PlatformFormat;
  linkedin?: PlatformFormat;
  reddit?: PlatformFormat;
  github?: PlatformFormat;
}

export interface ApiLogMessage {
  id: string;
  timestamp: string;
  platform: string;
  type: "info" | "success" | "warning" | "error" | "api_payload";
  message: string;
  payload?: any;
}
