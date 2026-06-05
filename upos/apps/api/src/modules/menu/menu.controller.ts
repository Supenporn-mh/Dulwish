import { Elysia, t } from 'elysia'
import { authPlugin } from '../../middleware/auth'
import { MenuItem, MenuCategory, Shop, MealPeriod, BuffetPricing } from '../../models'

export const menuController = new Elysia({ prefix: '/menu' })
  .use(authPlugin())

  .get('/', async ({ query }) => {
    const filter: any = { active: true }
    if (query.shop)     filter.shopId = query.shop
    if (query.preorderable === 'true') filter.isPreorderable = true

    const items = await MenuItem.find(filter).lean()
    const categories = await MenuCategory.find().lean()
    const shops = await Shop.find({ active: true }).lean()
    return { items, categories, shops }
  }, {
    query: t.Object({
      shop:        t.Optional(t.String()),
      preorderable: t.Optional(t.String()),
    }),
  })

  .get('/shops', async () => {
    const shops = await Shop.find({ active: true }).lean()
    return { shops }
  })

  .get('/meal-periods', async ({ query }) => {
    const filter: any = query.scope === 'all' ? {} : { active: true }
    const periods = await MealPeriod.find(filter).sort({ startTime: 1 }).lean()
    // return both keys for compatibility with parent (mealPeriods) + older (periods)
    return { periods, mealPeriods: periods }
  }, {
    query: t.Object({ scope: t.Optional(t.String()) }),
  })

  // ── Meal period admin CRUD (admin/supervisor) — drives parent booking rounds ──
  .post('/meal-periods', async ({ body, currentUser, set }) => {
    if (!['admin','supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    try {
      const period = await MealPeriod.create(body)
      return { period, mealPeriod: period }
    } catch (err: unknown) {
      set.status = 400
      return { error: { code: 'PERIOD_001', message: err instanceof Error ? err.message : 'Create failed' } }
    }
  }, {
    body: t.Object({
      code:          t.String(),
      name:          t.String(),
      startTime:     t.String(),
      endTime:       t.String(),
      cutoffMinutes: t.Optional(t.Number()),
      seatCapacity:  t.Optional(t.Number()),
      description:   t.Optional(t.String()),
      active:        t.Optional(t.Boolean()),
    }),
  })

  .patch('/meal-periods/:id', async ({ params, body, currentUser, set }) => {
    if (!['admin','supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    const period = await MealPeriod.findByIdAndUpdate(params.id, body, { new: true })
    if (!period) { set.status = 404; return { error: { code: 'PERIOD_002', message: 'Meal period not found' } } }
    return { period, mealPeriod: period }
  }, {
    body: t.Object({
      code:          t.Optional(t.String()),
      name:          t.Optional(t.String()),
      startTime:     t.Optional(t.String()),
      endTime:       t.Optional(t.String()),
      cutoffMinutes: t.Optional(t.Number()),
      seatCapacity:  t.Optional(t.Number()),
      description:   t.Optional(t.String()),
      active:        t.Optional(t.Boolean()),
    }),
  })

  .delete('/meal-periods/:id', async ({ params, currentUser, set }) => {
    if (!['admin','supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    const period = await MealPeriod.findByIdAndDelete(params.id)
    if (!period) { set.status = 404; return { error: { code: 'PERIOD_002', message: 'Meal period not found' } } }
    return { ok: true }
  })

  .get('/buffet-pricing', async () => {
    const pricing = await BuffetPricing.find().lean()
    return { pricing }
  })

  // Admin routes
  .post('/items', async ({ body, currentUser, set }) => {
    if (!['admin','supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    const item = await MenuItem.create(body)
    return { item }
  }, {
    body: t.Object({
      shopId:        t.String(),
      categoryId:    t.Optional(t.String()),
      sku:           t.String(),
      name:          t.String(),
      description:   t.Optional(t.String()),
      price:         t.Number(),
      dailyQuota:    t.Optional(t.Number()),
      availableFrom: t.Optional(t.String()),
      availableTo:   t.Optional(t.String()),
      isPreorderable: t.Optional(t.Boolean()),
    }),
  })

  .patch('/items/:id', async ({ params, body, currentUser, set }) => {
    if (!['admin','supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    const item = await MenuItem.findByIdAndUpdate(params.id, body, { new: true })
    return { item }
  }, {
    body: t.Object({
      name:          t.Optional(t.String()),
      price:         t.Optional(t.Number()),
      active:        t.Optional(t.Boolean()),
      isPreorderable: t.Optional(t.Boolean()),
      description:   t.Optional(t.String()),
    }),
  })

  .delete('/items/:id', async ({ params, currentUser, set }) => {
    if (!['admin','supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    await MenuItem.findByIdAndUpdate(params.id, { active: false })
    return { success: true }
  })
