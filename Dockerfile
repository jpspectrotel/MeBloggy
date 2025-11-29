# Use official Node.js image for build
FROM node:20 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build -- --output-path=dist

# Use official Nginx image for serving static files
FROM nginx:alpine

COPY --from=build /app/dist/MeBloggy /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
