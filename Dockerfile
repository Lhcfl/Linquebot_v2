FROM node:18
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY ["package.json", "package-lock.json*", "./"]

RUN apt update
RUN apt install graphviz -y
RUN apt install -y --force-yes --no-install-recommends fonts-noto fonts-noto-cjk fonts-noto-cjk-extra fonts-noto-color-emoji ttf-ancient-fonts

RUN npm ci --omit=dev
RUN npm install --production

# Bundle app source
COPY dist/ .
COPY config.* ./



CMD [ "node", "index.js" ]
