# Stage 1: Build the Remix app
FROM node:18-alpine as builder

WORKDIR /app

# Copy package.json and package-lock.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code and build the app
COPY . .
RUN npm run build

# Stage 2: Run the built app in production
FROM node:18-alpine

WORKDIR /app

# Copy the built app from the builder stage
COPY --from=builder /app ./

# Expose the port that your Remix app uses (commonly 3000)
EXPOSE 3000

# Start the Remix production server
CMD ["npm", "start"]
