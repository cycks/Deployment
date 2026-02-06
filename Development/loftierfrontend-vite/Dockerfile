# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM node:20-alpine
WORKDIR /app
# We install ONLY production dependencies to get 'vite' binary
COPY package*.json ./
RUN npm install --only=production
COPY --from=build /app/dist ./dist

EXPOSE 4173
# Use npx to ensure it finds the vite binary in node_modules
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "4173"]