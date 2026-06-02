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

  .get('/meal-periods', async () => {
    const periods = await MealPeriod.find({ active: true }).lean()
    return { periods }
  })

  .get('/buffet-pricing', async () => {
    const pricing = await BuffetPricing.find().lean()
    return { pricing }
  })

  // Admin routes
  .post('/items', async ({ body, currentUser, set }) => {
    if (!['admin'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
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
    if (!['admin'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
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
    if (!['admin'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
    }
    await MenuItem.findByIdAndUpdate(params.id, { active: false })
    return { success: true }
  })
