# Always-on worker — Socket Mode needs no inbound ports.
FROM node:22-slim
WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

CMD ["npm", "start"]
