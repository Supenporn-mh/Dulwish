import { Elysia, t } from 'elysia'
import { Feedback } from '../../models'

export const feedbackController = new Elysia({ prefix: '/feedback' })
  .post('/', async ({ body, headers }) => {
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

  .get('/', async ({ query }) => {
    const filter: any = {}
    if (query.shop) filter.shopId = query.shop
    if (query.channel) filter.channel = query.channel
    const feedbacks = await Feedback.find(filter).sort({ createdAt: -1 }).limit(100).lean()
    return { feedbacks }
  }, {
    query: t.Object({
      shop:    t.Optional(t.String()),
      channel: t.Optional(t.String()),
    }),
  })
