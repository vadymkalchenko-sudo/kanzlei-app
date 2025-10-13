FROM node:18
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY server.js .
COPY ./repositories/ ./repositories/
EXPOSE 3001
CMD ["npm", "start"]