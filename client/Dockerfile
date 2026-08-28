# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the build output to replace the default nginx contents
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the SPA routing configuration as a template for envsubst
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
