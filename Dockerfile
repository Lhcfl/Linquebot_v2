FROM node:18
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY ["package.json", "package-lock.json*", "./"]


RUN npm install --production
# If you are building your code for production
# RUN npm ci --omit=dev

# Bundle app source
COPY . .


CMD [ "npm", "run build" ]