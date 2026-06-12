import { Elysia, t } from 'elysia'
import { authPlugin } from '../../middleware/auth'
import { Feedback } from '../../models'

export const feedbackController = new Elysia({ prefix: '/feedback' })

  // ── Submit (no auth — kiosk/mobile app calls this) ────────────────────────
  .post('/', async ({ body }) => {
    const feedback = await Feedback.create({
      userId:   body.user_id,
      channel:  body.channel,
      rating:   body.rating,
      category: body.category,
      comment:  body.comment,
      shopId:   body.shop_id,
      orderId:  body.order_id,
    })
    return { feedback }
  }, {
    body: t.Object({
      user_id:  t.Optional(t.String()),
      channel:  t.Union([t.Literal('kiosk'), t.Literal('mobile')]),
      rating:   t.Optional(t.Number({ minimum: 1, maximum: 5 })),
      category: t.Optional(t.String()),
      comment:  t.Optional(t.String()),
      shop_id:  t.Optional(t.String()),
      order_id: t.Optional(t.String()),
    }),
  })

  // ── Admin list (auth required) ────────────────────────────────────────────
  .use(authPlugin(['admin', 'supervisor']))

  .get('/', async ({ query }) => {
    const page  = Math.max(1, parseInt(query.page  ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')))
    const skip  = (page - 1) * limit

    const filter: Record<string, unknown> = {}
    if (query.channel) filter.channel = query.channel
    if (query.rating)  filter.rating  = parseInt(query.rating)
    if (query.date) {
      const start = new Date(query.date + 'T00:00:00.000Z')
      const end   = new Date(query.date + 'T23:59:59.999Z')
      filter.createdAt = { $gte: start, $lte: end }
    }

    const [feedbacks, total] = await Promise.all([
      Feedback.find(filter)
        .populate('userId', 'firstName lastName uid role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Feedback.countDocuments(filter),
    ])

    return {
      feedbacks: feedbacks.map(f => {
        const u = f.userId as any
        return {
          id:        String(f._id),
          userName:  u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : null,
          userUid:   u?.uid ?? null,
          userRole:  u?.role ?? null,
          channel:   f.channel,
          rating:    f.rating ?? null,
          category:  f.category ?? null,
          comment:   f.comment ?? null,
          createdAt: f.createdAt,
        }
      }),
      total,
      page,
      limit,
    }
  }, {
    query: t.Object({
      channel: t.Optional(t.String()),
      rating:  t.Optional(t.String()),
      date:    t.Optional(t.String()),
      page:    t.Optional(t.String()),
      limit:   t.Optional(t.String()),
    }),
  })
