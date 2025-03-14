export type BaselineStatus = 'limited' | 'newly' | 'widely'

export const BaselineStatuses = {
  LIMITED: 'limited',
  NEWLY: 'newly',
  WIDELY: 'widely',
} as const satisfies Record<string, BaselineStatus>

export const API_BASE_URL = 'https://api.webstatus.dev/v1/features'
