import { supabase } from './supabase'

export type AnalyticsEvent =
  | 'page_view'
  | 'product_view'
  | 'whatsapp_click'
  | 'instagram_click'

export type DailyAnalytics = {
  date: string
  views: number
  visitors: number
}

export type ProductAnalytics = {
  productId: string
  name: string
  image: string
  views: number
  whatsappClicks: number
  instagramClicks: number
}

export type DashboardAnalytics = {
  periodDays: number
  pageViews: number
  uniqueVisitors: number
  productViews: number
  whatsappClicks: number
  instagramClicks: number
  todayViews: number
  daily: DailyAnalytics[]
  products: ProductAnalytics[]
}

const VISITOR_KEY = 'sorella_visitor_id'
const DEDUPE_PREFIX = 'sorella_event_'

function getVisitorId(): string {
  let visitorId = localStorage.getItem(VISITOR_KEY)
  if (!visitorId) {
    visitorId = crypto.randomUUID()
    localStorage.setItem(VISITOR_KEY, visitorId)
  }
  return visitorId
}

function shouldSend(eventType: AnalyticsEvent, productId?: string): boolean {
  // Evita duplicados inmediatos de React StrictMode y dobles clics accidentales.
  const path = window.location.pathname
  const key = `${DEDUPE_PREFIX}${eventType}:${productId ?? 'none'}:${path}`
  const now = Date.now()
  const last = Number(sessionStorage.getItem(key) || 0)
  if (now - last < 1500) return false
  sessionStorage.setItem(key, String(now))
  return true
}

export async function trackEvent(
  eventType: AnalyticsEvent,
  productId?: string,
): Promise<void> {
  if (!supabase || !shouldSend(eventType, productId)) return

  try {
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        visitor_id: getVisitorId(),
        event_type: eventType,
        product_id: productId ?? null,
        path: window.location.pathname.slice(0, 500),
      })

    if (error) console.error('No se pudo registrar analytics:', error)
  } catch (error) {
    // Analytics nunca debe romper el catálogo.
    console.error('Error de analytics:', error)
  }
}

export async function getDashboardAnalytics(days = 30): Promise<DashboardAnalytics> {
  if (!supabase) throw new Error('Supabase no está configurado.')

  const safeDays = Math.min(90, Math.max(7, Math.trunc(days)))
  const { data, error } = await supabase.rpc('get_admin_analytics', {
    p_days: safeDays,
  })

  if (error) throw error

  const raw = (data ?? {}) as Record<string, any>
  return {
    periodDays: Number(raw.period_days ?? safeDays),
    pageViews: Number(raw.page_views ?? 0),
    uniqueVisitors: Number(raw.unique_visitors ?? 0),
    productViews: Number(raw.product_views ?? 0),
    whatsappClicks: Number(raw.whatsapp_clicks ?? 0),
    instagramClicks: Number(raw.instagram_clicks ?? 0),
    todayViews: Number(raw.today_views ?? 0),
    daily: Array.isArray(raw.daily)
      ? raw.daily.map((item: any) => ({
          date: String(item.date),
          views: Number(item.views ?? 0),
          visitors: Number(item.visitors ?? 0),
        }))
      : [],
    products: Array.isArray(raw.products)
      ? raw.products.map((item: any) => ({
          productId: String(item.product_id),
          name: String(item.name ?? 'Producto'),
          image: String(item.image_url ?? '/products/noir.svg'),
          views: Number(item.views ?? 0),
          whatsappClicks: Number(item.whatsapp_clicks ?? 0),
          instagramClicks: Number(item.instagram_clicks ?? 0),
        }))
      : [],
  }
}
