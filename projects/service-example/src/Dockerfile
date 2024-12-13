# Use the official Node.js image
FROM node:22

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the source code into the container
COPY ../../../.. .

# Expose port
EXPOSE 8080

# Set environment variable
ENV NODE_ENV=production

# Define the command to run your app
CMD ["node", "--no-warnings", "--experimental-strip-types", "express.ts"]
