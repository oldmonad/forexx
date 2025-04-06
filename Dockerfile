# Stage 1: Build
FROM node:18 AS builder
WORKDIR /usr/src/app

# Install dependencies (adjust if using yarn)
COPY package*.json ./
RUN npm install

# Copy all files and build the project
COPY . .
RUN npm run build

# Stage 2: Production image
FROM node:18-alpine
WORKDIR /usr/src/app

# Copy the built files and production dependencies
COPY --from=builder /usr/src/app/dist ./dist
COPY package*.json ./
RUN npm install --production

# Accept a build argument to choose which service to run (default: authentication)
ARG SERVICE=authentication
RUN echo "Building service:::::::::::::::::::::: ${SERVICE}"  # Add this line for debugging

# Run the selected service using its main file
RUN echo "Dist contents:" && ls -R dist
CMD ["sh", "-c", "node dist/apps/${SERVICE}/main.js"]
