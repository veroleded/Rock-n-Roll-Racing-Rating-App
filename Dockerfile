FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install tsx globally
RUN npm install -g tsx && \
    npm cache clean --force

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci && \
    npm cache clean --force

# Copy source code and config files
COPY . .

# Create necessary directories
RUN mkdir -p public scripts

EXPOSE 3000

CMD ["npm", "run", "start"]
