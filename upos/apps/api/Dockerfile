FROM oven/bun:1 AS base
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install deps from workspace root
RUN npm install -g pnpm && pnpm install --frozen-lockfile

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
