import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { connectDB } from './db/mongoose'
import { authController }     from './modules/auth/auth.controller'
import { usersController }    from './modules/users/users.controller'
import { walletController }   from './modules/wallet/wallet.controller'
import { posController }      from './modules/pos/pos.controller'
import { ordersController }   from './modules/orders/orders.controller'
import { menuController }     from './modules/menu/menu.controller'
import { adminController }    from './modules/admin/admin.controller'
import { feedbackController } from './modules/feedback/feedback.controller'

await connectDB()

const app = new Elysia()
  .use(cors({
    origin: (request) => {
      const origin = request.headers.get('origin') ?? ''
      const allowed = [
        /^http:\/\/localhost:\d+$/,           // localhost dev
        /^https:\/\/.*\.vercel\.app$/,         // Vercel deployments
        /^https:\/\/dulwish\.vercel\.app$/,    // production
      ]
      return allowed.some(r => r.test(origin))
    },
    credentials: true,
  }))
  .use(swagger({
    path: '/swagger',
    documentation: {
      info: { title: 'UPOS API', version: '1.0.0', description: 'Dulwich School Canteen System' },
    },
  }))
  .get('/health', () => ({ status: 'ok', service: 'UPOS API', time: new Date().toISOString() }))
  .use(authController)
  .use(usersController)
  .use(walletController)
  .use(posController)
  .use(ordersController)
  .use(menuController)
  .use(adminController)
  .use(feedbackController)
  .onError(({ error, set }) => {
    console.error('[API Error]', error)
    set.status = 500
    return { error: { code: 'INTERNAL_ERROR', message: error.message } }
  })
  .listen(process.env.PORT ?? 4000)

console.log(`🚀 UPOS API running at http://localhost:${app.server?.port}`)
console.log(`📄 Swagger: http://localhost:${app.server?.port}/swagger`)
