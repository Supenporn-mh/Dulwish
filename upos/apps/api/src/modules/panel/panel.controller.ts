import { Elysia, t } from 'elysia'
import { authPlugin } from '../../middleware/auth'
import { SaleScreenPanel } from '../../models'

const panelItemBody = t.Object({
  productId:   t.String(),
  productName: t.String(),
  textColor:   t.Optional(t.String()),
  bgColor:     t.Optional(t.String()),
})

export const panelController = new Elysia({ prefix: '/panels' })
  .use(authPlugin(['admin', 'supervisor']))

  .get('/', async ({ query }) => {
    const filter: Record<string, string> = {}
    if (query.branch) filter.branch = query.branch
    const panels = await SaleScreenPanel.find(filter).sort({ createdAt: -1 }).lean()
    return { panels }
  }, {
    query: t.Object({ branch: t.Optional(t.String()) }),
  })

  .post('/', async ({ body }) => {
    const panel = await SaleScreenPanel.create(body)
    return { panel }
  }, {
    body: t.Object({
      name:        t.String(),
      branch:      t.String(),
      isVisible:   t.Optional(t.Boolean()),
      imageBase64: t.Optional(t.String()),
      items:       t.Optional(t.Array(panelItemBody)),
    }),
  })

  .patch('/:id', async ({ params, body, set }) => {
    const panel = await SaleScreenPanel.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true },
    ).lean()
    if (!panel) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Panel not found' } }
    }
    return { panel }
  }, {
    body: t.Object({
      name:        t.Optional(t.String()),
      branch:      t.Optional(t.String()),
      isVisible:   t.Optional(t.Boolean()),
      imageBase64: t.Optional(t.String()),
      items:       t.Optional(t.Array(panelItemBody)),
    }),
  })

  .delete('/:id', async ({ params, set }) => {
    const deleted = await SaleScreenPanel.findByIdAndDelete(params.id)
    if (!deleted) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Panel not found' } }
    }
    return { ok: true }
  })
