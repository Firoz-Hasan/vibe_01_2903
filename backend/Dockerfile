FROM node:18-slim

# Create app dir
WORKDIR /usr/src/app

# copy backend package files first for better caching
COPY backend/package*.json ./

# install only production deps (dev dependencies like nodemon not installed)
RUN npm install --production

# copy whole repo into image (we'll run backend/server.js)
COPY . .

# expose port
EXPOSE 3000

# startup
CMD ["node", "backend/server.js"]
