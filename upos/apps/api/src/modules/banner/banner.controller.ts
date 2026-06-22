import { Elysia, t } from 'elysia'
import { authPlugin } from '../../middleware/auth'
import { Banner } from '../../models'

export const bannerController = new Elysia({ prefix: '/banners' })
  .use(authPlugin(['admin', 'supervisor']))

  .get('/', async () => {
    const banners = await Banner.find().sort({ sortOrder: 1, createdAt: 1 }).lean()
    return { banners }
  })

  .post('/', async ({ body }) => {
    const count = await Banner.countDocuments()
    const banner = await Banner.create({ ...body, sortOrder: count })
    return { banner }
  }, {
    body: t.Object({
      name:        t.String(),
      imageBase64: t.Optional(t.String()),
      isVisible:   t.Optional(t.Boolean()),
    }),
  })

  .patch('/:id', async ({ params, body, set }) => {
    const banner = await Banner.findByIdAndUpdate(params.id, { $set: body }, { new: true }).lean()
    if (!banner) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Banner not found' } }
    }
    return { banner }
  }, {
    body: t.Object({
      name:        t.Optional(t.String()),
      imageBase64: t.Optional(t.String()),
      isVisible:   t.Optional(t.Boolean()),
    }),
  })

  .delete('/:id', async ({ params, set }) => {
    const deleted = await Banner.findByIdAndDelete(params.id)
    if (!deleted) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Banner not found' } }
    }
    return { ok: true }
  })
