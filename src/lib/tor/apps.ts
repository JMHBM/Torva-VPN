import type { AppEntry } from "./types";

export const APPS: AppEntry[] = [
  { id: "edge", name: "Microsoft Edge", publisher: "Microsoft", category: "Browser" },
  { id: "chrome", name: "Google Chrome", publisher: "Google", category: "Browser" },
  { id: "firefox", name: "Firefox", publisher: "Mozilla", category: "Browser" },
  { id: "outlook", name: "Outlook", publisher: "Microsoft", category: "Mail" },
  { id: "teams", name: "Microsoft Teams", publisher: "Microsoft", category: "Chat" },
  { id: "discord", name: "Discord", publisher: "Discord", category: "Chat" },
  { id: "slack", name: "Slack", publisher: "Salesforce", category: "Chat" },
  { id: "spotify", name: "Spotify", publisher: "Spotify", category: "Media" },
  { id: "steam", name: "Steam", publisher: "Valve", category: "Games" },
  { id: "epic", name: "Epic Games Launcher", publisher: "Epic", category: "Games" },
  { id: "zoom", name: "Zoom", publisher: "Zoom", category: "Chat" },
  { id: "telegram", name: "Telegram", publisher: "Telegram FZ", category: "Chat" },
  { id: "signal", name: "Signal", publisher: "Signal", category: "Chat" },
  { id: "onedrive", name: "OneDrive", publisher: "Microsoft", category: "Files" },
  { id: "dropbox", name: "Dropbox", publisher: "Dropbox", category: "Files" },
  { id: "notion", name: "Notion", publisher: "Notion Labs", category: "Work" },
  { id: "vscode", name: "Visual Studio Code", publisher: "Microsoft", category: "Work" },
  { id: "obsidian", name: "Obsidian", publisher: "Dynalist", category: "Work" },
];

export const DEFAULT_BLOCKED = ["edge", "chrome", "firefox", "outlook", "discord"];
