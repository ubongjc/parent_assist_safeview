/**
 * Pre-configured session templates for common help scenarios
 * Makes it easy to start sessions with appropriate duration and context
 */

export interface SessionTemplate {
  id: string
  name: string
  description: string
  duration: number // minutes
  icon: string
  category: 'tech' | 'shopping' | 'communication' | 'health' | 'general'
  color: string
  suggestedMessage: string
}

export const SESSION_TEMPLATES: SessionTemplate[] = [
  // Tech Support
  {
    id: 'email-setup',
    name: 'Email Setup',
    description: 'Help setting up or troubleshooting email',
    duration: 30,
    icon: '📧',
    category: 'tech',
    color: 'from-blue-500 to-cyan-500',
    suggestedMessage: "I'll help you set up or fix your email. We'll take it step by step.",
  },
  {
    id: 'app-install',
    name: 'Install App',
    description: 'Guide through installing a new app',
    duration: 20,
    icon: '📱',
    category: 'tech',
    color: 'from-green-500 to-emerald-500',
    suggestedMessage: "Let's install that app together. I'll guide you through each step.",
  },
  {
    id: 'video-call',
    name: 'Video Call Setup',
    description: 'Set up Zoom, FaceTime, or other video calls',
    duration: 25,
    icon: '📹',
    category: 'communication',
    color: 'from-purple-500 to-pink-500',
    suggestedMessage: "I'll help you get your video call working so you can talk to family.",
  },
  {
    id: 'password-reset',
    name: 'Password Reset',
    description: 'Help resetting forgotten passwords',
    duration: 15,
    icon: '🔑',
    category: 'tech',
    color: 'from-yellow-500 to-orange-500',
    suggestedMessage: "Let's reset that password together. I'll walk you through it safely.",
  },

  // Shopping
  {
    id: 'online-shopping',
    name: 'Online Shopping',
    description: 'Help with Amazon, groceries, or other shopping',
    duration: 45,
    icon: '🛒',
    category: 'shopping',
    color: 'from-indigo-500 to-blue-500',
    suggestedMessage: "I'll help you shop online. We'll find what you need and check out safely.",
  },
  {
    id: 'prescription-refill',
    name: 'Prescription Refill',
    description: 'Order prescriptions online',
    duration: 30,
    icon: '💊',
    category: 'health',
    color: 'from-red-500 to-pink-500',
    suggestedMessage: "I'll help you refill your prescription online. Let's do it together.",
  },

  // Communication
  {
    id: 'social-media',
    name: 'Social Media Help',
    description: 'Facebook, photos, messages with family',
    duration: 40,
    icon: '👥',
    category: 'communication',
    color: 'from-blue-600 to-indigo-600',
    suggestedMessage: "I'll help you with Facebook/social media. Let's see those family photos!",
  },
  {
    id: 'text-messages',
    name: 'Text Messaging',
    description: 'Send texts, photos, or use messaging apps',
    duration: 20,
    icon: '💬',
    category: 'communication',
    color: 'from-green-600 to-teal-600',
    suggestedMessage: "Let's get your messages working. I'll show you how to text and share photos.",
  },

  // Health
  {
    id: 'telehealth',
    name: 'Doctor Appointment',
    description: 'Join telehealth video appointments',
    duration: 60,
    icon: '🩺',
    category: 'health',
    color: 'from-teal-500 to-green-500',
    suggestedMessage: "I'll help you join your doctor's video appointment. We'll test it first.",
  },
  {
    id: 'health-app',
    name: 'Health App',
    description: 'Set up health monitoring apps',
    duration: 35,
    icon: '❤️',
    category: 'health',
    color: 'from-rose-500 to-red-500',
    suggestedMessage: "I'll help you set up your health app to track your wellness.",
  },

  // General
  {
    id: 'wifi-issues',
    name: 'WiFi Problems',
    description: 'Fix internet or WiFi connection issues',
    duration: 25,
    icon: '📡',
    category: 'tech',
    color: 'from-cyan-500 to-blue-500',
    suggestedMessage: "Let's get your WiFi working again. I'll help troubleshoot the connection.",
  },
  {
    id: 'photo-backup',
    name: 'Photo Backup',
    description: 'Back up photos to cloud storage',
    duration: 40,
    icon: '📸',
    category: 'general',
    color: 'from-purple-600 to-pink-600',
    suggestedMessage: "I'll help you back up your precious photos safely to the cloud.",
  },
  {
    id: 'calendar-event',
    name: 'Calendar & Reminders',
    description: 'Set up calendar events and reminders',
    duration: 20,
    icon: '📅',
    category: 'general',
    color: 'from-orange-500 to-yellow-500',
    suggestedMessage: "Let's add that appointment to your calendar and set a reminder.",
  },
  {
    id: 'smart-device',
    name: 'Smart Device Setup',
    description: 'Set up smart home devices',
    duration: 45,
    icon: '🏠',
    category: 'tech',
    color: 'from-green-500 to-lime-500',
    suggestedMessage: "I'll help you set up your smart home device step by step.",
  },
  {
    id: 'banking-online',
    name: 'Online Banking',
    description: 'Check balance, pay bills online',
    duration: 35,
    icon: '🏦',
    category: 'general',
    color: 'from-emerald-500 to-green-600',
    suggestedMessage: "I'll help you with online banking. We'll do it securely together.",
  },
  {
    id: 'general-help',
    name: 'General Help',
    description: 'General tech support or guidance',
    duration: 60,
    icon: '🤝',
    category: 'general',
    color: 'from-slate-500 to-gray-600',
    suggestedMessage: "I'm here to help with whatever you need. Let's figure it out together.",
  },
]

/**
 * Get template by ID
 */
export function getTemplate(id: string): SessionTemplate | undefined {
  return SESSION_TEMPLATES.find((t) => t.id === id)
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: SessionTemplate['category']
): SessionTemplate[] {
  return SESSION_TEMPLATES.filter((t) => t.category === category)
}

/**
 * Get all categories
 */
export function getCategories(): SessionTemplate['category'][] {
  return ['tech', 'communication', 'shopping', 'health', 'general']
}

/**
 * Get category display name
 */
export function getCategoryName(category: SessionTemplate['category']): string {
  const names: Record<SessionTemplate['category'], string> = {
    tech: 'Tech Support',
    communication: 'Communication',
    shopping: 'Shopping & Orders',
    health: 'Health & Medical',
    general: 'General Help',
  }
  return names[category]
}
