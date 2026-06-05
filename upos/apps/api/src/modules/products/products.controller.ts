import { Elysia, t } from 'elysia'
import { authPlugin } from '../../middleware/auth'
import { Product, ProductCategory, Kitchen, Unit } from '../../models'

const WRITE_ROLES = ['admin', 'supervisor']

export const productsController = new Elysia({ prefix: '/products' })
  .use(authPlugin())

  // ── Products ────────────────────────────────────────────────────────────────

  .get('/', async () => {
    const products = await Product.find({ active: true }).lean()
    return { products }
  })

  .post('/', async ({ body, currentUser, set }) => {
    if (!WRITE_ROLES.includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    try {
      const product = await Product.create(body)
      return { product }
    } catch (err: unknown) {
      set.status = 400
      const message = err instanceof Error ? err.message : 'Create failed'
      return { error: { code: 'PRODUCT_001', message } }
    }
  }, {
    body: t.Object({
      code:         t.String(),
      name:         t.String(),
      price:        t.Optional(t.Number()),
      cost:         t.Optional(t.Number()),
      categoryCode: t.Optional(t.String()),
      unit:         t.Optional(t.String()),
      barcode:      t.Optional(t.String()),
      kitchenCode:  t.Optional(t.String()),
      branchCode:   t.Optional(t.String()),
      imageUrl:     t.Optional(t.String()),
      icon:         t.Optional(t.String()),
      attributes:   t.Optional(t.Array(t.Object({
        name:    t.Optional(t.String()),
        type:    t.Optional(t.String()),
        options: t.Optional(t.Array(t.Object({
          name:  t.Optional(t.String()),
          price: t.Optional(t.Number()),
        }))),
      }))),
    }),
  })

  // POST /products/import — must be registered before PATCH /products/:code
  .post('/import', async ({ body, currentUser, set }) => {
    if (!WRITE_ROLES.includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    const rows = body.rows
    let inserted = 0
    let updated = 0
    const errors: string[] = []

    for (const row of rows) {
      try {
        const { productCode, productName, price, cost, categoryCode, unit, branchCode, barcode, attributeType, attributeName, attributeValue, attributePrice } = row

        if (!productCode || !productName) {
          errors.push(`Row skipped: missing productCode or productName (code="${productCode ?? ''}")`)
          continue
        }

        const existing = await Product.findOne({ code: productCode })

        const updateData: Record<string, unknown> = { name: productName }
        if (price !== undefined)        updateData.price = price
        if (cost !== undefined)         updateData.cost = cost
        if (categoryCode !== undefined) updateData.categoryCode = categoryCode
        if (unit !== undefined)         updateData.unit = unit
        if (branchCode !== undefined)   updateData.branchCode = branchCode
        if (barcode !== undefined)      updateData.barcode = barcode

        if (attributeName && attributeType) {
          const attr = {
            name: attributeName,
            type: attributeType,
            options: attributeValue
              ? [{ name: attributeValue, price: attributePrice ?? 0 }]
              : [],
          }
          if (existing) {
            await Product.findOneAndUpdate(
              { code: productCode },
              { ...updateData, $push: { attributes: attr } },
            )
            updated++
          } else {
            await Product.create({ code: productCode, ...updateData, attributes: [attr] })
            inserted++
          }
        } else {
          if (existing) {
            await Product.findOneAndUpdate({ code: productCode }, updateData)
            updated++
          } else {
            await Product.create({ code: productCode, ...updateData })
            inserted++
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Row error (code="${row.productCode ?? ''}"): ${message}`)
      }
    }

    return { inserted, updated, errors }
  }, {
    body: t.Object({
      rows: t.Array(t.Object({
        productCode:    t.String(),
        productName:    t.String(),
        price:          t.Optional(t.Number()),
        cost:           t.Optional(t.Number()),
        categoryCode:   t.Optional(t.String()),
        unit:           t.Optional(t.String()),
        branchCode:     t.Optional(t.String()),
        barcode:        t.Optional(t.String()),
        remark:         t.Optional(t.String()),
        attributeType:  t.Optional(t.String()),
        attributeName:  t.Optional(t.String()),
        attributeValue: t.Optional(t.String()),
        attributePrice: t.Optional(t.Number()),
      })),
    }),
  })

  .patch('/:code', async ({ params, body, currentUser, set }) => {
    if (!WRITE_ROLES.includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    try {
      const product = await Product.findOneAndUpdate({ code: params.code }, body, { new: true })
      if (!product) {
        set.status = 404
        return { error: { code: 'PRODUCT_002', message: 'Product not found' } }
      }
      return { product }
    } catch (err: unknown) {
      set.status = 400
      const message = err instanceof Error ? err.message : 'Update failed'
      return { error: { code: 'PRODUCT_003', message } }
    }
  }, {
    body: t.Object({
      name:         t.Optional(t.String()),
      price:        t.Optional(t.Number()),
      cost:         t.Optional(t.Number()),
      categoryCode: t.Optional(t.String()),
      unit:         t.Optional(t.String()),
      barcode:      t.Optional(t.String()),
      kitchenCode:  t.Optional(t.String()),
      branchCode:   t.Optional(t.String()),
      imageUrl:     t.Optional(t.String()),
      icon:         t.Optional(t.String()),
      active:       t.Optional(t.Boolean()),
      attributes:   t.Optional(t.Array(t.Object({
        name:    t.Optional(t.String()),
        type:    t.Optional(t.String()),
        options: t.Optional(t.Array(t.Object({
          name:  t.Optional(t.String()),
          price: t.Optional(t.Number()),
        }))),
      }))),
    }),
  })

  .delete('/:code', async ({ params, currentUser, set }) => {
    if (!WRITE_ROLES.includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    try {
      const product = await Product.findOneAndUpdate({ code: params.code }, { active: false })
      if (!product) {
        set.status = 404
        return { error: { code: 'PRODUCT_002', message: 'Product not found' } }
      }
      return { ok: true }
    } catch (err: unknown) {
      set.status = 400
      const message = err instanceof Error ? err.message : 'Delete failed'
      return { error: { code: 'PRODUCT_004', message } }
    }
  })

  // ── Product Categories (/products/categories) ────────────────────────────────

  .get('/categories', async () => {
    const categories = await ProductCategory.find().lean()
    return { categories }
  })

  .post('/categories', async ({ body, currentUser, set }) => {
    if (!WRITE_ROLES.includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    try {
      const category = await ProductCategory.create(body)
      return { category }
    } catch (err: unknown) {
      set.status = 400
      const message = err instanceof Error ? err.message : 'Create failed'
      return { error: { code: 'CAT_001', message } }
    }
  }, {
    body: t.Object({
      code:     t.String(),
      name:     t.String(),
      imageUrl: t.Optional(t.String()),
    }),
  })

  .patch('/categories/:code', async ({ params, body, currentUser, set }) => {
    if (!WRITE_ROLES.includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    try {
      const category = await ProductCategory.findOneAndUpdate({ code: params.code }, body, { new: true })
      if (!category) {
        set.status = 404
        return { error: { code: 'CAT_002', message: 'Category not found' } }
      }
      return { category }
    } catch (err: unknown) {
      set.status = 400
      const message = err instanceof Error ? err.message : 'Update failed'
      return { error: { code: 'CAT_003', message } }
    }
  }, {
    body: t.Object({
      name:     t.Optional(t.String()),
      imageUrl: t.Optional(t.String()),
    }),
  })

  .delete('/categories/:code', async ({ params, currentUser, set }) => {
    if (!WRITE_ROLES.includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    try {
      const category = await ProductCategory.findOneAndDelete({ code: params.code })
      if (!category) {
        set.status = 404
        return { error: { code: 'CAT_002', message: 'Category not found' } }
      }
      return { ok: true }
    } catch (err: unknown) {
      set.status = 400
      const message = err instanceof Error ? err.message : 'Delete failed'
      return { error: { code: 'CAT_004', message } }
    }
  })

  // ── Kitchens (/products/kitchens) ────────────────────────────────────────────

  .get('/kitchens', async () => {
    const kitchens = await Kitchen.find().lean()
    return { kitchens }
  })

  .post('/kitchens', async ({ body, currentUser, set }) => {
    if (!WRITE_ROLES.includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    try {
      const kitchen = await Kitchen.create(body)
      return { kitchen }
    } catch (err: unknown) {
      set.status = 400
      const message = err instanceof Error ? err.message : 'Create failed'
      return { error: { code: 'KITCHEN_001', message } }
    }
  }, {
    body: t.Object({
      code: t.String(),
      name: t.String(),
    }),
  })

  .patch('/kitchens/:code', async ({ params, body, currentUser, set }) => {
    if (!WRITE_ROLES.includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    try {
      const kitchen = await Kitchen.findOneAndUpdate({ code: params.code }, body, { new: true })
      if (!kitchen) {
        set.status = 404
        return { error: { code: 'KITCHEN_002', message: 'Kitchen not found' } }
      }
      return { kitchen }
    } catch (err: unknown) {
      set.status = 400
      const message = err instanceof Error ? err.message : 'Update failed'
      return { error: { code: 'KITCHEN_003', message } }
    }
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
    }),
  })

  .delete('/kitchens/:code', async ({ params, currentUser, set }) => {
    if (!WRITE_ROLES.includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    try {
      const kitchen = await Kitchen.findOneAndDelete({ code: params.code })
      if (!kitchen) {
        set.status = 404
        return { error: { code: 'KITCHEN_002', message: 'Kitchen not found' } }
      }
      return { ok: true }
    } catch (err: unknown) {
      set.status = 400
      const message = err instanceof Error ? err.message : 'Delete failed'
      return { error: { code: 'KITCHEN_004', message } }
    }
  })

  // ── Units (/products/units) ──────────────────────────────────────────────────

  .get('/units', async () => {
    const units = await Unit.find().lean()
    return { units }
  })

  .post('/units', async ({ body, currentUser, set }) => {
    if (!WRITE_ROLES.includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    try {
      const unit = await Unit.create(body)
      return { unit }
    } catch (err: unknown) {
      set.status = 400
      const message = err instanceof Error ? err.message : 'Create failed'
      return { error: { code: 'UNIT_001', message } }
    }
  }, {
    body: t.Object({
      name: t.String(),
    }),
  })

  .patch('/units/:id', async ({ params, body, currentUser, set }) => {
    if (!WRITE_ROLES.includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    try {
      const unit = await Unit.findByIdAndUpdate(params.id, body, { new: true })
      if (!unit) {
        set.status = 404
        return { error: { code: 'UNIT_002', message: 'Unit not found' } }
      }
      return { unit }
    } catch (err: unknown) {
      set.status = 400
      const message = err instanceof Error ? err.message : 'Update failed'
      return { error: { code: 'UNIT_003', message } }
    }
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
    }),
  })

  .delete('/units/:id', async ({ params, currentUser, set }) => {
    if (!WRITE_ROLES.includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin or supervisor only' } }
    }
    try {
      const unit = await Unit.findByIdAndDelete(params.id)
      if (!unit) {
        set.status = 404
        return { error: { code: 'UNIT_002', message: 'Unit not found' } }
      }
      return { ok: true }
    } catch (err: unknown) {
      set.status = 400
      const message = err instanceof Error ? err.message : 'Delete failed'
      return { error: { code: 'UNIT_004', message } }
    }
  })
